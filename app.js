const recordBtn = document.getElementById("recordBtn");
const playEarthBtn = document.getElementById("playEarthBtn");
const playTitanBtn = document.getElementById("playTitanBtn");
const stopBtn = document.getElementById("stopBtn");
const statusEl = document.getElementById("status");
const canvas = document.getElementById("wave");
const ctx = canvas.getContext("2d");

function lerp(a, b, t) {
  return a + (b - a) * t;
}

const muffle = Math.min(1, Math.max(0, MUFFLE));

let audioCtx = null;
let mediaRecorder = null;
let chunks = [];
let earthBuffer = null;
let titanBuffer = null;
let playingSource = null;
let analyser = null;
let micStream = null;
let rafId = 0;
let recording = false;

function setStatus(text) {
  statusEl.textContent = text;
}

function getAudioContext() {
  if (!audioCtx) {
    audioCtx = new (window.AudioContext || window.webkitAudioContext)();
  }
  return audioCtx;
}

function drawIdle() {
  ctx.clearRect(0, 0, canvas.width, canvas.height);
  ctx.strokeStyle = "rgba(224, 168, 112, 0.35)";
  ctx.beginPath();
  ctx.moveTo(0, canvas.height / 2);
  ctx.lineTo(canvas.width, canvas.height / 2);
  ctx.stroke();
}

function drawWaveform(data) {
  ctx.clearRect(0, 0, canvas.width, canvas.height);
  ctx.strokeStyle = "#e07a3a";
  ctx.lineWidth = 2;
  ctx.beginPath();
  const slice = canvas.width / data.length;
  for (let i = 0; i < data.length; i++) {
    const v = data[i] / 128.0;
    const y = (v * canvas.height) / 2;
    const x = i * slice;
    if (i === 0) ctx.moveTo(x, y);
    else ctx.lineTo(x, y);
  }
  ctx.stroke();
}

function tickMeter() {
  if (!analyser) {
    drawIdle();
    return;
  }
  const data = new Uint8Array(analyser.fftSize);
  analyser.getByteTimeDomainData(data);
  drawWaveform(data);
  rafId = requestAnimationFrame(tickMeter);
}

function hann(size) {
  const w = new Float32Array(size);
  for (let i = 0; i < size; i++) {
    w[i] = 0.5 * (1 - Math.cos((2 * Math.PI * i) / (size - 1)));
  }
  return w;
}

function resampleLinear(input, ratio) {
  const outLen = Math.max(1, Math.floor(input.length * ratio));
  const out = new Float32Array(outLen);
  for (let i = 0; i < outLen; i++) {
    const src = i / ratio;
    const i0 = Math.min(Math.floor(src), input.length - 1);
    const i1 = Math.min(i0 + 1, input.length - 1);
    const frac = src - i0;
    out[i] = input[i0] * (1 - frac) + input[i1] * frac;
  }
  return out;
}

function pitchShiftChannel(input, pitchRatio) {
  const grainSize = 2048;
  const hop = 512;
  const window = hann(grainSize);
  const stretch = 1 / pitchRatio;
  const output = new Float32Array(input.length);
  const grain = new Float32Array(grainSize);

  for (let pos = 0; pos + grainSize < input.length; pos += hop) {
    for (let i = 0; i < grainSize; i++) {
      grain[i] = input[pos + i] * window[i];
    }
    const stretched = resampleLinear(grain, stretch);
    for (let i = 0; i < grainSize && pos + i < output.length; i++) {
      output[pos + i] += stretched[i] * window[i] * 0.45;
    }
  }
  return output;
}

async function titanize(buffer) {
  const shifted = getAudioContext().createBuffer(
    1,
    buffer.length,
    buffer.sampleRate
  );
  const mix = new Float32Array(buffer.length);
  const channelCount = buffer.numberOfChannels;
  for (let c = 0; c < channelCount; c++) {
    const shiftedChannel = pitchShiftChannel(
      buffer.getChannelData(c),
      PITCH
    );
    for (let i = 0; i < mix.length; i++) {
      mix[i] += shiftedChannel[i] / channelCount;
    }
  }
  shifted.copyToChannel(mix, 0);

  const offline = new OfflineAudioContext(
    1,
    shifted.length,
    shifted.sampleRate
  );
  const source = offline.createBufferSource();
  source.buffer = shifted;

  const lowpass = offline.createBiquadFilter();
  lowpass.type = "lowpass";
  lowpass.frequency.value = lerp(4200, 700, muffle);
  lowpass.Q.value = 0.65;

  const muffler = offline.createBiquadFilter();
  muffler.type = "lowpass";
  muffler.frequency.value = lerp(8000, 1200, muffle);
  muffler.Q.value = 0.5;

  const lowshelf = offline.createBiquadFilter();
  lowshelf.type = "lowshelf";
  lowshelf.frequency.value = 220;
  lowshelf.gain.value = lerp(0, 6, muffle);

  const highshelf = offline.createBiquadFilter();
  highshelf.type = "highshelf";
  highshelf.frequency.value = 1800;
  highshelf.gain.value = lerp(0, -12, muffle);

  source.connect(lowpass);
  lowpass.connect(muffler);
  muffler.connect(lowshelf);
  lowshelf.connect(highshelf);
  highshelf.connect(offline.destination);
  source.start();
  return offline.startRendering();
}

function stopPlayback() {
  if (playingSource) {
    try {
      playingSource.stop();
    } catch {
      /* already stopped */
    }
    playingSource.disconnect();
    playingSource = null;
  }
  if (analyser && !recording) {
    analyser.disconnect();
    analyser = null;
    cancelAnimationFrame(rafId);
    drawIdle();
  }
  stopBtn.disabled = true;
}

function playBuffer(buffer, label) {
  stopPlayback();
  const ac = getAudioContext();
  if (ac.state === "suspended") ac.resume();

  const source = ac.createBufferSource();
  source.buffer = buffer;
  analyser = ac.createAnalyser();
  analyser.fftSize = 1024;
  source.connect(analyser);
  analyser.connect(ac.destination);
  playingSource = source;
  stopBtn.disabled = false;
  setStatus(label);
  tickMeter();
  source.onended = () => {
    if (playingSource === source) {
      playingSource = null;
      analyser = null;
      cancelAnimationFrame(rafId);
      drawIdle();
      stopBtn.disabled = true;
      setStatus("Ready. Record again, or replay Earth vs Titan.");
    }
  };
  source.start();
}

function pickMimeType() {
  const types = [
    "audio/webm;codecs=opus",
    "audio/webm",
    "audio/mp4",
    "audio/ogg",
  ];
  return types.find((t) => MediaRecorder.isTypeSupported(t)) || "";
}

async function startRecording() {
  stopPlayback();
  const ac = getAudioContext();
  if (ac.state === "suspended") await ac.resume();

  micStream = await navigator.mediaDevices.getUserMedia({ audio: true });
  const mimeType = pickMimeType();
  mediaRecorder = mimeType
    ? new MediaRecorder(micStream, { mimeType })
    : new MediaRecorder(micStream);
  chunks = [];
  mediaRecorder.ondataavailable = (e) => {
    if (e.data.size) chunks.push(e.data);
  };
  mediaRecorder.onstop = onRecordingStop;

  const micSource = ac.createMediaStreamSource(micStream);
  analyser = ac.createAnalyser();
  analyser.fftSize = 1024;
  micSource.connect(analyser);
  tickMeter();

  mediaRecorder.start();
  recording = true;
  recordBtn.textContent = "Stop recording";
  recordBtn.classList.add("recording");
  playEarthBtn.disabled = true;
  playTitanBtn.disabled = true;
  stopBtn.disabled = true;
  setStatus("Recording… speak, then stop.");

  window.setTimeout(() => {
    if (recording) stopRecording();
  }, MAX_SECONDS * 1000);
}

function stopRecording() {
  if (!recording) return;
  recording = false;
  recordBtn.textContent = "Record";
  recordBtn.classList.remove("recording");
  if (mediaRecorder && mediaRecorder.state !== "inactive") {
    mediaRecorder.stop();
  }
  if (micStream) {
    micStream.getTracks().forEach((t) => t.stop());
    micStream = null;
  }
}

async function onRecordingStop() {
  setStatus("Processing Titan acoustics…");
  cancelAnimationFrame(rafId);
  analyser = null;
  drawIdle();

  const blob = new Blob(chunks, { type: mediaRecorder.mimeType || "audio/webm" });
  const arrayBuffer = await blob.arrayBuffer();
  const ac = getAudioContext();
  earthBuffer = await ac.decodeAudioData(arrayBuffer.slice(0));
  titanBuffer = await titanize(earthBuffer);

  playEarthBtn.disabled = false;
  playTitanBtn.disabled = false;
  setStatus("Recorded. Compare Earth and Titan.");
}

recordBtn.addEventListener("click", async () => {
  try {
    if (recording) stopRecording();
    else await startRecording();
  } catch (err) {
    setStatus("Microphone permission is needed to record.");
    console.error(err);
  }
});

playEarthBtn.addEventListener("click", () => {
  if (earthBuffer) playBuffer(earthBuffer, "Playing on Earth.");
});

playTitanBtn.addEventListener("click", () => {
  if (titanBuffer) playBuffer(titanBuffer, "Playing on Titan.");
});

stopBtn.addEventListener("click", () => {
  stopPlayback();
  setStatus("Stopped.");
});

drawIdle();
