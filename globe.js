const globe = document.getElementById("titanGlobe");
const context = globe.getContext("2d");
const textureImage = new Image();
let texturePixels;
let textureWidth = 0;
let textureHeight = 0;
let targetSize = globe.width;
let size = targetSize;
let center = size / 2;
let radius = size * 0.43;

let rotation = 0;
let tilt = -0.12;
let dragging = false;
let previousX = 0;
let previousY = 0;
let renderScheduled = false;
let pendingRenderScale = 1;

function scheduleDraw(scale = 1) {
  pendingRenderScale = scale;
  if (renderScheduled) return;

  renderScheduled = true;
  requestAnimationFrame(() => {
    renderScheduled = false;
    drawGlobe(pendingRenderScale);
  });
}

function resizeGlobe() {
  const displaySize = globe.getBoundingClientRect().width;
  const pixelRatio = Math.min(Math.max(window.devicePixelRatio || 1, 1.5), 2);
  targetSize = Math.max(1, Math.round(displaySize * pixelRatio));
  scheduleDraw();
}

function drawGlobe(renderScale = 1) {
  if (!texturePixels) return;

  size = Math.max(1, Math.round(targetSize * renderScale));
  center = size / 2;
  radius = size * 0.43;
  if (globe.width !== size || globe.height !== size) {
    globe.width = size;
    globe.height = size;
  }

  const image = context.createImageData(size, size);
  const pixels = image.data;
  const sinRotation = Math.sin(rotation);
  const cosRotation = Math.cos(rotation);
  const sinTilt = Math.sin(tilt);
  const cosTilt = Math.cos(tilt);

  for (let py = 0; py < size; py += 1) {
    const y = (center - py) / radius;
    for (let px = 0; px < size; px += 1) {
      const x = (px - center) / radius;
      const distance = x * x + y * y;
      if (distance > 1) continue;

      const radialDistance = Math.sqrt(distance);
      const z = Math.sqrt(1 - distance);
      const edgeCoverage = Math.min(1, (1 - radialDistance) * radius + 0.5);
      const rotatedX = x * cosRotation + z * sinRotation;
      const rotatedZ = z * cosRotation - x * sinRotation;
      const rotatedY = y * cosTilt - rotatedZ * sinTilt;
      const finalZ = y * sinTilt + rotatedZ * cosTilt;
      const longitude = Math.atan2(rotatedX, finalZ);
      const latitude = Math.asin(Math.max(-1, Math.min(1, rotatedY)));
      const textureX = ((longitude / (Math.PI * 2) + 0.5) * textureWidth) % textureWidth;
      const textureY = (0.5 - latitude / Math.PI) * (textureHeight - 1);
      const x0 = Math.floor(textureX);
      const x1 = (x0 + 1) % textureWidth;
      const y0 = Math.floor(textureY);
      const y1 = Math.min(y0 + 1, textureHeight - 1);
      const blendX = textureX - x0;
      const blendY = textureY - y0;
      const topLeft = (y0 * textureWidth + x0) * 4;
      const topRight = (y0 * textureWidth + x1) * 4;
      const bottomLeft = (y1 * textureWidth + x0) * 4;
      const bottomRight = (y1 * textureWidth + x1) * 4;

      const light = Math.max(0, (x * -0.48 + y * 0.72 + z * 0.5));
      const shade = 0.32 + light * 0.76;
      const limbHaze = Math.pow(1 - z, 3) * 0.2;
      const pixel = (py * size + px) * 4;
      for (let channel = 0; channel < 3; channel += 1) {
        const top =
          texturePixels[topLeft + channel] * (1 - blendX) +
          texturePixels[topRight + channel] * blendX;
        const bottom =
          texturePixels[bottomLeft + channel] * (1 - blendX) +
          texturePixels[bottomRight + channel] * blendX;
        const color = top * (1 - blendY) + bottom * blendY;
        pixels[pixel + channel] = Math.min(255, color * shade + limbHaze * 45);
      }
      pixels[pixel + 3] = Math.round(edgeCoverage * 255);
    }
  }

  context.clearRect(0, 0, size, size);
  context.save();
  context.shadowColor = "rgba(224, 122, 58, 0.55)";
  context.shadowBlur = size * 0.055;
  context.putImageData(image, 0, 0);
  context.restore();

  context.beginPath();
  context.arc(center, center, radius + 1, 0, Math.PI * 2);
  context.strokeStyle = "rgba(240, 178, 116, 0.45)";
  context.lineWidth = 2;
  context.stroke();
}

globe.addEventListener("pointerdown", (event) => {
  dragging = true;
  previousX = event.clientX;
  previousY = event.clientY;
  globe.setPointerCapture(event.pointerId);
});

globe.addEventListener("pointermove", (event) => {
  if (!dragging) return;
  const scale = 0.008;
  rotation -= (event.clientX - previousX) * scale;
  tilt = Math.max(-0.75, Math.min(0.75, tilt - (event.clientY - previousY) * scale));
  previousX = event.clientX;
  previousY = event.clientY;
  scheduleDraw(0.5);
});

globe.addEventListener("pointerup", () => {
  dragging = false;
  scheduleDraw();
});

globe.addEventListener("pointercancel", () => {
  dragging = false;
  scheduleDraw();
});

globe.addEventListener("keydown", (event) => {
  const keyRotations = {
    ArrowLeft: [0.16, 0],
    ArrowRight: [-0.16, 0],
    ArrowUp: [0, 0.12],
    ArrowDown: [0, -0.12],
  };
  const change = keyRotations[event.key];
  if (!change) return;

  event.preventDefault();
  rotation += change[0];
  tilt = Math.max(-0.75, Math.min(0.75, tilt + change[1]));
  scheduleDraw();
});

window.addEventListener("resize", resizeGlobe);

textureImage.addEventListener("load", () => {
  const textureCanvas = document.createElement("canvas");
  textureCanvas.width = textureImage.naturalWidth;
  textureCanvas.height = textureImage.naturalHeight;
  const textureContext = textureCanvas.getContext("2d", { willReadFrequently: true });
  textureContext.drawImage(textureImage, 0, 0);
  const texture = textureContext.getImageData(0, 0, textureCanvas.width, textureCanvas.height);
  texturePixels = texture.data;
  textureWidth = texture.width;
  textureHeight = texture.height;
  scheduleDraw();
});

textureImage.addEventListener("error", () => {
  console.error("Could not load the Titan surface texture: PIA22770.jpg");
});

textureImage.src = "PIA22770.jpg";
resizeGlobe();
