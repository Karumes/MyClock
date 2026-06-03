const fontFamilies = {
  rounded: '"Arial Rounded MT Bold", "M PLUS Rounded 1c", "Nunito", "Avenir Next Rounded", "Segoe UI Rounded", "Segoe UI", sans-serif',
  modern: '"SF Pro Display", "Inter", "Segoe UI", sans-serif',
  mono: '"Cascadia Code", "JetBrains Mono", "SFMono-Regular", monospace',
  condensed: '"Roboto Condensed", "Oswald", "Arial Narrow", sans-serif',
  serif: '"Cormorant Garamond", "Georgia", serif',
};

const clocks = [
  { name: "Binary", renderer: "renderClock5", size: 120 },
  { name: "Rolling", renderer: "renderClock6", size: 310 },
  { name: "Lumen", renderer: "renderClock8", size: 120 },
  { name: "Reel", renderer: "renderClock1", size: 120 },
  { name: "Orbit", renderer: "renderClock2", size: 320 },
  { name: "Flip", renderer: "renderClock3", size: 310 },
  { name: "Halo", renderer: "renderClock4", size: 320 },
  { name: "Grid", renderer: "renderClock7", size: 130 },
];

const defaultAccents = ["#69f7ff", "#ffffff", "#f7fbff", "#dbe8ff", "#89ffbf", "#ffffff", "#ff4fd8", "#f8fbff"];

const state = {
  section: "library",
  selected: 0,
  profiles: clocks.map((clock, index) => ({
    bgColor: "#000000",
    color: defaultAccents[index],
    colonColor: index === 1 ? "#69f7ff" : "#ffffff",
    cardColor: "rgba(255,255,255,0.055)",
    fontFamily: index === 1 ? "mono" : index === 5 ? "condensed" : "rounded",
    imageScale: 1,
    image: null,
    imageUrl: "",
  })),
};

const platform = document.getElementById("platform");
const librarySection = document.getElementById("library-section");
const createSection = document.getElementById("create-section");
const clockGrid = document.getElementById("clock-grid");
const saver = document.getElementById("saver");
const mainCanvas = document.getElementById("clockCanvas");
const mainCtx = mainCanvas.getContext("2d");
const settingsPanel = document.getElementById("settings-panel");
const settingsTitle = document.getElementById("settings-title");
const bgInput = document.getElementById("bg-custom-color");
const fontInput = document.getElementById("font-custom-color");
const colonInput = document.getElementById("colon-custom-color");
const cardInput = document.getElementById("card-custom-color");
const fontSelect = document.getElementById("font-family-select");
const imageInput = document.getElementById("digit-image-input");
const imageScale = document.getElementById("image-scale");
const createCode = document.getElementById("create-code");
const createPreview = document.getElementById("create-preview");

const previewCanvases = [];
const revealObserver = "IntersectionObserver" in window
  ? new IntersectionObserver((entries) => {
      entries.forEach((entry) => {
        if (entry.isIntersecting) entry.target.classList.add("revealed");
      });
    }, { threshold: 0.16 })
  : null;

let digitPatternCache = new WeakMap();
let createCleanup = null;
const renderErrors = new Set();

function hexToRgba(hex, alpha) {
  if (typeof hex !== "string" || !hex.startsWith("#")) return hex;
  const raw = hex.slice(1);
  const full = raw.length === 3 ? raw.split("").map((ch) => ch + ch).join("") : raw;
  const r = parseInt(full.slice(0, 2), 16);
  const g = parseInt(full.slice(2, 4), 16);
  const b = parseInt(full.slice(4, 6), 16);
  return `rgba(${r}, ${g}, ${b}, ${alpha})`;
}

function solidPaint(ctx, profile, w, h) {
  if (!profile.image) return profile.color;
  let cache = digitPatternCache.get(profile.image);
  const scale = Number(profile.imageScale) || 1;
  if (!cache || cache.scale !== scale) {
    const tile = document.createElement("canvas");
    const base = Math.max(220, Math.floor(Math.min(w, h) * 0.48 * scale));
    tile.width = base;
    tile.height = base;
    const tctx = tile.getContext("2d");
    tctx.fillStyle = "#000";
    tctx.fillRect(0, 0, base, base);
    const ratio = Math.max(base / profile.image.width, base / profile.image.height);
    const iw = profile.image.width * ratio;
    const ih = profile.image.height * ratio;
    tctx.drawImage(profile.image, (base - iw) / 2, (base - ih) / 2, iw, ih);
    cache = { scale, tile };
    digitPatternCache.set(profile.image, cache);
  }
  return ctx.createPattern(cache.tile, "repeat") || profile.color;
}

function resizeCanvasToDisplaySize(canvas) {
  const rect = canvas.getBoundingClientRect();
  const width = Math.max(2, Math.floor(rect.width * window.devicePixelRatio));
  const height = Math.max(2, Math.floor(rect.height * window.devicePixelRatio));
  if (canvas.width !== width || canvas.height !== height) {
    canvas.width = width;
    canvas.height = height;
  }
}

function fillPureBlack(ctx, w, h, color) {
  ctx.clearRect(0, 0, w, h);
  ctx.fillStyle = color || "#000000";
  ctx.fillRect(0, 0, w, h);
}

function drawLumenReflection(ctx, source, w, h) {
  const reflectionHeight = h * 0.48;
  const reflectionY = h * 0.54;
  const tmp = document.createElement("canvas");
  tmp.width = w;
  tmp.height = h;
  const tctx = tmp.getContext("2d");

  tctx.save();
  tctx.translate(w / 2, reflectionY + reflectionHeight / 2);
  tctx.scale(1.18, -0.62);
  tctx.filter = `blur(${Math.max(10, Math.floor(h * 0.035))}px)`;
  tctx.globalAlpha = 0.72;
  tctx.drawImage(source, -w / 2, -h * 0.32, w, h);
  tctx.restore();

  const mask = tctx.createLinearGradient(0, reflectionY, 0, h);
  mask.addColorStop(0, "rgba(255,255,255,0.78)");
  mask.addColorStop(0.46, "rgba(255,255,255,0.22)");
  mask.addColorStop(1, "rgba(255,255,255,0)");
  tctx.globalCompositeOperation = "destination-in";
  tctx.fillStyle = mask;
  tctx.fillRect(0, reflectionY, w, h - reflectionY);

  ctx.save();
  ctx.globalCompositeOperation = "screen";
  ctx.drawImage(tmp, 0, 0);
  ctx.restore();
}

function drawClockFallback(ctx, w, h, clockName) {
  ctx.save();
  fillPureBlack(ctx, w, h, "#000000");
  ctx.fillStyle = "rgba(255,255,255,0.72)";
  ctx.textAlign = "center";
  ctx.textBaseline = "middle";
  ctx.font = `700 ${Math.max(18, Math.floor(Math.min(w, h) * 0.055))}px ${fontFamilies.modern}`;
  ctx.fillText(clockName || "Clock", w / 2, h / 2);
  ctx.restore();
}

function renderClock(ctx, canvas, index, now) {
  const clock = clocks[index];
  const profile = state.profiles[index];
  const w = canvas.width;
  const h = canvas.height;
  fillPureBlack(ctx, w, h, profile.bgColor);

  const layer = document.createElement("canvas");
  layer.width = w;
  layer.height = h;
  const lctx = layer.getContext("2d");
  const renderer = window[clock.renderer];
  const paint = solidPaint(lctx, profile, w, h);
  const sizeRatio = index === 1 ? 0.5 : 0.42;
  const size = Math.min(clock.size * window.devicePixelRatio, Math.min(w, h) * sizeRatio);
  const options = {
    suppressBg: true,
    bg: profile.bgColor,
    color: profile.color,
    colonColor: profile.colonColor,
    circleDigitColor: profile.colonColor,
    flipBackColor: index === 5 ? "rgba(255,255,255,0)" : profile.cardColor,
    cardColor: profile.cardColor,
    fontFamily: fontFamilies[profile.fontFamily] || fontFamilies.rounded,
    clock6Speed: 0.72,
    glassOnly: index === 5,
    fontMode: "solid",
  };

  if (typeof renderer === "function") {
    try {
      renderer(lctx, w, h, paint, size, now, options);
    } catch (error) {
      if (!renderErrors.has(clock.renderer)) {
        console.error(`Failed to render ${clock.name}`, error);
        renderErrors.add(clock.renderer);
      }
      drawClockFallback(lctx, w, h, clock.name);
    }
  } else {
    if (!renderErrors.has(clock.renderer)) {
      console.error(`Missing renderer: ${clock.renderer}`);
      renderErrors.add(clock.renderer);
    }
    drawClockFallback(lctx, w, h, clock.name);
  }

  ctx.drawImage(layer, 0, 0);
  if (index === 2) drawLumenReflection(ctx, layer, w, h);
}

function createClockCard(clock, index) {
  const card = document.createElement("button");
  card.className = "clock-card";
  card.type = "button";
  card.setAttribute("aria-label", `${clock.name} clock`);
  card.addEventListener("click", () => launchClock(index));

  const canvas = document.createElement("canvas");
  const shine = document.createElement("span");
  shine.className = "card-shine";

  card.append(canvas, shine);
  clockGrid.appendChild(card);
  previewCanvases[index] = canvas;
  if (revealObserver) revealObserver.observe(card);
  else requestAnimationFrame(() => card.classList.add("revealed"));
}

function buildGrid() {
  clocks.forEach(createClockCard);
}

function setSection(section) {
  state.section = section;
  document.querySelectorAll(".tab").forEach((tab) => {
    tab.classList.toggle("active", tab.dataset.section === section);
  });
  librarySection.classList.toggle("active", section === "library");
  createSection.classList.toggle("active", section === "create");
  if (section === "create") runCreate();
}

function launchClock(index) {
  state.selected = index;
  platform.classList.add("hidden");
  saver.classList.remove("hidden");
  closeSettings();
  resizeMainCanvas();
  renderMain(new Date());
}

function returnHome() {
  saver.classList.add("hidden");
  settingsPanel.classList.add("hidden");
  platform.classList.remove("hidden");
}

function openSettings() {
  const profile = state.profiles[state.selected];
  settingsTitle.textContent = clocks[state.selected].name;
  bgInput.value = profile.bgColor;
  fontInput.value = profile.color;
  colonInput.value = profile.colonColor;
  cardInput.value = profile.cardColor.startsWith("#") ? profile.cardColor : "#0b1118";
  fontSelect.value = profile.fontFamily;
  imageScale.value = profile.imageScale;
  settingsPanel.classList.remove("hidden");
}

function closeSettings() {
  settingsPanel.classList.add("hidden");
}

function updateProfileFromControls() {
  const profile = state.profiles[state.selected];
  profile.bgColor = bgInput.value;
  profile.color = fontInput.value;
  profile.colonColor = colonInput.value;
  profile.cardColor = hexToRgba(cardInput.value, 0.12);
  profile.fontFamily = fontSelect.value;
  profile.imageScale = Number(imageScale.value);
}

function handleImageUpload(file) {
  if (!file) return;
  const reader = new FileReader();
  reader.onload = () => {
    const img = new Image();
    img.onload = () => {
      const profile = state.profiles[state.selected];
      profile.image = img;
      profile.imageUrl = reader.result;
      digitPatternCache = new WeakMap();
    };
    img.src = reader.result;
  };
  reader.readAsDataURL(file);
}

function resizeMainCanvas() {
  mainCanvas.width = Math.floor(window.innerWidth * window.devicePixelRatio);
  mainCanvas.height = Math.floor(window.innerHeight * window.devicePixelRatio);
}

function renderPreviews(now) {
  previewCanvases.forEach((canvas, index) => {
    resizeCanvasToDisplaySize(canvas);
    const ctx = canvas.getContext("2d");
    if (index === 3) {
      renderScaledScreenPreview(ctx, canvas, index, now);
    } else {
      renderClock(ctx, canvas, index, now);
    }
  });
}

function renderScaledScreenPreview(ctx, canvas, index, now) {
  const screenW = Math.max(2, mainCanvas.width || Math.floor(window.innerWidth * window.devicePixelRatio));
  const screenH = Math.max(2, mainCanvas.height || Math.floor(window.innerHeight * window.devicePixelRatio));
  const offscreen = document.createElement("canvas");
  offscreen.width = screenW;
  offscreen.height = screenH;
  renderClock(offscreen.getContext("2d"), offscreen, index, now);

  fillPureBlack(ctx, canvas.width, canvas.height, state.profiles[index].bgColor);
  const scale = Math.min(canvas.width / screenW, canvas.height / screenH);
  const drawW = Math.floor(screenW * scale);
  const drawH = Math.floor(screenH * scale);
  const x = Math.floor((canvas.width - drawW) / 2);
  const y = Math.floor((canvas.height - drawH) / 2);
  ctx.drawImage(offscreen, x, y, drawW, drawH);
}

function renderMain(now) {
  if (saver.classList.contains("hidden")) return;
  renderClock(mainCtx, mainCanvas, state.selected, now);
}

function loop() {
  const now = new Date();
  renderPreviews(now);
  renderMain(now);
  requestAnimationFrame(loop);
}

function defaultCreateCode() {
  return `const style = document.createElement("style");
style.textContent = \`
.custom-clock {
  width: 100%;
  height: 100%;
  display: grid;
  place-items: center;
  background: radial-gradient(circle at 50% 32%, rgba(105,247,255,.2), transparent 32%), #000;
  color: white;
  overflow: hidden;
}
.custom-time {
  font: 800 clamp(44px, 18vw, 210px)/1 "SF Pro Display", system-ui;
  letter-spacing: 0;
  background: linear-gradient(110deg, #fff, #69f7ff 42%, #ff4fd8);
  -webkit-background-clip: text;
  color: transparent;
  filter: drop-shadow(0 0 28px rgba(105,247,255,.34));
}
\`;

root.appendChild(style);
const shell = document.createElement("div");
shell.className = "custom-clock";
const time = document.createElement("div");
time.className = "custom-time";
shell.appendChild(time);
root.appendChild(shell);

render = (now) => {
  time.textContent = now.toLocaleTimeString("ja-JP", {
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit"
  });
};`;
}

function runCreate() {
  createPreview.innerHTML = "";
  if (typeof createCleanup === "function") createCleanup();
  createCleanup = null;

  let render = () => {};
  try {
    const fn = new Function("root", "now", "render", `${createCode.value}\nreturn { render, cleanup: typeof cleanup === "function" ? cleanup : null };`);
    const result = fn(createPreview, new Date(), render);
    render = result.render || render;
    createCleanup = result.cleanup;
  } catch (error) {
    createPreview.innerHTML = `<div class="custom-error">${String(error.message || error)}</div>`;
    return;
  }

  function tick() {
    if (!createSection.classList.contains("active")) return;
    try {
      render(new Date());
    } catch (error) {
      createPreview.innerHTML = `<div class="custom-error">${String(error.message || error)}</div>`;
      return;
    }
    requestAnimationFrame(tick);
  }
  tick();
}

function initThreeBackdrop() {
  const canvas = document.getElementById("auroraCanvas");
  if (!window.THREE || !canvas) return;

  const renderer = new THREE.WebGLRenderer({ canvas, alpha: true, antialias: true });
  const scene = new THREE.Scene();
  const camera = new THREE.PerspectiveCamera(58, 1, 0.1, 140);
  camera.position.z = 18;

  const galaxy = new THREE.Group();
  scene.add(galaxy);

  const starCount = 900;
  const positions = new Float32Array(starCount * 3);
  const colors = new Float32Array(starCount * 3);
  const palette = [
    new THREE.Color(0xb9f6ff),
    new THREE.Color(0xffffff),
    new THREE.Color(0xff8de8),
    new THREE.Color(0x8dffcf),
    new THREE.Color(0x98a8ff),
  ];

  for (let i = 0; i < starCount; i += 1) {
    const i3 = i * 3;
    const radius = Math.pow(Math.random(), 0.54) * 22;
    const arm = (i % 4) * (Math.PI / 2);
    const spin = radius * 0.32;
    const angle = arm + spin + (Math.random() - 0.5) * 0.78;
    const height = (Math.random() - 0.5) * Math.max(0.8, radius * 0.16);

    positions[i3] = Math.cos(angle) * radius;
    positions[i3 + 1] = height;
    positions[i3 + 2] = Math.sin(angle) * radius - 8;

    const color = palette[Math.floor(Math.random() * palette.length)];
    const dim = 0.52 + Math.random() * 0.48;
    colors[i3] = color.r * dim;
    colors[i3 + 1] = color.g * dim;
    colors[i3 + 2] = color.b * dim;
  }

  const geometry = new THREE.BufferGeometry();
  geometry.setAttribute("position", new THREE.BufferAttribute(positions, 3));
  geometry.setAttribute("color", new THREE.BufferAttribute(colors, 3));

  const stars = new THREE.Points(
    geometry,
    new THREE.PointsMaterial({
      size: 0.045,
      vertexColors: true,
      transparent: true,
      opacity: 0.9,
      depthWrite: false,
      blending: THREE.AdditiveBlending,
    })
  );
  galaxy.add(stars);

  const coreGeometry = new THREE.SphereGeometry(1.7, 40, 24);
  const coreMaterial = new THREE.MeshBasicMaterial({
    color: 0x69f7ff,
    transparent: true,
    opacity: 0.1,
    blending: THREE.AdditiveBlending,
  });
  const core = new THREE.Mesh(coreGeometry, coreMaterial);
  core.scale.set(1.7, 0.28, 1.7);
  galaxy.add(core);

  function resize() {
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    renderer.setSize(window.innerWidth, window.innerHeight, false);
    camera.aspect = window.innerWidth / window.innerHeight;
    camera.updateProjectionMatrix();
  }

  function animate(time) {
    galaxy.rotation.x = -0.22 + Math.sin(time * 0.00008) * 0.04;
    galaxy.rotation.y = time * 0.000055;
    stars.material.opacity = 0.72 + Math.sin(time * 0.00045) * 0.12;
    renderer.render(scene, camera);
    requestAnimationFrame(animate);
  }

  resize();
  window.addEventListener("resize", resize);
  requestAnimationFrame(animate);
}

function initEvents() {
  document.querySelectorAll(".tab").forEach((tab) => {
    tab.addEventListener("click", () => setSection(tab.dataset.section));
  });
  document.getElementById("brand-btn").addEventListener("click", () => setSection("library"));
  document.getElementById("home-btn").addEventListener("click", returnHome);
  document.getElementById("settings-btn").addEventListener("click", openSettings);
  document.getElementById("close-settings").addEventListener("click", closeSettings);
  document.getElementById("apply-btn").addEventListener("click", closeSettings);
  document.getElementById("run-create").addEventListener("click", runCreate);
  document.getElementById("clear-image").addEventListener("click", () => {
    const profile = state.profiles[state.selected];
    profile.image = null;
    profile.imageUrl = "";
    imageInput.value = "";
    digitPatternCache = new WeakMap();
  });

  [bgInput, fontInput, colonInput, cardInput, fontSelect, imageScale].forEach((input) => {
    input.addEventListener("input", updateProfileFromControls);
    input.addEventListener("change", updateProfileFromControls);
  });

  imageInput.addEventListener("change", () => handleImageUpload(imageInput.files[0]));
  createCode.addEventListener("input", () => {
    clearTimeout(createCode.runTimer);
    createCode.runTimer = setTimeout(runCreate, 260);
  });

  window.addEventListener("resize", resizeMainCanvas);
  window.addEventListener("keydown", (event) => {
    if (event.key === "Escape" && !saver.classList.contains("hidden")) returnHome();
  });
}

function init() {
  createCode.value = defaultCreateCode();
  buildGrid();
  initEvents();
  resizeMainCanvas();
  initThreeBackdrop();
  setSection("library");
  requestAnimationFrame(loop);
}

init();
