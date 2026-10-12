const TITAN_PITCH = typeof PITCH === "number" ? PITCH : 0.62;

const progressEl = document.getElementById("scrollProgress");
const saturn = document.querySelector(".saturn");
const titan = document.querySelector(".titan-moon");
const clouds = document.querySelectorAll(".cloud");
const pitchStage = document.getElementById("pitchStage");
const pitchReadout = document.getElementById("pitchReadout");
const pitchCaption = document.getElementById("pitchCaption");
const formantPath = document.getElementById("formantPath");
const spectrum = document.getElementById("spectrum");
const reduceMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;

function clamp(n, a, b) {
  return Math.min(b, Math.max(a, n));
}

function sinePath(cycles) {
  const w = 640;
  const h = 120;
  const mid = h / 2;
  const amp = 34;
  const points = [];
  for (let x = 0; x <= w; x += 4) {
    const y = mid + Math.sin((x / w) * cycles * Math.PI * 2) * amp;
    points.push(`${x === 0 ? "M" : "L"}${x} ${y.toFixed(1)}`);
  }
  return points.join(" ");
}

if (spectrum) {
  for (let i = 0; i < 14; i++) {
    const bar = document.createElement("span");
    bar.style.setProperty("--i", String(i));
    bar.style.height = `${28 + ((i * 17) % 54)}%`;
    spectrum.appendChild(bar);
  }
}

function setPitchVisual(t) {
  const pitch = 1 - t * (1 - TITAN_PITCH);
  const pct = Math.round(pitch * 100);
  if (pitchReadout) pitchReadout.textContent = `${pct}%`;
  if (pitchCaption) {
    pitchCaption.textContent =
      t < 0.08 ? "Earth pitch" : t > 0.92 ? "Titan pitch" : "Dropping toward Titan";
  }
  if (formantPath) {
    const cycles = 8 * pitch;
    formantPath.setAttribute("d", sinePath(cycles));
  }
}

function updateScroll() {
  const doc = document.documentElement;
  const max = doc.scrollHeight - window.innerHeight;
  const p = max > 0 ? window.scrollY / max : 0;
  if (progressEl) progressEl.style.transform = `scaleX(${p})`;

  if (!reduceMotion) {
    const y = window.scrollY;
    if (saturn) saturn.style.transform = `translate3d(0, ${y * 0.12}px, 0) rotate(${-18 + y * 0.01}deg)`;
    if (titan) titan.style.transform = `translate3d(${y * -0.04}px, ${y * 0.22}px, 0)`;
    clouds.forEach((cloud, i) => {
      const k = 0.08 + i * 0.05;
      cloud.style.transform = `translate3d(${y * k * (i % 2 ? 1 : -1)}px, ${y * k * 0.4}px, 0)`;
    });
  }

  if (pitchStage) {
    const rect = pitchStage.getBoundingClientRect();
    const travel = Math.max(1, pitchStage.offsetHeight - window.innerHeight);
    const t = clamp(-rect.top / travel, 0, 1);
    setPitchVisual(reduceMotion ? 1 : t);
    pitchStage.style.setProperty("--pitch-t", t.toFixed(3));
  }
}

if (!reduceMotion) {
  const observer = new IntersectionObserver(
    (entries) => {
      entries.forEach((entry) => {
        if (entry.isIntersecting) entry.target.classList.add("is-in");
      });
    },
    { threshold: 0.18, rootMargin: "0px 0px -8% 0px" }
  );
  document.querySelectorAll("[data-reveal]").forEach((el) => observer.observe(el));
} else {
  document.querySelectorAll("[data-reveal]").forEach((el) => el.classList.add("is-in"));
}

let ticking = false;
window.addEventListener(
  "scroll",
  () => {
    if (ticking) return;
    ticking = true;
    requestAnimationFrame(() => {
      updateScroll();
      ticking = false;
    });
  },
  { passive: true }
);

setPitchVisual(reduceMotion ? 1 : 0);
updateScroll();
