const canvas = document.getElementById("clockCanvas");
const ctx = canvas.getContext("2d");

const settingsBtn = document.getElementById("settings-btn");
const settingsPanel = document.getElementById("settings-panel");
const stylePrevBtn = document.getElementById("clock-style-prev");
const styleNextBtn = document.getElementById("clock-style-next");
const styleLabel = document.getElementById("clock-style-label");
const fontColorGroup = document.getElementById("font-color-group");
const fontColorLabel = document.getElementById("font-color-label");
const colorOptionsDiv = document.getElementById("color-options");
const clock4CircleColorGroup = document.getElementById("clock4-circle-color-group");
const clock4CircleColorLabel = document.getElementById("clock4-circle-color-label");
const clock4CircleColorOptionsDiv = document.getElementById("clock4-circle-color-options");
const clock4CircleCustomColorInput = document.getElementById("clock4-circle-custom-color");
const clock1BackGroup = document.getElementById("clock1-back-group");
const clock1BackLabel = clock1BackGroup ? clock1BackGroup.querySelector("label") : null;
const clock1BackColorOptionsDiv = document.getElementById("clock1-back-color-options");
const clock1BackCustomColorInput = document.getElementById("clock1-back-custom-color");
const bgColorOptionsDiv = document.getElementById("bg-color-options");
const bgCustomColorInput = document.getElementById("bg-custom-color");
const bgHalfSwatchBtn = document.getElementById("bg-half-swatch");
const bgGradientControls = document.getElementById("bg-gradient-controls");
const bgGradC1 = document.getElementById("bg-grad-c1");
const bgGradC2 = document.getElementById("bg-grad-c2");
const bgGradPattern = document.getElementById("bg-grad-pattern");
const fontFamilyGroup = document.getElementById("font-family-group");
const fontFamilySelect = document.getElementById("font-family-select");
const fontHalfSwatchBtn = document.getElementById("font-half-swatch");
const fontCustomColorInput = document.getElementById("font-custom-color");
const fontGradientControls = document.getElementById("font-gradient-controls");
const fontGradC1 = document.getElementById("font-grad-c1");
const fontGradC2 = document.getElementById("font-grad-c2");
const fontGradPattern = document.getElementById("font-grad-pattern");
const applyBtn = document.getElementById("apply-btn");

const STYLE_CONFIG = [
  {
    name: "Clock 1",
    module: { globalName: "renderClock5", src: "clocks/clock1/binary.js" },
    capabilities: { showColor: true, colorLabel: "Font Color:", showFontGradient: false, showFontFamily: false, showBackColor: false, showBackground: true },
    drawSize: 100,
  },
  {
    name: "Clock 2",
    module: { globalName: "renderClock6", src: "clocks/clock2/rolling.js" },
    capabilities: { showColor: true, colorLabel: "Digit Color:", showFontGradient: true, showFontFamily: false, showBackColor: false, showBackground: true },
    drawSize: 300,
  },
  {
    name: "Clock 3",
    module: { globalName: "renderClock8", src: "clocks/clock3/panel.js" },
    capabilities: { showColor: true, colorLabel: "Font Color:", showFontGradient: true, showFontFamily: false, showBackColor: false, showBackground: true },
    drawSize: 100,
  },
  {
    name: "Clock 4",
    module: { globalName: "renderClock1", src: "clocks/clock4/digital.js" },
    capabilities: {
      showColor: true,
      colorLabel: "Card Digit Color:",
      showFontGradient: false,
      showFontFamily: false,
      showBackColor: false,
      showBackground: true,
      showClock4CircleColor: true,
      clock4CircleColorLabel: "Center Digit Color:",
    },
    drawSize: 100,
  },
  {
    name: "Clock 5",
    module: { globalName: "renderClock2", src: "clocks/clock5/analog.js" },
    capabilities: { showColor: true, colorLabel: "Accent Color:", showFontGradient: true, showFontFamily: false, showBackColor: false, showBackground: true },
    drawSize: 300,
  },
  {
    name: "Clock 6",
    module: { globalName: "renderClock3", src: "clocks/clock6/flip.js" },
    capabilities: { showColor: true, colorLabel: "Font Color:", showFontGradient: true, showFontFamily: true, showBackColor: true, backColorLabel: "Flipping Card Color:", showBackground: true },
    drawSize: 300,
  },
  {
    name: "Clock 7",
    module: { globalName: "renderClock4", src: "clocks/clock7/minimal-analog.js" },
    capabilities: { showColor: true, colorLabel: "Hand Color:", showFontGradient: true, showFontFamily: false, showBackColor: false, showBackground: true },
    drawSize: 300,
  },
  {
    name: "Clock 8",
    module: { globalName: "renderClock7", src: "clocks/clock8/grid.js" },
    capabilities: { showColor: true, colorLabel: "Font Color:", showFontGradient: true, showFontFamily: true, showBackColor: false, showBackground: true },
    drawSize: 100,
  },
];

const clockStyles = STYLE_CONFIG.map((style) => style.name);
const palette = [
  "#ffffff", "#e2e8f0", "#cbd5e1", "#94a3b8", "#64748b",
  "#1e293b", "#0f172a", "#2196f3", "#03a9f4", "#00bcd4",
  "#00e5ff", "#00ff88", "#4caf50", "#8bc34a", "#cddc39",
  "#ffd600", "#ff9800", "#ff7043", "#ff5252", "#e91e63",
  "#ff4081", "#c2185b", "#8e24aa", "#7c4dff", "#304ffe",
  "#795548", "#8d6e63", "#607d8b", "#69f0ae", "#b388ff",
];

const backgroundPalette = [
  "#ffffff", "#f4f1de", "#d9e8f5", "#bcd4e6", "#98c1d9",
  "#6c95b5", "#264653", "#2d3142", "#1b2336", "#101728",
  "#050816", "#0d3b66", "#144552", "#2a9d8f", "#588157",
  "#7f5539", "#9c6644", "#5f0f40", "#9a031e", "#3a86ff",
  "#8338ec", "#fb5607", "#ff006e", "#ffbe0b", "#adb5bd",
];

const fontFamilies = {
  rounded: '"Avenir Next Rounded", "Nunito", "M PLUS Rounded 1c", "Segoe UI", sans-serif',
  modern: '"SF Pro Display", "Inter", "Segoe UI", sans-serif',
  mono: '"JetBrains Mono", "SFMono-Regular", "Cascadia Code", monospace',
  condensed: '"Roboto Condensed", "Oswald", "Arial Narrow", sans-serif',
  serif: '"Cormorant Garamond", "Georgia", serif',
};

const clockModules = Object.fromEntries(STYLE_CONFIG.map((style, index) => [index, style.module]));
const styleCapabilities = Object.fromEntries(STYLE_CONFIG.map((style, index) => [index, style.capabilities]));

function getDrawSize(styleIndex) {
  return STYLE_CONFIG[styleIndex]?.drawSize ?? 100;
}

function defaultProfile(styleIndex = 0) {
  return {
    color: styleIndex === 0 ? "#2196f3" : "#ffffff",
    bgMode: "solid",
    bgColor: "#bcd4e6",
    bgGrad: ["#d9e8f5", "#98c1d9", "radial"],
    fontMode: "solid",
    fontGrad: ["#fff700", "#00e5ff", "vertical"],
    fontFamily: "rounded",
    clock6Speed: 1,
    flipBackColor: "#64748b",
    clock4CircleColor: "#2563eb",
  };
}

function createInitialState(styleIndex = 0) {
  return {
    styleIndex,
    profiles: clockStyles.map((_, index) => defaultProfile(index)),
  };
}

let editingState = createInitialState();
let appliedState = createInitialState();
let hideSettingsBtnTimeout = null;

const offscreenCanvas = document.createElement("canvas");
const offscreenCtx = offscreenCanvas.getContext("2d");
const clockLayerCanvas = document.createElement("canvas");
const clockLayerCtx = clockLayerCanvas.getContext("2d");
const loadedScripts = new Map();

function cloneProfile(profile) {
  return {
    ...profile,
    bgGrad: [...profile.bgGrad],
    fontGrad: [...profile.fontGrad],
  };
}

function cloneState(state) {
  return {
    styleIndex: state.styleIndex,
    profiles: state.profiles.map(cloneProfile),
  };
}

appliedState = cloneState(editingState);

function currentEditingProfile() {
  return editingState.profiles[editingState.styleIndex];
}

function currentAppliedProfile() {
  return appliedState.profiles[appliedState.styleIndex];
}

function syncGlobalSettings() {
  window.editingSettings = currentEditingProfile();
  window.appliedSettings = currentAppliedProfile();
  window.editingState = editingState;
  window.appliedState = appliedState;
}

function resizeCanvas() {
  canvas.width = window.innerWidth;
  canvas.height = window.innerHeight;
  offscreenCanvas.width = canvas.width;
  offscreenCanvas.height = canvas.height;
  clockLayerCanvas.width = canvas.width;
  clockLayerCanvas.height = canvas.height;
}

function isSettingsOpen() {
  return !settingsPanel.classList.contains("hidden");
}

function makeGradient(targetCtx, width, height, c1, c2, pattern) {
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
  const radial = targetCtx.createRadialGradient(width / 2, height / 2, 1, width / 2, height / 2, Math.max(width, height) * 0.7);
  radial.addColorStop(0, c1);
  radial.addColorStop(1, c2);
  return radial;
}

function fillBackground(targetCtx, profile, width, height) {
  targetCtx.clearRect(0, 0, width, height);
  if (profile.bgMode === "gradient") {
    const [c1, c2, pattern] = profile.bgGrad;
    targetCtx.fillStyle = makeGradient(targetCtx, width, height, c1, c2, pattern);
  } else {
    targetCtx.fillStyle = profile.bgColor;
  }
  targetCtx.fillRect(0, 0, width, height);
}

function getFontPaint(targetCtx, profile, width, height) {
  if (profile.fontMode === "gradient") {
    const [c1, c2, pattern] = profile.fontGrad;
    return makeGradient(targetCtx, width, height, c1, c2, pattern);
  }
  return profile.color;
}

function getClockOptions(profile) {
  return {
    bg: profile.bgMode === "gradient" ? profile.bgGrad[0] : profile.bgColor,
    bgMode: profile.bgMode,
    bgGrad: profile.bgGrad,
    color: profile.color,
    fontMode: profile.fontMode,
    fontGrad: profile.fontGrad,
    fontFamily: fontFamilies[profile.fontFamily] || fontFamilies.rounded,
    clock6Speed: profile.clock6Speed,
    flipBackColor: profile.flipBackColor,
    circleDigitColor: profile.clock4CircleColor,
    suppressBg: true,
  };
}

function ensureClockScript(styleIndex) {
  const module = clockModules[styleIndex];
  if (!module || typeof window[module.globalName] === "function" || loadedScripts.has(styleIndex)) return;
  const script = document.createElement("script");
  script.src = module.src;
  loadedScripts.set(styleIndex, script);
  script.addEventListener("load", renderCurrentFrame);
  script.addEventListener("error", () => loadedScripts.delete(styleIndex));
  document.body.appendChild(script);
}

function renderClockTo(targetCtx, styleIndex, profile, now) {
  const module = clockModules[styleIndex];
  if (!module) return;
  targetCtx.clearRect(0, 0, canvas.width, canvas.height);
  const renderer = window[module.globalName];
  if (typeof renderer !== "function") {
    ensureClockScript(styleIndex);
    return;
  }
  const paint = getFontPaint(targetCtx, profile, canvas.width, canvas.height);
  renderer(targetCtx, canvas.width, canvas.height, paint, getDrawSize(styleIndex), now, getClockOptions(profile));
}

function renderCurrentFrame() {
  const state = isSettingsOpen() ? editingState : appliedState;
  const profile = state.profiles[state.styleIndex];
  fillBackground(offscreenCtx, profile, canvas.width, canvas.height);
  renderClockTo(clockLayerCtx, state.styleIndex, profile, new Date());
  offscreenCtx.drawImage(clockLayerCanvas, 0, 0);
  ctx.clearRect(0, 0, canvas.width, canvas.height);
  ctx.drawImage(offscreenCanvas, 0, 0);
}

function renderHalfSwatch(button, grad, selected) {
  const previewCanvas = document.createElement("canvas");
  previewCanvas.width = 40;
  previewCanvas.height = 40;
  const previewCtx = previewCanvas.getContext("2d");
  previewCtx.beginPath();
  previewCtx.moveTo(20, 20);
  previewCtx.arc(20, 20, 18, Math.PI / 2, Math.PI * 1.5);
  previewCtx.closePath();
  previewCtx.fillStyle = grad[0];
  previewCtx.fill();
  previewCtx.beginPath();
  previewCtx.moveTo(20, 20);
  previewCtx.arc(20, 20, 18, Math.PI * 1.5, Math.PI / 2);
  previewCtx.closePath();
  previewCtx.fillStyle = grad[1];
  previewCtx.fill();
  button.style.backgroundImage = `url(${previewCanvas.toDataURL()})`;
  button.classList.toggle("selected", selected);
}

function renderPalette(container, colors, selectedColor, onClick) {
  container.innerHTML = "";
  colors.forEach((color) => {
    const swatch = document.createElement("button");
    swatch.type = "button";
    swatch.className = "color-circle";
    swatch.style.background = color;
    swatch.classList.toggle("selected", selectedColor === color);
    swatch.addEventListener("click", () => onClick(color));
    container.appendChild(swatch);
  });
}

function updateVisibleControls() {
  const caps = styleCapabilities[editingState.styleIndex] || styleCapabilities[0];
  fontColorGroup.classList.toggle("hidden", !caps.showColor);
  fontColorLabel.textContent = caps.colorLabel;
  if (clock4CircleColorGroup) {
    clock4CircleColorGroup.classList.toggle("hidden", !caps.showClock4CircleColor);
    if (caps.showClock4CircleColor) {
      clock4CircleColorLabel.textContent = caps.clock4CircleColorLabel || "Center Digit Color:";
    }
  }
  fontFamilyGroup.classList.toggle("hidden", !caps.showFontFamily);
  fontGradientControls.classList.toggle("hidden", !(caps.showFontGradient && currentEditingProfile().fontMode === "gradient"));
}

function updateLabels() {
  const profile = currentEditingProfile();
  styleLabel.textContent = clockStyles[editingState.styleIndex];
  fontFamilySelect.value = profile.fontFamily;
  fontCustomColorInput.value = profile.color;
  if (clock4CircleCustomColorInput) {
    clock4CircleCustomColorInput.value = profile.clock4CircleColor;
  }
  bgCustomColorInput.value = profile.bgColor;
  updateVisibleControls();
}

function renderFontOptions() {
  const profile = currentEditingProfile();
  renderPalette(colorOptionsDiv, palette, profile.fontMode === "solid" ? profile.color : "", (color) => {
    profile.fontMode = "solid";
    profile.color = color;
    fontCustomColorInput.value = color;
    syncGradientInputs();
    renderFontOptions();
    renderHalfSwatch(fontHalfSwatchBtn, profile.fontGrad, profile.fontMode === "gradient");
    renderCurrentFrame();
  });
}

function renderBackgroundOptions() {
  const profile = currentEditingProfile();
  renderPalette(bgColorOptionsDiv, backgroundPalette, profile.bgMode === "solid" ? profile.bgColor : "", (color) => {
    profile.bgMode = "solid";
    profile.bgColor = color;
    bgCustomColorInput.value = color;
    syncBackgroundGradientInputs();
    renderBackgroundOptions();
    renderHalfSwatch(bgHalfSwatchBtn, profile.bgGrad, profile.bgMode === "gradient");
    renderCurrentFrame();
  });
}

function renderClock4CircleOptions() {
  if (!clock4CircleColorOptionsDiv) return;
  const profile = currentEditingProfile();
  renderPalette(clock4CircleColorOptionsDiv, palette, profile.clock4CircleColor, (color) => {
    profile.clock4CircleColor = color;
    if (clock4CircleCustomColorInput) {
      clock4CircleCustomColorInput.value = color;
    }
    renderClock4CircleOptions();
    renderCurrentFrame();
  });
}

function syncGradientInputs() {
  const profile = currentEditingProfile();
  fontGradC1.value = profile.fontGrad[0];
  fontGradC2.value = profile.fontGrad[1];
  fontGradPattern.value = profile.fontGrad[2];
  updateVisibleControls();
}

function syncBackgroundGradientInputs() {
  const profile = currentEditingProfile();
  bgGradC1.value = profile.bgGrad[0];
  bgGradC2.value = profile.bgGrad[1];
  bgGradPattern.value = profile.bgGrad[2];
  bgGradientControls.classList.toggle("hidden", profile.bgMode !== "gradient");
}

function renderAllControls() {
  updateLabels();
  syncGradientInputs();
  syncBackgroundGradientInputs();
  renderFontOptions();
  renderClock4CircleOptions();
  renderBackgroundOptions();
  const profile = currentEditingProfile();
  renderHalfSwatch(fontHalfSwatchBtn, profile.fontGrad, profile.fontMode === "gradient");
  renderHalfSwatch(bgHalfSwatchBtn, profile.bgGrad, profile.bgMode === "gradient");
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
    if (!isSettingsOpen()) hideSettingsButton();
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
  return JSON.stringify(editingState) !== JSON.stringify(appliedState);
}

function discardChanges() {
  editingState = cloneState(appliedState);
  syncGlobalSettings();
  renderAllControls();
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
  warning.querySelector("#stay-btn").addEventListener("click", () => warning.remove());
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
  appliedState = cloneState(editingState);
  syncGlobalSettings();
  closeSettingsPanel();
}

function updateFontGradient() {
  const profile = currentEditingProfile();
  profile.fontMode = "gradient";
  profile.fontGrad = [fontGradC1.value, fontGradC2.value, fontGradPattern.value];
  renderFontOptions();
  renderHalfSwatch(fontHalfSwatchBtn, profile.fontGrad, true);
  renderCurrentFrame();
}

function updateBackgroundGradient() {
  const profile = currentEditingProfile();
  profile.bgMode = "gradient";
  profile.bgGrad = [bgGradC1.value, bgGradC2.value, bgGradPattern.value];
  renderBackgroundOptions();
  renderHalfSwatch(bgHalfSwatchBtn, profile.bgGrad, true);
  syncBackgroundGradientInputs();
  renderCurrentFrame();
}

function switchEditingStyle(direction) {
  editingState.styleIndex = (editingState.styleIndex + direction + clockStyles.length) % clockStyles.length;
  syncGlobalSettings();
  ensureClockScript(editingState.styleIndex);
  renderAllControls();
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

  settingsPanel.addEventListener("click", (event) => event.stopPropagation());
  settingsBtn.addEventListener("click", (event) => {
    event.stopPropagation();
    openSettingsPanel();
  });

  stylePrevBtn.addEventListener("click", () => switchEditingStyle(-1));
  styleNextBtn.addEventListener("click", () => switchEditingStyle(1));

  fontHalfSwatchBtn.addEventListener("click", () => {
    const profile = currentEditingProfile();
    profile.fontMode = "gradient";
    syncGradientInputs();
    renderFontOptions();
    renderHalfSwatch(fontHalfSwatchBtn, profile.fontGrad, true);
    renderCurrentFrame();
  });

  bgHalfSwatchBtn.addEventListener("click", () => {
    const profile = currentEditingProfile();
    profile.bgMode = "gradient";
    syncBackgroundGradientInputs();
    renderBackgroundOptions();
    renderHalfSwatch(bgHalfSwatchBtn, profile.bgGrad, true);
    renderCurrentFrame();
  });

  [fontGradC1, fontGradC2, fontGradPattern].forEach((input) => {
    input.addEventListener("input", updateFontGradient);
    input.addEventListener("change", updateFontGradient);
  });

  fontCustomColorInput.addEventListener("input", () => {
    const profile = currentEditingProfile();
    profile.fontMode = "solid";
    profile.color = fontCustomColorInput.value;
    renderFontOptions();
    renderHalfSwatch(fontHalfSwatchBtn, profile.fontGrad, false);
    syncGradientInputs();
    renderCurrentFrame();
  });

  if (clock4CircleCustomColorInput) {
    clock4CircleCustomColorInput.addEventListener("input", () => {
      const profile = currentEditingProfile();
      profile.clock4CircleColor = clock4CircleCustomColorInput.value;
      renderClock4CircleOptions();
      renderCurrentFrame();
    });
  }

  [bgGradC1, bgGradC2, bgGradPattern].forEach((input) => {
    input.addEventListener("input", updateBackgroundGradient);
    input.addEventListener("change", updateBackgroundGradient);
  });

  bgCustomColorInput.addEventListener("input", () => {
    const profile = currentEditingProfile();
    profile.bgMode = "solid";
    profile.bgColor = bgCustomColorInput.value;
    renderBackgroundOptions();
    renderHalfSwatch(bgHalfSwatchBtn, profile.bgGrad, false);
    syncBackgroundGradientInputs();
    renderCurrentFrame();
  });

  fontFamilySelect.addEventListener("change", () => {
    const caps = styleCapabilities[editingState.styleIndex] || styleCapabilities[0];
    if (!caps.showFontFamily) return;
    currentEditingProfile().fontFamily = fontFamilySelect.value;
    renderCurrentFrame();
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
  renderAllControls();
  createBackButton();
  initEvents();
  ensureClockScript(appliedState.styleIndex);
  loop();
}

init();
