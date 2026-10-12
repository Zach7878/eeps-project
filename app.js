const recordBtn = document.getElementById("recordBtn");
const playEarthBtn = document.getElementById("playEarthBtn");
const playTitanBtn = document.getElementById("playTitanBtn");
const pauseSampleBtn = document.getElementById("pauseSampleBtn");
const stopBtn = document.getElementById("stopBtn");
const statusEl = document.getElementById("status");
const sampleListEl = document.getElementById("sampleList");
const canvas = document.getElementById("wave");
const ctx = canvas.getContext("2d");

const samplePlayers = [];

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
let playOffset = 0;
let playStartedAt = 0;
let currentBuffer = null;
let currentLabel = "";
let paused = false;
let pausing = false;
let playingSample = false;

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

async function pitchShiftChannel(input, pitchRatio, onProgress) {
  const grainSize = 2048;
  const hop = 512;
  const window = hann(grainSize);
  const stretch = 1 / pitchRatio;
  const output = new Float32Array(input.length);
  const grain = new Float32Array(grainSize);
  const total = Math.max(1, Math.floor((input.length - grainSize) / hop));
  let grainIndex = 0;

  for (let pos = 0; pos + grainSize < input.length; pos += hop) {
    for (let i = 0; i < grainSize; i++) {
      grain[i] = input[pos + i] * window[i];
    }
    const stretched = resampleLinear(grain, stretch);
    for (let i = 0; i < grainSize && pos + i < output.length; i++) {
      output[pos + i] += stretched[i] * window[i] * 0.45;
    }
    grainIndex += 1;
    if (grainIndex % 250 === 0) {
      if (onProgress) onProgress(grainIndex / total);
      await new Promise((resolve) => setTimeout(resolve, 0));
    }
  }
  return output;
}

function downmixMono(buffer) {
  const mix = new Float32Array(buffer.length);
  const channelCount = buffer.numberOfChannels;
  for (let c = 0; c < channelCount; c++) {
    const data = buffer.getChannelData(c);
    for (let i = 0; i < mix.length; i++) {
      mix[i] += data[i] / channelCount;
    }
  }
  return mix;
}

function profileFor(type) {
  const profiles = typeof TITAN_PROFILES === "object" ? TITAN_PROFILES : {};
  return profiles[type] || profiles.mixed || { pitch: PITCH, muffle: MUFFLE };
}

async function titanize(buffer, onProgress, type) {
  const profile = profileFor(type);
  const pitch =
    typeof profile.pitch === "number" ? profile.pitch : PITCH;
  const muff =
    Math.min(1, Math.max(0, typeof profile.muffle === "number" ? profile.muffle : muffle));

  const mix = downmixMono(buffer);
  let processed = mix;
  if (Math.abs(pitch - 1) > 0.001) {
    processed = await pitchShiftChannel(mix, pitch, onProgress);
  } else if (onProgress) {
    onProgress(1);
  }

  const shifted = getAudioContext().createBuffer(
    1,
    processed.length,
    buffer.sampleRate
  );
  shifted.copyToChannel(processed, 0);

  const offline = new OfflineAudioContext(
    1,
    shifted.length,
    shifted.sampleRate
  );
  const source = offline.createBufferSource();
  source.buffer = shifted;

  const lowpass = offline.createBiquadFilter();
  lowpass.type = "lowpass";
  lowpass.frequency.value = lerp(4200, 700, muff);
  lowpass.Q.value = 0.65;

  const muffler = offline.createBiquadFilter();
  muffler.type = "lowpass";
  muffler.frequency.value = lerp(8000, 1200, muff);
  muffler.Q.value = 0.5;

  const lowshelf = offline.createBiquadFilter();
  lowshelf.type = "lowshelf";
  lowshelf.frequency.value = 220;
  lowshelf.gain.value = lerp(0, 6, muff);

  const highshelf = offline.createBiquadFilter();
  highshelf.type = "highshelf";
  highshelf.frequency.value = 1800;
  highshelf.gain.value = lerp(0, -12, muff);

  source.connect(lowpass);
  lowpass.connect(muffler);
  muffler.connect(lowshelf);
  lowshelf.connect(highshelf);
  highshelf.connect(offline.destination);
  source.start();
  return offline.startRendering();
}

function resetSamplePauseUi() {
  paused = false;
  pausing = false;
  playingSample = false;
  playOffset = 0;
  currentBuffer = null;
  currentLabel = "";
  pauseSampleBtn.textContent = "Pause";
  pauseSampleBtn.disabled = true;
}

function stopPlayback() {
  pausing = true;
  const source = playingSource;
  playingSource = null;
  if (source) {
    try {
      source.stop();
    } catch {
      /* already stopped */
    }
    source.disconnect();
  }
  if (analyser && !recording) {
    analyser.disconnect();
    analyser = null;
    cancelAnimationFrame(rafId);
    drawIdle();
  }
  stopBtn.disabled = true;
  resetSamplePauseUi();
}

function playBuffer(buffer, label, options = {}) {
  const offset = Math.max(0, options.offset || 0);
  const isSample = !!options.isSample;
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
  currentBuffer = buffer;
  currentLabel = label;
  playOffset = offset;
  playStartedAt = ac.currentTime;
  paused = false;
  pausing = false;
  playingSample = isSample;
  pauseSampleBtn.textContent = "Pause";
  pauseSampleBtn.disabled = !isSample;
  stopBtn.disabled = false;
  setStatus(label);
  tickMeter();
  source.onended = () => {
    if (pausing) return;
    if (playingSource === source) {
      playingSource = null;
      analyser = null;
      cancelAnimationFrame(rafId);
      drawIdle();
      stopBtn.disabled = true;
      resetSamplePauseUi();
      setStatus("Ready. Record, replay your voice, or play the sample.");
    }
  };
  const safeOffset = Math.min(offset, Math.max(0, buffer.duration - 0.01));
  source.start(0, safeOffset);
}

function pauseOrResumeSample() {
  if (paused && currentBuffer) {
    playBuffer(currentBuffer, currentLabel, {
      offset: playOffset,
      isSample: true,
    });
    return;
  }
  if (!playingSource || !playingSample || !currentBuffer) return;

  const ac = getAudioContext();
  playOffset += ac.currentTime - playStartedAt;
  if (playOffset >= currentBuffer.duration) {
    stopPlayback();
    setStatus("Ready. Record, replay your voice, or play the sample.");
    return;
  }

  pausing = true;
  try {
    playingSource.stop();
  } catch {
    /* already stopped */
  }
  playingSource.disconnect();
  playingSource = null;
  paused = true;
  pausing = false;
  cancelAnimationFrame(rafId);
  pauseSampleBtn.textContent = "Resume";
  pauseSampleBtn.disabled = false;
  stopBtn.disabled = false;
  setStatus("Paused.");
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

pauseSampleBtn.addEventListener("click", () => {
  pauseOrResumeSample();
});

stopBtn.addEventListener("click", () => {
  stopPlayback();
  setStatus("Stopped.");
});

async function getSampleTitanBuffer(player) {
  if (player.titanBuffer) return player.titanBuffer;
  if (player.titanPromise) return player.titanPromise;
  player.titanPromise = titanize(
    player.earthBuffer,
    (p) => {
      setStatus(`Processing ${player.config.label} for Titan… ${Math.round(p * 100)}%`);
    },
    player.config.type
  ).then((buffer) => {
    player.titanBuffer = buffer;
    return buffer;
  });
  try {
    return await player.titanPromise;
  } catch (err) {
    player.titanPromise = null;
    throw err;
  }
}

function addSampleCard(player) {
  const card = document.createElement("article");
  card.className = "sample-card";

  const title = document.createElement("h3");
  title.textContent = player.config.label;

  const note = document.createElement("p");
  note.className = "sample-note";
  note.textContent = player.config.note || "";

  const controls = document.createElement("div");
  controls.className = "controls";

  const earthBtn = document.createElement("button");
  earthBtn.type = "button";
  earthBtn.className = "btn";
  earthBtn.textContent = "Play original";
  earthBtn.disabled = true;

  const titanBtn = document.createElement("button");
  titanBtn.type = "button";
  titanBtn.className = "btn titan";
  titanBtn.textContent = "Play on Titan";
  titanBtn.disabled = true;

  earthBtn.addEventListener("click", () => {
    if (player.earthBuffer) {
      playBuffer(player.earthBuffer, `Playing original: ${player.config.label}.`, {
        isSample: true,
      });
    }
  });

  titanBtn.addEventListener("click", async () => {
    if (!player.earthBuffer) return;
    titanBtn.disabled = true;
    try {
      const buffer = await getSampleTitanBuffer(player);
      playBuffer(buffer, `Playing on Titan: ${player.config.label}.`, {
        isSample: true,
      });
    } catch (err) {
      setStatus(`Could not process ${player.config.label} for Titan.`);
      console.error(err);
    } finally {
      titanBtn.disabled = !player.earthBuffer;
    }
  });

  controls.append(earthBtn, titanBtn);
  card.append(title, note, controls);
  sampleListEl.appendChild(card);

  player.earthBtn = earthBtn;
  player.titanBtn = titanBtn;
}

async function loadSamples() {
  const configs = Array.isArray(SAMPLES) ? SAMPLES : [];
  if (!configs.length || !sampleListEl) return;

  setStatus("Loading sample tracks…");
  let loaded = 0;

  await Promise.all(
    configs.map(async (config) => {
      const player = {
        config,
        earthBuffer: null,
        titanBuffer: null,
        titanPromise: null,
        earthBtn: null,
        titanBtn: null,
      };
      samplePlayers.push(player);
      addSampleCard(player);
      try {
        const response = await fetch(encodeURI(config.file));
        if (!response.ok) throw new Error(response.statusText);
        const data = await response.arrayBuffer();
        player.earthBuffer = await getAudioContext().decodeAudioData(data);
        player.earthBtn.disabled = false;
        player.titanBtn.disabled = false;
        loaded += 1;
      } catch (err) {
        player.earthBtn.textContent = "Missing file";
        console.error(err);
      }
    })
  );

  if (loaded) {
    setStatus("Ready. Record, replay your voice, or play a sample.");
  } else {
    setStatus("Ready when you are.");
  }
}

drawIdle();
loadSamples();
