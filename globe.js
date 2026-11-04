const globe = document.getElementById("titanGlobe");
const globeContent = document.querySelector(".globe-content");
const krakenImagePanel = document.getElementById("krakenImagePanel");
const ligeiaImagePanel = document.getElementById("ligeiaImagePanel");
const huygensImagePanel = document.getElementById("huygensImagePanel");
const selkImagePanel = document.getElementById("selkImagePanel");
const ontarioImagePanel = document.getElementById("ontarioImagePanel");
const xanaduImagePanel = document.getElementById("xanaduImagePanel");
const sotraImagePanel = document.getElementById("sotraImagePanel");
const hoteiImagePanel = document.getElementById("hoteiImagePanel");
const menrvaImagePanel = document.getElementById("menrvaImagePanel");
const shangriLaImagePanel = document.getElementById("shangri-laImagePanel");
const mithrimImagePanel = document.getElementById("mithrimImagePanel");
const pungaImagePanel = document.getElementById("pungaImagePanel");
const vidFluminaImagePanel = document.getElementById("vidFluminaImagePanel");
const jingpoImagePanel = document.getElementById("jingpoImagePanel");
const context = globe.getContext("2d");
const locationInfos = {
  kraken: {
    element: document.getElementById("krakenInfo"),
    closeButton: document.getElementById("closeKrakenInfo"),
  },
  huygens: {
    element: document.getElementById("huygensInfo"),
    closeButton: document.getElementById("closeHuygensInfo"),
  },
  ligeia: {
    element: document.getElementById("ligeiaInfo"),
    closeButton: document.getElementById("closeLigeiaInfo"),
  },
  selk: {
    element: document.getElementById("selkInfo"),
    closeButton: document.getElementById("closeSelkInfo"),
  },
  ontario: {
    element: document.getElementById("ontarioInfo"),
    closeButton: document.getElementById("closeOntarioInfo"),
  },
  xanadu: {
    element: document.getElementById("xanaduInfo"),
    closeButton: document.getElementById("closeXanaduInfo"),
  },
  sotra: {
    element: document.getElementById("sotraInfo"),
    closeButton: document.getElementById("closeSotraInfo"),
  },
  hotei: {
    element: document.getElementById("hoteiInfo"),
    closeButton: document.getElementById("closeHoteiInfo"),
  },
  menrva: {
    element: document.getElementById("menrvaInfo"),
    closeButton: document.getElementById("closeMenrvaInfo"),
  },
  shangriLa: {
    element: document.getElementById("shangriLaInfo"),
    closeButton: document.getElementById("closeShangriLaInfo"),
  },
  mithrim: {
    element: document.getElementById("mithrimInfo"),
    closeButton: document.getElementById("closeMithrimInfo"),
  },
  punga: {
    element: document.getElementById("pungaInfo"),
    closeButton: document.getElementById("closePungaInfo"),
  },
  vidFlumina: {
    element: document.getElementById("vidFluminaInfo"),
    closeButton: document.getElementById("closeVidFluminaInfo"),
  },
  jingpo: {
    element: document.getElementById("jingpoInfo"),
    closeButton: document.getElementById("closeJingpoInfo"),
  },
};
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
let pointerStartX = 0;
let pointerStartY = 0;
let lastPointerX = 0;
let lastPointerY = 0;
let pointerIsOverGlobe = false;
let renderScheduled = false;
let pendingRenderScale = 1;
const krakenMare = {
  id: "kraken",
  name: "Kraken Mare",
  latitude: 68,
  longitudeWest: 310,
};
const huygensLandingSite = {
  id: "huygens",
  name: "Huygens Landing Site",
  latitude: -10.3,
  longitudeWest: 192.32,
};
const ligeiaMare = {
  id: "ligeia",
  name: "Ligeia Mare",
  latitude: 79,
  longitudeWest: 248,
};
const selkCrater = {
  id: "selk",
  name: "Selk Crater",
  latitude: 7,
  longitudeWest: 199,
};
const ontarioLacus = {
  id: "ontario",
  name: "Ontario Lacus",
  latitude: -72,
  longitudeWest: 183,
};
const xanadu = {
  id: "xanadu",
  name: "Xanadu",
  latitude: -10,
  longitudeWest: 100,
};
const sotraPatera = {
  id: "sotra",
  name: "Sotra Patera",
  latitude: -14.5,
  longitudeWest: 40,
};
const hoteiRegio = {
  id: "hotei",
  name: "Hotei Regio",
  latitude: -26,
  longitudeWest: 78,
};
const menrva = {
  id: "menrva",
  name: "Menrva",
  latitude: 20.1,
  longitudeWest: 87.2,
};
const shangriLa = {
  id: "shangriLa",
  name: "Shangri-La",
  latitude: 0,
  longitudeWest: 175,
};
const mithrimMontes = {
  id: "mithrim",
  name: "Mithrim Montes",
  latitude: -3,
  longitudeWest: 126,
};
const pungaMare = {
  id: "punga",
  name: "Punga Mare",
  latitude: 85,
  longitudeWest: 340,
};
const vidFlumina = {
  id: "vidFlumina",
  name: "Vid Flumina",
  latitude: 73,
  longitudeWest: 242.5,
};
const jingpoLacus = {
  id: "jingpo",
  name: "Jingpo Lacus",
  latitude: 73,
  longitudeWest: 336,
};
const locations = [
  krakenMare,
  huygensLandingSite,
  ligeiaMare,
  selkCrater,
  ontarioLacus,
  xanadu,
  sotraPatera,
  hoteiRegio,
  menrva,
  shangriLa,
  mithrimMontes,
  pungaMare,
  vidFlumina,
  jingpoLacus,
];
const locationImagePanels = {
  kraken: krakenImagePanel,
  huygens: huygensImagePanel,
  ligeia: ligeiaImagePanel,
  selk: selkImagePanel,
  ontario: ontarioImagePanel,
  xanadu: xanaduImagePanel,
  sotra: sotraImagePanel,
  hotei: hoteiImagePanel,
  menrva: menrvaImagePanel,
  shangriLa: shangriLaImagePanel,
  mithrim: mithrimImagePanel,
  punga: pungaImagePanel,
  vidFlumina: vidFluminaImagePanel,
  jingpo: jingpoImagePanel,
};

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
      const textureX =
        ((longitude / (Math.PI * 2)) * textureWidth + textureWidth) %
        textureWidth;
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
  for (const location of locations) {
    drawLocationMarker(location);
  }
}

function projectCoordinates(latitude, longitude) {
  const latitudeRadians = latitude * Math.PI / 180;
  const longitudeRadians = (360 - longitude) * Math.PI / 180;
  const geographicX = Math.cos(latitudeRadians) * Math.sin(longitudeRadians);
  const geographicY = Math.sin(latitudeRadians);
  const geographicZ = Math.cos(latitudeRadians) * Math.cos(longitudeRadians);

  const rotatedZ =
    -geographicY * Math.sin(tilt) + geographicZ * Math.cos(tilt);
  const x = geographicX * Math.cos(rotation) - rotatedZ * Math.sin(rotation);
  const y =
    geographicY * Math.cos(tilt) +
    geographicZ * Math.sin(tilt);
  const z = geographicX * Math.sin(rotation) + rotatedZ * Math.cos(rotation);

  return {
    x: center + x * radius,
    y: center - y * radius,
    visible: z > 0,
  };
}

function drawLocationMarker(location) {
  const point = projectCoordinates(location.latitude, location.longitudeWest);
  if (!point.visible) return;

  const markerSize = Math.max(5, size * (location.id === "huygens" ? 0.01 : 0.012));
  context.save();
  context.lineWidth = Math.max(2, size * 0.004);
  context.strokeStyle = "#fff1d8";
  context.fillStyle =
    location.id === "huygens"
      ? "#71d7d1"
      : location.id === "ligeia"
        ? "#77d6e8"
        : location.id === "selk"
          ? "#e8d16f"
          : location.id === "ontario"
            ? "#9de18b"
            : location.id === "xanadu"
              ? "#d1a7ff"
              : location.id === "sotra"
                ? "#ff9f76"
                : location.id === "hotei"
                  ? "#a3e6bc"
                  : location.id === "menrva"
                    ? "#f5a6bf"
                    : location.id === "shangriLa"
                      ? "#e9c46a"
                      : location.id === "mithrim"
                        ? "#9dc9ff"
                        : location.id === "punga"
                          ? "#84d9a5"
                          : location.id === "vidFlumina"
                            ? "#8de0e8"
                            : location.id === "jingpo"
                              ? "#8fb9ff"
                              : "#e07a3a";
  context.shadowColor = "rgba(0, 0, 0, 0.8)";
  context.shadowBlur = markerSize;
  context.beginPath();
  context.arc(point.x, point.y, markerSize, 0, Math.PI * 2);
  context.fill();
  context.stroke();
  context.beginPath();
  context.arc(point.x, point.y, markerSize * 2, 0, Math.PI * 2);
  context.strokeStyle = "rgba(255, 241, 216, 0.75)";
  context.stroke();
  context.font = `600 ${Math.max(12, size * 0.027)}px system-ui, sans-serif`;
  context.textAlign = point.x > center ? "right" : "left";
  context.textBaseline = "middle";
  context.fillStyle = "#fff1d8";
  context.fillText(
    location.name,
    point.x + (point.x > center ? -markerSize * 2.8 : markerSize * 2.8),
    point.y,
  );
  context.restore();
}

function getCoordinatesAtPointer(clientX, clientY) {
  const bounds = globe.getBoundingClientRect();
  const pointerX = ((clientX - bounds.left) / bounds.width) * globe.width;
  const pointerY = ((clientY - bounds.top) / bounds.height) * globe.height;
  const x = (pointerX - center) / radius;
  const y = (center - pointerY) / radius;
  const distance = x * x + y * y;
  if (distance > 1) return null;

  const z = Math.sqrt(1 - distance);
  const sinRotation = Math.sin(rotation);
  const cosRotation = Math.cos(rotation);
  const sinTilt = Math.sin(tilt);
  const cosTilt = Math.cos(tilt);

  const rotatedX = x * cosRotation + z * sinRotation;
  const rotatedZ = z * cosRotation - x * sinRotation;
  const geographicY = y * cosTilt - rotatedZ * sinTilt;
  const geographicZ = y * sinTilt + rotatedZ * cosTilt;
  const geographicX = rotatedX;
  const longitudeRadians = Math.atan2(geographicX, geographicZ);
  const latitudeRadians = Math.asin(Math.max(-1, Math.min(1, geographicY)));
  const longitudeEast =
    ((longitudeRadians * 180 / Math.PI) % 360 + 360) % 360;
  const longitudeWest = (360 - longitudeEast) % 360;
  const latitude = latitudeRadians * 180 / Math.PI;

  return { latitude, longitude: longitudeWest };
}

function formatCoordinates(coordinates) {
  const latitudeHemisphere = coordinates.latitude < 0 ? "S" : "N";
  const longitude = Math.round(coordinates.longitude * 100) / 100 % 360;
  return `${Math.abs(coordinates.latitude).toFixed(2)}° ${latitudeHemisphere}, ${longitude.toFixed(2)}° W`;
}

function updateHoverCoordinates(clientX, clientY) {
  const coordinates = getCoordinatesAtPointer(clientX, clientY);
  globeHoverCoordinates.textContent = coordinates
    ? `Hover: ${formatCoordinates(coordinates)}`
    : "Hover over Titan to see coordinates";
}

function positionLocationInfo(element) {
  const contentBounds = globeContent.getBoundingClientRect();
  const globeBounds = globe.getBoundingClientRect();
  const globeRight = globeBounds.left + globeBounds.width * 0.93;
  const availableWidth = Math.max(0, contentBounds.right - globeRight);
  const sidePadding = Math.min(10, availableWidth / 3);
  const cardWidth = Math.max(0, Math.min(440, availableWidth - sidePadding * 2));
  const cardCenter = globeRight + availableWidth / 2;

  element.style.left = `${cardCenter - cardWidth / 2 - contentBounds.left}px`;
  element.style.width = `${cardWidth}px`;
}

function positionLocationImage(element) {
  const contentBounds = globeContent.getBoundingClientRect();
  const globeBounds = globe.getBoundingClientRect();
  const globeLeft = globeBounds.left + globeBounds.width * 0.07;
  const availableWidth = Math.max(0, globeLeft - contentBounds.left);
  const sidePadding = Math.min(16, availableWidth / 3);
  const panelWidth = Math.max(0, Math.min(320, availableWidth - sidePadding * 2));
  const panelCenter = contentBounds.left + availableWidth / 2;

  element.style.left = `${panelCenter - panelWidth / 2 - contentBounds.left}px`;
  element.style.width = `${panelWidth}px`;
}

const globeHoverCoordinates = document.getElementById("globeHoverCoordinates");
const globeSelectedCoordinates = document.getElementById("globeSelectedCoordinates");
let pointerMoved = false;

globe.addEventListener("pointerdown", (event) => {
  dragging = true;
  pointerMoved = false;
  pointerStartX = event.clientX;
  pointerStartY = event.clientY;
  lastPointerX = event.clientX;
  lastPointerY = event.clientY;
  pointerIsOverGlobe = true;
  previousX = event.clientX;
  previousY = event.clientY;
  globe.setPointerCapture(event.pointerId);
});

globe.addEventListener("pointermove", (event) => {
  if (dragging) {
    const deltaX = event.clientX - previousX;
    const deltaY = event.clientY - previousY;
    if (
      Math.abs(event.clientX - pointerStartX) > 3 ||
      Math.abs(event.clientY - pointerStartY) > 3
    ) {
      pointerMoved = true;
    }
    const scale = 0.008;
    rotation -= deltaX * scale;
    tilt = Math.max(-0.75, Math.min(0.75, tilt - deltaY * scale));
    previousX = event.clientX;
    previousY = event.clientY;
    scheduleDraw(0.5);
  }
  lastPointerX = event.clientX;
  lastPointerY = event.clientY;
  pointerIsOverGlobe = true;
  updateHoverCoordinates(lastPointerX, lastPointerY);
});

globe.addEventListener("pointerup", () => {
  dragging = false;
  scheduleDraw();
});

globe.addEventListener("pointercancel", () => {
  dragging = false;
  scheduleDraw();
});

globe.addEventListener("pointerleave", () => {
  if (!dragging) {
    pointerIsOverGlobe = false;
    globeHoverCoordinates.textContent = "Hover over Titan to see coordinates";
  }
});

globe.addEventListener("click", (event) => {
  if (!pointerMoved) {
    const coordinates = getCoordinatesAtPointer(event.clientX, event.clientY);
    if (coordinates) {
      globeSelectedCoordinates.textContent = `Selected: ${formatCoordinates(coordinates)}`;
      const bounds = globe.getBoundingClientRect();
      for (const location of locations) {
        const marker = projectCoordinates(
          location.latitude,
          location.longitudeWest,
        );
        const markerX = bounds.left + marker.x / globe.width * bounds.width;
        const markerY = bounds.top + marker.y / globe.height * bounds.height;
        const markerHitRadius = Math.max(14, bounds.width * 0.025);
        if (
          marker.visible &&
          Math.hypot(event.clientX - markerX, event.clientY - markerY) <=
            markerHitRadius
        ) {
          for (const { element } of Object.values(locationInfos)) {
            element.hidden = true;
          }
          for (const [locationId, panel] of Object.entries(locationImagePanels)) {
            panel.hidden = locationId !== location.id;
          }
          const info = locationInfos[location.id];
          positionLocationInfo(info.element);
          const imagePanel = locationImagePanels[location.id];
          if (imagePanel) positionLocationImage(imagePanel);
          info.element.hidden = false;
          info.closeButton.focus();
          break;
        }
      }
    }
  }
  pointerMoved = false;
});

for (const info of Object.values(locationInfos)) {
  info.closeButton.addEventListener("click", () => {
    info.element.hidden = true;
    const locationId = Object.keys(locationInfos).find(
      (id) => locationInfos[id] === info,
    );
    if (locationId && locationImagePanels[locationId]) {
      locationImagePanels[locationId].hidden = true;
    }
    globe.focus();
  });
}

window.addEventListener("resize", () => {
  for (const { element } of Object.values(locationInfos)) {
    if (!element.hidden) positionLocationInfo(element);
  }
  for (const panel of Object.values(locationImagePanels)) {
    if (!panel.hidden) positionLocationImage(panel);
  }
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
  if (pointerIsOverGlobe) {
    updateHoverCoordinates(lastPointerX, lastPointerY);
  }
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
