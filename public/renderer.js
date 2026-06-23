const fontFamilies = {
  rounded: '"Arial Rounded MT Bold", "Nunito", "Avenir Next Rounded", "Segoe UI Rounded", "Segoe UI", sans-serif',
  modern: '"SF Pro Display", "Inter", "Segoe UI", sans-serif',
  mono: '"Cascadia Code", "JetBrains Mono", "SFMono-Regular", monospace',
  condensed: '"Roboto Condensed", "Oswald", "Arial Narrow", sans-serif',
  serif: '"Georgia", "Times New Roman", serif',
};

const colorPresets = {
  bg: ["#000000", "#05070a", "#101016", "#11140f", "#160f13"],
  primary: ["#ffffff", "#69f7ff", "#89ffbf", "#ffe66d", "#ff8f5f"],
  colon: ["#ffffff", "#69f7ff", "#ff4fd8", "#89ffbf", "#ffe66d"],
  card: ["#000000", "#11151c", "#d9dfe8", "#f1eadf", "#6f7785"],
};

const clocks = window.KARUMES_CLOCKS || [];
const launchParams = new URLSearchParams(window.location.search);
const isClockMode = launchParams.get("mode") === "clock";
const state = {
  section: "library",
  selected: 0,
  pointerStart: null,
  profiles: clocks.map((clock) => ({
    bgColor: clock.defaultBg || "#000000",
    color: clock.defaultAccent || "#ffffff",
    colonColor: clock.defaultColon || "#ffffff",
    cardColor: clock.defaultSurface || "#d9dfe8",
    fontFamily: clock.defaultFont || "rounded",
    sizeScale: clock.defaultSizeScale || 1,
    fontSizeScale: clock.defaultFontSizeScale || 1,
    panelSizeScale: 1,
  })),
};

const platform = document.getElementById("platform");
const librarySection = document.getElementById("library-section");
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
const sizeScaleInput = document.getElementById("clock-size-scale");
const fontSizeScaleInput = document.getElementById("text-size-scale");
const panelSizeScaleInput = document.getElementById("panel-size-scale");
const launchBtn = document.getElementById("launch-btn");
const dashboardSettingsBtn = document.getElementById("dashboard-settings-btn");
const previewCanvases = [];
const renderErrors = new Set();
let previewOffscreenCanvas = null;

const revealObserver = "IntersectionObserver" in window
  ? new IntersectionObserver((entries) => {
      entries.forEach((entry) => {
        if (entry.isIntersecting) entry.target.classList.add("revealed");
      });
    }, { threshold: 0.16 })
  : null;

function fillPureBlack(ctx, w, h, color) {
  ctx.clearRect(0, 0, w, h);
  ctx.fillStyle = color || "#000000";
  ctx.fillRect(0, 0, w, h);
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

function resizeCanvasToDisplaySize(canvas) {
  const rect = canvas.getBoundingClientRect();
  const width = Math.max(2, Math.floor(rect.width * window.devicePixelRatio));
  const height = Math.max(2, Math.floor(rect.height * window.devicePixelRatio));
  if (canvas.width !== width || canvas.height !== height) {
    canvas.width = width;
    canvas.height = height;
  }
}

function getClockControls(index) {
  return new Set(clocks[index]?.controls || []);
}

function buildRendererOptions(clock, profile) {
  const options = {
    suppressBg: true,
    bg: profile.bgColor,
    color: profile.color,
    colonColor: profile.colonColor,
    circleDigitColor: profile.colonColor,
    cardColor: profile.cardColor,
    fontFamily: fontFamilies[profile.fontFamily] || fontFamilies.rounded,
    sizeScale: profile.sizeScale,
    fontSizeScale: profile.fontSizeScale,
    panelSizeScale: profile.panelSizeScale,
    clock6Speed: 0.42,
    fontMode: "solid",
  };

  const optionMap = clock.optionMap || {};
  Object.entries(optionMap).forEach(([profileKey, optionKey]) => {
    if (profileKey === "card") options[optionKey] = profile.cardColor;
    if (profileKey === "colon") options[optionKey] = profile.colonColor;
  });

  return options;
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
  const sizeScale = Number(profile.sizeScale) || 1;
  const baseSize = clock.size * window.devicePixelRatio;
  const options = buildRendererOptions(clock, profile);

  const drawRenderer = (targetCtx, renderSize) => {
    if (typeof renderer === "function") {
      try {
        renderer(targetCtx, w, h, profile.color, renderSize, now, options);
      } catch (error) {
        if (!renderErrors.has(clock.renderer)) {
          console.error(`Failed to render ${clock.name}`, error);
          renderErrors.add(clock.renderer);
        }
        drawClockFallback(targetCtx, w, h, clock.name);
      }
      return;
    }

    if (!renderErrors.has(clock.renderer)) {
      console.error(`Missing renderer: ${clock.renderer}`);
      renderErrors.add(clock.renderer);
    }
    drawClockFallback(targetCtx, w, h, clock.name);
  };

  if (clock.centerZoom) {
    lctx.save();
    lctx.translate(w / 2, h / 2);
    lctx.scale(sizeScale, sizeScale);
    lctx.translate(-w / 2, -h / 2);
    drawRenderer(lctx, baseSize);
    lctx.restore();
  } else if (sizeScale < 1) {
    lctx.save();
    lctx.translate(w / 2, h / 2);
    lctx.scale(sizeScale, sizeScale);
    lctx.translate(-w / 2, -h / 2);
    drawRenderer(lctx, baseSize);
    lctx.restore();
  } else {
    drawRenderer(lctx, baseSize * sizeScale);
  }

  ctx.drawImage(layer, 0, 0);
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
  updateSelectionUI();
}

function updateSelectionUI() {
  document.querySelectorAll(".clock-card").forEach((card, index) => {
    card.classList.toggle("selected", index === state.selected);
    card.setAttribute("aria-pressed", String(index === state.selected));
  });
}

function setSection(section) {
  state.section = section;
  librarySection.classList.toggle("active", section === "library");
}

function launchClock(index) {
  state.selected = index;
  updateSelectionUI();
  platform.classList.add("hidden");
  saver.classList.remove("hidden");
  closeSettings();
  resizeMainCanvas();
  renderMain(new Date());
}

function returnHome() {
  if (isClockMode) return;
  saver.classList.add("hidden");
  settingsPanel.classList.add("hidden");
  platform.classList.remove("hidden");
}

function setColorInput(input, value) {
  input.value = value;
  input.dispatchEvent(new Event("input", { bubbles: true }));
}

function syncSwatchState() {
  const map = {
    bg: bgInput.value,
    primary: fontInput.value,
    colon: colonInput.value,
    card: cardInput.value,
  };

  Object.entries(map).forEach(([key, value]) => {
    document.querySelectorAll(`[data-swatches="${key}"] .color-swatch`).forEach((button) => {
      button.classList.toggle("active", button.dataset.color === value);
    });
  });
}

function buildColorSwatches() {
  Object.entries(colorPresets).forEach(([key, colors]) => {
    const wrap = document.querySelector(`[data-swatches="${key}"]`);
    if (!wrap) return;
    wrap.innerHTML = "";
    colors.forEach((color) => {
      const button = document.createElement("button");
      button.type = "button";
      button.className = "color-swatch";
      button.dataset.color = color;
      button.style.setProperty("--swatch", color);
      button.setAttribute("aria-label", `${key} ${color}`);
      button.addEventListener("click", () => {
        const input = document.getElementById(wrap.closest("[data-color-target]").dataset.colorTarget);
        wrap.closest(".settings-color").querySelector(".custom-color-panel").classList.remove("open");
        setColorInput(input, color);
        syncSwatchState();
      });
      wrap.appendChild(button);
    });

    const custom = document.createElement("button");
    custom.type = "button";
    custom.className = "color-swatch custom";
    custom.setAttribute("aria-label", `Custom ${key} color`);
    custom.addEventListener("click", () => {
      wrap.closest(".settings-color").querySelector(".custom-color-panel").classList.toggle("open");
    });
    wrap.appendChild(custom);
  });
}

function openSettings() {
  const clock = clocks[state.selected];
  const profile = state.profiles[state.selected];
  const controls = getClockControls(state.selected);

  settingsTitle.textContent = clock.name;
  bgInput.value = profile.bgColor;
  fontInput.value = profile.color;
  colonInput.value = profile.colonColor;
  cardInput.value = profile.cardColor;
  fontSelect.value = profile.fontFamily;
  sizeScaleInput.value = profile.sizeScale;
  fontSizeScaleInput.value = profile.fontSizeScale;
  panelSizeScaleInput.value = profile.panelSizeScale;

  document.querySelectorAll("[data-setting]").forEach((row) => {
    const visible = controls.has(row.dataset.setting);
    row.classList.toggle("hidden-setting", !visible);
  });
  syncSwatchState();
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
  profile.cardColor = cardInput.value;
  profile.fontFamily = fontSelect.value;
  profile.sizeScale = Number(sizeScaleInput.value);
  profile.fontSizeScale = Number(fontSizeScaleInput.value);
  profile.panelSizeScale = Number(panelSizeScaleInput.value);
  syncSwatchState();
}

function resizeMainCanvas() {
  mainCanvas.width = Math.floor(window.innerWidth * window.devicePixelRatio);
  mainCanvas.height = Math.floor(window.innerHeight * window.devicePixelRatio);
}

function renderPreviews(now) {
  if (platform.classList.contains("hidden")) return;
  previewCanvases.forEach((canvas, index) => {
    resizeCanvasToDisplaySize(canvas);
    const ctx = canvas.getContext("2d");
    renderScaledScreenPreview(ctx, canvas, index, now);
  });
}

function renderScaledScreenPreview(ctx, canvas, index, now) {
  // 1. 実際に時計を起動したとき（mainCanvas）と1ピクセル単位で同じ解像度を取得します
  const screenW = mainCanvas.width;
  const screenH = mainCanvas.height;

  // 2. 毎フレームのキャンバス新規作成を避け、既存のオフスクリーンキャンバスを再利用します
  if (!previewOffscreenCanvas) {
    previewOffscreenCanvas = document.createElement("canvas");
  }
  if (previewOffscreenCanvas.width !== screenW || previewOffscreenCanvas.height !== screenH) {
    previewOffscreenCanvas.width = screenW;
    previewOffscreenCanvas.height = screenH;
  }

  // 3. 起動時と全く同じサイズで時計を描画します（これで見た目の比率が揃います）
  renderClock(previewOffscreenCanvas.getContext("2d"), previewOffscreenCanvas, index, now);

  // 4. プレビュー用キャンバスの背景を塗りつぶします
  fillPureBlack(ctx, canvas.width, canvas.height, state.profiles[index].bgColor);

  // 5. アスペクト比を保ったまま、プレビュー用キャンバスにきれいに収まるように縮小描画します
  const scale = Math.min(canvas.width / screenW, canvas.height / screenH);
  const drawW = Math.floor(screenW * scale);
  const drawH = Math.floor(screenH * scale);
  const x = Math.floor((canvas.width - drawW) / 2);
  const y = Math.floor((canvas.height - drawH) / 2);
  
  ctx.drawImage(previewOffscreenCanvas, x, y, drawW, drawH);
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

function requestCloseApp() {
  if (window.electronAPI && typeof window.electronAPI.closeApp === "function") {
    window.electronAPI.closeApp();
  }
}

function handleClockModeMouseMove(event) {
  if (!isClockMode) return;
  if (!state.pointerStart) {
    state.pointerStart = { x: event.screenX, y: event.screenY };
    return;
  }
  if (Math.hypot(event.screenX - state.pointerStart.x, event.screenY - state.pointerStart.y) >= 5) {
    requestCloseApp();
  }
}

function initEvents() {
  document.getElementById("brand-btn").addEventListener("click", () => setSection("library"));
  launchBtn.addEventListener("click", () => launchClock(state.selected));
  dashboardSettingsBtn.addEventListener("click", openSettings);
  document.getElementById("home-btn").addEventListener("click", returnHome);
  document.getElementById("settings-btn").addEventListener("click", openSettings);
  document.getElementById("close-settings").addEventListener("click", closeSettings);
  document.getElementById("apply-btn").addEventListener("click", () => launchClock(state.selected));

  [bgInput, fontInput, colonInput, cardInput, fontSelect, sizeScaleInput, fontSizeScaleInput, panelSizeScaleInput].forEach((input) => {
    input.addEventListener("input", updateProfileFromControls);
    input.addEventListener("change", updateProfileFromControls);
  });

  window.addEventListener("mousemove", handleClockModeMouseMove, { passive: true });
  window.addEventListener("mousedown", () => { if (isClockMode) requestCloseApp(); });
  window.addEventListener("keydown", () => { if (isClockMode) requestCloseApp(); });

  window.addEventListener("resize", resizeMainCanvas);
  window.addEventListener("keydown", (event) => {
    if (!isClockMode && event.key === "Escape" && !saver.classList.contains("hidden")) returnHome();
  });
}

function init() {
  buildColorSwatches();
  buildGrid();
  initEvents();
  resizeMainCanvas();
  setSection("library");
  if (isClockMode) {
    document.body.classList.add("clock-mode");
    launchClock(state.selected);
  }
  requestAnimationFrame(loop);
}

init();
