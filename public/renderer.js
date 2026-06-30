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

// Browser Native Compatibility Fallbacks (overriding secure Electron IPC safely)
const isBrowserEnv = typeof window.electronAPI === "undefined";
const webStorageKey = "karumes_clock_web_settings";

const browserAPI = {
  loadSettings: async () => {
    if (!isBrowserEnv) return window.electronAPI.loadSettings();
    try {
      const data = localStorage.getItem(webStorageKey);
      return data ? JSON.parse(data) : null;
    } catch (e) {
      console.warn("Storage write blocked inside browser sandbox.", e);
      return null;
    }
  },
  saveSettings: async (data) => {
    if (!isBrowserEnv) return window.electronAPI.saveSettings(data);
    try {
      localStorage.setItem(webStorageKey, JSON.stringify(data));
      return true;
    } catch (e) {
      return false;
    }
  },
  openExternal: (url) => {
    if (!isBrowserEnv) return window.electronAPI.openExternal(url);
    window.open(url, "_blank", "noopener,noreferrer");
  }
};

const state = {
  selected: 0,
  activeSelected: 0,
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

async function loadSettings() {
  try {
    const saved = await browserAPI.loadSettings();
    if (saved) {
      if (typeof saved.selected === "number" && saved.selected >= 0 && saved.selected < clocks.length) {
        state.selected = saved.selected;
        state.activeSelected = saved.selected;
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

async function saveSettings() {
  try {
    const dataToSave = {
      selected: state.activeSelected,
      profiles: state.profiles,
    };
    await browserAPI.saveSettings(dataToSave);
  } catch (error) {
    console.error("Failed to save clock settings:", error);
  }
}

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
  if (!clock) return;
  const profile = state.profiles[index];
  const w = canvas.width;
  const h = canvas.height;
  
  ctx.imageSmoothingEnabled = false;
  fillPureBlack(ctx, w, h, profile.bgColor);

  const renderer = window[clock.renderer];
  const sizeScale = Number(profile.sizeScale) || 1;
  
  const referenceHeight = 820;
  const baseSize = clock.size * (h / referenceHeight);

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
  card.addEventListener("click", () => launchClock(index, false));
  
  const img = document.createElement("img");
  img.className = "clock-preview-image";
  img.src = clock.previewImage || ""; 
  img.alt = `${clock.name} preview`;
  
  // Custom generated canvas element if visual preview is missing
  img.onerror = () => {
    img.style.display = 'none';
    const tempCanvas = document.createElement("canvas");
    tempCanvas.width = 320;
    tempCanvas.height = 180;
    const tCtx = tempCanvas.getContext("2d");
    renderClock(tCtx, tempCanvas, index, new Date());
    card.appendChild(tempCanvas);
  };

  card.appendChild(img);
  clockGrid.appendChild(card);
  if (revealObserver) revealObserver.observe(card);
  else requestAnimationFrame(() => card.classList.add("revealed"));
}

function buildGrid() {
  clockGrid.innerHTML = "";
  clocks.forEach(createClockCard);
  updateSelectionUI();
}

function updateSelectionUI() {
  document.querySelectorAll(".clock-card").forEach((card, index) => {
    card.classList.toggle("selected", index === state.activeSelected);
    card.setAttribute("aria-pressed", String(index === state.activeSelected));
  });
}

function launchClock(index, makeActive = false) {
  state.selected = index;
  if (makeActive) {
    state.activeSelected = index;
    saveSettings();
  }
  updateSelectionUI();
  document.body.style.overflow = "hidden"; // Block page scrolling when active
  saver.classList.remove("hidden");
  closeSettings();
  resizeMainCanvas();
  renderMain(new Date());
}

function returnHome() {
  saver.classList.add("hidden");
  settingsPanel.classList.add("hidden");
  document.body.style.overflow = ""; // Restore page scrolling
  updateSelectionUI();
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

const WEB3FORMS_ACCESS_KEY = "5f0c4abe-c128-4c14-9add-346edee2740c"; 

function initModals() {
  const authorWidget = document.getElementById("author-widget");
  const authorModal = document.getElementById("author-modal");
  const closeAuthorModal = document.getElementById("close-author-modal");

  const historyBtn = document.getElementById("history-btn");
  const historyModal = document.getElementById("history-modal");
  const closeHistoryModal = document.getElementById("close-history-modal");

  const feedbackBtn = document.getElementById("feedback-btn");
  const feedbackModal = document.getElementById("feedback-modal");
  const closeFeedbackModal = document.getElementById("close-feedback-modal");
  const feedbackForm = document.getElementById("feedback-form");
  const feedbackStatus = document.getElementById("feedback-status");
  const submitBtn = document.getElementById("submit-feedback-btn");

  const donateBtn = document.getElementById("donate-btn");
  const supportModal = document.getElementById("support-modal");
  const closeSupportModal = document.getElementById("close-support-modal");
  const paypalBtn = document.getElementById("paypal-donate-btn");
  const stripeBtn = document.getElementById("stripe-donate-btn");

  const downloadModal = document.getElementById("download-modal");
  const closeDownloadModal = document.getElementById("close-download-modal");

  const openModal = (modal) => {
    modal.classList.remove("hidden");
  };

  const closeModal = (modal) => {
    modal.classList.add("hidden");
  };

  if (donateBtn) {
    donateBtn.addEventListener("click", () => openModal(supportModal));
  }
  if (closeSupportModal) {
    closeSupportModal.addEventListener("click", () => closeModal(supportModal));
  }
  if (paypalBtn) {
    paypalBtn.addEventListener("click", () => {
      browserAPI.openExternal("https://www.paypal.com/ncp/payment/L5YJBZE3DX6DQ");
    });
  }
  if (stripeBtn) {
    stripeBtn.addEventListener("click", () => {
      browserAPI.openExternal("https://donate.stripe.com/14A14g1hD0lrdxzdycdUY02");
    });
  }

  // Bind Web Download Gateways
  document.querySelectorAll(".web-download-btn").forEach(btn => {
    btn.addEventListener("click", () => openModal(downloadModal));
  });
  if (closeDownloadModal) {
    closeDownloadModal.addEventListener("click", () => closeModal(downloadModal));
  }

  document.querySelectorAll(".system-dl-link").forEach(btn => {
    btn.addEventListener("click", (e) => {
      const platformType = e.currentTarget.dataset.platform;
      alert(`Preparing package for ${platformType}. The setup script will download directly. This is a mockup deployment endpoint.`);
      closeModal(downloadModal);
    });
  });

  authorWidget.addEventListener("click", () => openModal(authorModal));
  closeAuthorModal.addEventListener("click", () => closeModal(authorModal));

  historyBtn.addEventListener("click", () => openModal(historyModal));
  closeHistoryModal.addEventListener("click", () => closeModal(historyModal));

  feedbackBtn.addEventListener("click", () => {
    openModal(feedbackModal);
    feedbackStatus.textContent = "";
    feedbackForm.reset();
  });
  closeFeedbackModal.addEventListener("click", () => closeModal(feedbackModal));

  [authorModal, historyModal, feedbackModal, supportModal, downloadModal].forEach((modal) => {
    modal.addEventListener("click", (e) => {
      if (e.target === modal) {
        closeModal(modal);
      }
    });
  });

  feedbackForm.addEventListener("submit", async (e) => {
    e.preventDefault();
    submitBtn.disabled = true;
    feedbackStatus.textContent = "Sending message...";
    feedbackStatus.className = "feedback-status sending";

    const subject = document.getElementById("feedback-subject").value;
    const message = document.getElementById("feedback-message").value;

    const payload = {
      access_key: WEB3FORMS_ACCESS_KEY,
      subject: `[Karumes Web Feedback] ${subject}`,
      message: `Message:\n${message}`,
    };

    try {
      const response = await fetch("https://api.web3forms.com/submit", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Accept: "application/json",
        },
        body: JSON.stringify(payload),
      });

      const result = await response.json();
      if (response.status === 200 || result.success) { 
        feedbackStatus.textContent = "Thank you! Your feedback has been sent successfully.";
        feedbackStatus.className = "feedback-status success";
        feedbackForm.reset();
      } else {
        feedbackStatus.textContent = "Something went wrong. Please try again.";
        feedbackStatus.className = "feedback-status error";
      }
    } catch (error) {
      console.error("Error sending email:", error);
      feedbackStatus.textContent = "Network error. Please check your connection and try again.";
      feedbackStatus.className = "feedback-status error";
    } finally {
      submitBtn.disabled = false;
    }
  });
}

function initEvents() {
  launchBtn.addEventListener("click", () => launchClock(state.selected, true));
  dashboardSettingsBtn.addEventListener("click", () => {
    state.selected = state.activeSelected;
    openSettings();
  });
  document.getElementById("home-btn").addEventListener("click", returnHome);
  document.getElementById("settings-btn").addEventListener("click", openSettings);
  document.getElementById("close-settings").addEventListener("click", closeSettings);
  document.getElementById("apply-btn").addEventListener("click", async () => {
    state.activeSelected = state.selected;
    await saveSettings();
    returnHome();
  });
  [bgInput, fontInput, colonInput, cardInput, fontSelect, sizeScaleInput, fontSizeScaleInput, panelSizeScaleInput].forEach((input) => {
    input.addEventListener("input", updateProfileFromControls);
    input.addEventListener("change", updateProfileFromControls);
  });
  window.addEventListener("resize", resizeMainCanvas);
  window.addEventListener("keydown", (event) => {
    if (event.key === "Escape" && !saver.classList.contains("hidden")) returnHome();
  });

  initModals();
}

async function init() {
  await loadSettings();
  buildColorSwatches();
  buildGrid();
  initEvents();
  resizeMainCanvas();
  requestAnimationFrame(loop);
}

init();