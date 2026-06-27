const fontFamilies = {
  rounded: '"Quicksand"',
  modern: '"Segoe UI"',
  mono: '"Arial Narrow"',
  condensed: '"Roboto Condensed"',
  serif: '"Georgia"',
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

// メインプロセスを介して物理設定ファイルから非同期で読み込む
async function loadSettings() {
  try {
    const saved = await window.electronAPI.loadSettings();
    if (saved) {
      if (typeof saved.selected === "number" && saved.selected >= 0 && saved.selected < clocks.length) {
        state.selected = saved.selected;
      }
      if (Array.isArray(saved.profiles)) {
        saved.profiles.forEach((profile, index) => {
          if (state.profiles[index] && profile) {
            state.profiles[index] = { ...state.profiles[index], ...profile };
          }
        });
      }
    }
  } catch (error) {
    console.error("Failed to load clock settings:", error);
  }
}

// メインプロセスを介して物理設定ファイルへ非同期で書き込む
async function saveSettings() {
  try {
    const dataToSave = {
      selected: state.selected,
      profiles: state.profiles,
    };
    await window.electronAPI.saveSettings(dataToSave);
  } catch (error) {
    console.error("Failed to save clock settings:", error);
  }
}

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
const renderErrors = new Set();

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

function executeRenderer(renderer, ctx, w, h, clock, profile, baseSize, sizeScale, now, options) {
  if (typeof renderer !== "function") throw new Error("Renderer is not a function");

  if (clock.renderer === "renderClock5") {
    renderer(ctx, w, h, profile.color, baseSize * sizeScale, now, options);
  } else {
    ctx.save();
    ctx.translate(w / 2, h / 2);
    ctx.scale(sizeScale, sizeScale);
    ctx.translate(-w / 2, -h / 2);
    renderer(ctx, w, h, profile.color, baseSize, now, options);
    ctx.restore();
  }
}

function renderClock(ctx, canvas, index, now) {
  const clock = clocks[index];
  const profile = state.profiles[index];
  const w = canvas.width;
  const h = canvas.height;
  
  ctx.imageSmoothingEnabled = false;
  fillPureBlack(ctx, w, h, profile.bgColor);

  const renderer = window[clock.renderer];
  const sizeScale = Number(profile.sizeScale) || 1;
  const baseSize = clock.size * window.devicePixelRatio;
  const options = buildRendererOptions(clock, profile);

  try {
    executeRenderer(renderer, ctx, w, h, clock, profile, baseSize, sizeScale, now, options);
  } catch (error) {
    if (!renderErrors.has(clock.renderer)) {
      console.error(`Failed to render ${clock.name}`, error);
      renderErrors.add(clock.renderer);
    }
    drawClockFallback(ctx, w, h, clock.name);
  }
}

function createClockCard(clock, index) {
  const card = document.createElement("button");
  card.className = "clock-card";
  card.type = "button";
  card.setAttribute("aria-label", `${clock.name} clock`);
  card.addEventListener("click", () => launchClock(index));

  const img = document.createElement("img");
  img.className = "clock-preview-image";
  img.src = clock.previewImage || ""; 
  img.alt = `${clock.name} preview`;
  img.style.width = "100%";
  img.style.height = "100%";
  img.style.objectFit = "contain";
  
  const shine = document.createElement("span");
  shine.className = "card-shine";
  card.append(img, shine);
  clockGrid.appendChild(card);

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
  saveSettings(); // 設定をファイルに保存
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
  
  if (sizeScaleInput) {
    sizeScaleInput.setAttribute("max", "10"); 
    sizeScaleInput.setAttribute("step", "0.05");
  }

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

function renderMain(now) {
  if (saver.classList.contains("hidden")) return;
  renderClock(mainCtx, mainCanvas, state.selected, now);
}

function loop() {
  const now = new Date();
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
  
  document.getElementById("apply-btn").addEventListener("click", async () => {
    await saveSettings();
    returnHome();
  });

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

async function init() {
  await loadSettings(); // 設定読み込みの完了を待機
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