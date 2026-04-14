const canvas = document.getElementById("clockCanvas");
const ctx = canvas.getContext("2d");

const settingsBtn = document.getElementById("settings-btn");
const settingsPanel = document.getElementById("settings-panel");
const stylePrevBtn = document.getElementById("clock-style-prev");
const styleNextBtn = document.getElementById("clock-style-next");
const styleLabel = document.getElementById("clock-style-label");
const colorOptionsDiv = document.getElementById("color-options");
const fontHalfSwatchBtn = document.getElementById("font-half-swatch");
const fontGradientControls = document.getElementById("font-gradient-controls");
const fontGradC1 = document.getElementById("font-grad-c1");
const fontGradC2 = document.getElementById("font-grad-c2");
const fontGradPattern = document.getElementById("font-grad-pattern");
const sizeMinusBtn = document.getElementById("size-minus");
const sizePlusBtn = document.getElementById("size-plus");
const sizeLabel = document.getElementById("size-label");
const applyBtn = document.getElementById("apply-btn");

const clockStyles = ["Clock 1", "Clock 2", "Clock 3", "Clock 4", "Clock 5", "Clock 6", "Clock 7", "Clock 8"];
const palette = [
  "#2196f3", "#ff4081", "#ff9800", "#ffffff", "#00ff88",
  "#ffd600", "#8e24aa", "#00bcd4", "#4caf50", "#e91e63",
  "#9e9d24", "#795548", "#607d8b", "#f06292", "#ff7043",
  "#c2185b", "#7c4dff", "#03a9f4", "#388e3c", "#ffeb3b",
  "#ad1457", "#00c853", "#b388ff", "#ff8a65", "#d500f9",
  "#263238", "#ff5252", "#ffab00", "#304ffe", "#69f0ae",
];

const clockModules = {
  0: { globalName: "renderClock1", src: "clocks/clock1/digital.js" },
  1: { globalName: "renderClock2", src: "clocks/clock2/analog.js" },
  2: { globalName: "renderClock3", src: "clocks/clock3/clock3.js" },
  3: { globalName: "renderClock4", src: "clocks/clock4/clock4.js" },
  4: { globalName: "renderClock5", src: "clocks/clock5/binary.js" },
  5: { globalName: "renderClock6", src: "clocks/clock6/clock6.js" },
  6: { globalName: "renderClock7", src: "clocks/clock7/clock7.js" },
  7: { globalName: "renderClock8", src: "clocks/clock8/clock8.js" },
};

let editingSettings = {
  styleIndex: 0,
  color: "#ffffff",
  size: 180,
  fontMode: "solid",
  fontGrad: ["#fff700", "#00e5ff", "vertical"],
  bgMode: "transparent",
  bgGrad: [],
  clock6Speed: 1,
};

let appliedSettings = cloneSettings(editingSettings);
let hideSettingsBtnTimeout = null;

const offscreenCanvas = document.createElement("canvas");
const offscreenCtx = offscreenCanvas.getContext("2d");
const loadedScripts = new Map();

function cloneSettings(settings) {
  return {
    ...settings,
    fontGrad: Array.isArray(settings.fontGrad) ? [...settings.fontGrad] : [],
    bgGrad: Array.isArray(settings.bgGrad) ? [...settings.bgGrad] : [],
  };
}

function syncGlobalSettings() {
  window.editingSettings = editingSettings;
  window.appliedSettings = appliedSettings;
}

function resizeCanvas() {
  canvas.width = window.innerWidth;
  canvas.height = window.innerHeight;
  offscreenCanvas.width = canvas.width;
  offscreenCanvas.height = canvas.height;
}

function isSettingsOpen() {
  return !settingsPanel.classList.contains("hidden");
}

function makeGradient(targetCtx, width, height, c1, c2, pattern) {
  if (pattern === "split") {
    const tmp = document.createElement("canvas");
    tmp.width = Math.max(1, width);
    tmp.height = Math.max(1, height);
    const tctx = tmp.getContext("2d");
    tctx.fillStyle = c1;
    tctx.fillRect(0, 0, Math.floor(width / 2), height);
    tctx.fillStyle = c2;
    tctx.fillRect(Math.floor(width / 2), 0, width - Math.floor(width / 2), height);
    return targetCtx.createPattern(tmp, "no-repeat");
  }

  if (!pattern || pattern === "vertical") {
    const gradient = targetCtx.createLinearGradient(0, 0, 0, height);
    gradient.addColorStop(0, c1);
    gradient.addColorStop(1, c2);
    return gradient;
  }

  if (pattern === "horizontal") {
    const gradient = targetCtx.createLinearGradient(0, 0, width, 0);
    gradient.addColorStop(0, c1);
    gradient.addColorStop(1, c2);
    return gradient;
  }

  if (pattern === "diag-tlbr") {
    const gradient = targetCtx.createLinearGradient(0, 0, width, height);
    gradient.addColorStop(0, c1);
    gradient.addColorStop(1, c2);
    return gradient;
  }

  if (pattern === "diag-bltr") {
    const gradient = targetCtx.createLinearGradient(0, height, width, 0);
    gradient.addColorStop(0, c1);
    gradient.addColorStop(1, c2);
    return gradient;
  }

  const radial = targetCtx.createRadialGradient(width / 2, height / 2, 1, width / 2, height / 2, Math.max(width, height));
  radial.addColorStop(0, c1);
  radial.addColorStop(1, c2);
  return radial;
}

function getFontPaint(targetCtx, settings, width, height) {
  if (settings.fontMode === "gradient" || settings.fontMode === "split") {
    const [c1, c2, pattern] = settings.fontGrad || [settings.color, "#ffffff", "vertical"];
    return makeGradient(targetCtx, width, height, c1, c2, pattern);
  }

  return settings.color;
}

function getClockOptions(settings) {
  const bg = settings.bgMode === "solid" ? settings.bgGrad?.[0] ?? null : null;
  const bgGradient = settings.bgMode === "gradient" || settings.bgMode === "split" ? settings.bgGrad : null;

  return {
    bg,
    bgGradient,
    clock6Speed: settings.clock6Speed,
    suppressBg: true,
  };
}

function getClockSize(styleIndex, size, width, height) {
  if (styleIndex === 1) {
    return Math.min(Math.floor(Math.min(width, height) * 0.94), Math.round(size * 2.6));
  }
  return size;
}

function ensureClockScript(styleIndex) {
  const module = clockModules[styleIndex];
  if (!module) return;
  if (typeof window[module.globalName] === "function") return;
  if (loadedScripts.has(styleIndex)) return;

  const script = document.createElement("script");
  script.src = module.src;
  loadedScripts.set(styleIndex, script);
  script.addEventListener("load", () => {
    renderCurrentFrame();
  });
  script.addEventListener("error", () => {
    console.error(`Failed to load ${module.src}`);
    loadedScripts.delete(styleIndex);
  });
  document.body.appendChild(script);
}

function renderClockTo(targetCtx, settings, now) {
  const module = clockModules[settings.styleIndex];
  if (!module) return;

  targetCtx.clearRect(0, 0, canvas.width, canvas.height);

  const renderer = window[module.globalName];
  if (typeof renderer !== "function") {
    ensureClockScript(settings.styleIndex);
    return;
  }

  const fontPaint = getFontPaint(targetCtx, settings, canvas.width, canvas.height);
  const drawSize = getClockSize(settings.styleIndex, settings.size, canvas.width, canvas.height);
  renderer(targetCtx, canvas.width, canvas.height, fontPaint, drawSize, now, getClockOptions(settings));
}

function renderCurrentFrame() {
  const activeSettings = isSettingsOpen() ? editingSettings : appliedSettings;
  renderClockTo(offscreenCtx, activeSettings, new Date());
  ctx.clearRect(0, 0, canvas.width, canvas.height);
  ctx.drawImage(offscreenCanvas, 0, 0);
}

function updateLabels() {
  styleLabel.textContent = clockStyles[editingSettings.styleIndex];
  sizeLabel.textContent = editingSettings.size;
}

function renderColorOptions() {
  colorOptionsDiv.innerHTML = "";

  palette.forEach((color) => {
    const swatch = document.createElement("button");
    swatch.type = "button";
    swatch.className = "color-circle";
    swatch.style.background = color;
    swatch.setAttribute("aria-label", `Choose ${color}`);
    swatch.classList.toggle("selected", editingSettings.fontMode === "solid" && editingSettings.color === color);
    swatch.addEventListener("click", () => {
      editingSettings.fontMode = "solid";
      editingSettings.color = color;
      syncGradientInputs();
      renderColorOptions();
      renderFontHalfSwatch();
      renderCurrentFrame();
    });
    colorOptionsDiv.appendChild(swatch);
  });
}

function renderFontHalfSwatch() {
  const previewCanvas = document.createElement("canvas");
  previewCanvas.width = 40;
  previewCanvas.height = 40;
  const previewCtx = previewCanvas.getContext("2d");
  const [c1, c2] = editingSettings.fontGrad || ["#C800FF", "#00EBE7"];

  previewCtx.beginPath();
  previewCtx.moveTo(20, 20);
  previewCtx.arc(20, 20, 18, Math.PI / 2, Math.PI * 1.5);
  previewCtx.closePath();
  previewCtx.fillStyle = c1;
  previewCtx.fill();

  previewCtx.beginPath();
  previewCtx.moveTo(20, 20);
  previewCtx.arc(20, 20, 18, Math.PI * 1.5, Math.PI / 2);
  previewCtx.closePath();
  previewCtx.fillStyle = c2;
  previewCtx.fill();

  fontHalfSwatchBtn.style.backgroundImage = `url(${previewCanvas.toDataURL()})`;
  fontHalfSwatchBtn.classList.toggle("selected", editingSettings.fontMode === "gradient");
}

function syncGradientInputs() {
  fontGradC1.value = editingSettings.fontGrad[0];
  fontGradC2.value = editingSettings.fontGrad[1];
  fontGradPattern.value = editingSettings.fontGrad[2];
  fontGradientControls.classList.toggle("hidden", editingSettings.fontMode !== "gradient");
}

function showSettingsButton() {
  settingsBtn.style.opacity = "1";
  settingsBtn.style.pointerEvents = "auto";
}

function hideSettingsButton() {
  settingsBtn.style.opacity = "0";
  settingsBtn.style.pointerEvents = "none";
}

function hideSettingsBtnAfterDelay() {
  clearTimeout(hideSettingsBtnTimeout);
  hideSettingsBtnTimeout = setTimeout(() => {
    if (!isSettingsOpen()) {
      hideSettingsButton();
    }
    hideSettingsBtnTimeout = null;
  }, 10000);
}

function openSettingsPanel() {
  clearTimeout(hideSettingsBtnTimeout);
  settingsPanel.classList.remove("hidden");
  showSettingsButton();
  renderCurrentFrame();
}

function closeSettingsPanel() {
  settingsPanel.classList.add("hidden");
  showSettingsButton();
  hideSettingsBtnAfterDelay();
  renderCurrentFrame();
}

function hasUnsavedChanges() {
  return JSON.stringify(editingSettings) !== JSON.stringify(appliedSettings);
}

function discardChanges() {
  editingSettings = cloneSettings(appliedSettings);
  syncGlobalSettings();
  updateLabels();
  syncGradientInputs();
  renderColorOptions();
  renderFontHalfSwatch();
}

function showWarning() {
  if (document.getElementById("warning-div")) return;

  const warning = document.createElement("div");
  warning.id = "warning-div";
  warning.innerHTML = `
    <p>Discard changes and go back?</p>
    <button id="discard-btn" type="button">Discard</button>
    <button id="stay-btn" type="button">Stay</button>
  `;
  settingsPanel.appendChild(warning);

  warning.querySelector("#discard-btn").addEventListener("click", () => {
    discardChanges();
    warning.remove();
    closeSettingsPanel();
  });

  warning.querySelector("#stay-btn").addEventListener("click", () => {
    warning.remove();
  });
}

function createBackButton() {
  const button = document.createElement("button");
  button.id = "back-btn";
  button.type = "button";
  button.textContent = "Back to Time";
  settingsPanel.appendChild(button);

  button.addEventListener("click", () => {
    if (hasUnsavedChanges()) {
      showWarning();
      return;
    }
    closeSettingsPanel();
  });
}

function applyChanges() {
  appliedSettings = cloneSettings(editingSettings);
  syncGlobalSettings();
  closeSettingsPanel();
}

function updateGradientSetting() {
  editingSettings.fontMode = "gradient";
  editingSettings.fontGrad = [
    fontGradC1.value,
    fontGradC2.value,
    fontGradPattern.value,
  ];
  renderColorOptions();
  renderFontHalfSwatch();
  renderCurrentFrame();
}

function initEvents() {
  window.addEventListener("resize", () => {
    resizeCanvas();
    renderCurrentFrame();
  });

  canvas.addEventListener("click", () => {
    if (isSettingsOpen()) return;

    if (settingsBtn.style.opacity === "1") {
      hideSettingsButton();
      clearTimeout(hideSettingsBtnTimeout);
      hideSettingsBtnTimeout = null;
      return;
    }

    showSettingsButton();
    hideSettingsBtnAfterDelay();
  });

  settingsPanel.addEventListener("click", (event) => {
    event.stopPropagation();
  });

  settingsBtn.addEventListener("click", (event) => {
    event.stopPropagation();
    openSettingsPanel();
  });

  stylePrevBtn.addEventListener("click", () => {
    editingSettings.styleIndex = (editingSettings.styleIndex - 1 + clockStyles.length) % clockStyles.length;
    updateLabels();
    ensureClockScript(editingSettings.styleIndex);
    renderCurrentFrame();
  });

  styleNextBtn.addEventListener("click", () => {
    editingSettings.styleIndex = (editingSettings.styleIndex + 1) % clockStyles.length;
    updateLabels();
    ensureClockScript(editingSettings.styleIndex);
    renderCurrentFrame();
  });

  sizeMinusBtn.addEventListener("click", () => {
    editingSettings.size = Math.max(100, editingSettings.size - 20);
    updateLabels();
    renderCurrentFrame();
  });

  sizePlusBtn.addEventListener("click", () => {
    editingSettings.size = Math.min(400, editingSettings.size + 20);
    updateLabels();
    renderCurrentFrame();
  });

  fontHalfSwatchBtn.addEventListener("click", () => {
    editingSettings.fontMode = "gradient";
    if (!editingSettings.fontGrad || editingSettings.fontGrad.length < 3) {
      editingSettings.fontGrad = [editingSettings.color || "#00ff88", "#ffffff", "vertical"];
    }
    syncGradientInputs();
    renderFontHalfSwatch();
    renderCurrentFrame();
    setTimeout(() => fontGradC1.focus(), 0);
  });

  [fontGradC1, fontGradC2, fontGradPattern].forEach((input) => {
    input.addEventListener("input", updateGradientSetting);
    input.addEventListener("change", updateGradientSetting);
  });

  applyBtn.addEventListener("click", applyChanges);
}

function loop() {
  renderCurrentFrame();
  requestAnimationFrame(loop);
}

function init() {
  resizeCanvas();
  syncGlobalSettings();
  updateLabels();
  syncGradientInputs();
  renderColorOptions();
  renderFontHalfSwatch();
  createBackButton();
  initEvents();
  ensureClockScript(appliedSettings.styleIndex);
  loop();
}

init();
