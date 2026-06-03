// ===== KARUMES PLATFORM - Premium Clock Experience =====

// DOM Elements
const threeBg = document.getElementById('three-bg');
const platformDashboard = document.getElementById('platform-dashboard');
const clocksView = document.getElementById('clocks-view');
const createView = document.getElementById('create-view');
const clockGrid = document.getElementById('clock-grid');
const settingsModal = document.getElementById('settings-modal');
const fullscreenClock = document.getElementById('fullscreen-clock');
const clockCanvas = document.getElementById('clockCanvas');
const ctx = clockCanvas.getContext('2d');

// Navigation
const navBtns = document.querySelectorAll('.nav-btn');

// Settings Modal Elements
const closeModalBtn = document.getElementById('close-modal-btn');
const cancelSettingsBtn = document.getElementById('cancel-settings-btn');
const applySettingsBtn = document.getElementById('apply-settings-btn');
const fontColorOptions = document.getElementById('font-color-options');
const bgColorOptions = document.getElementById('bg-color-options');
const fontCustomColor = document.getElementById('font-custom-color');
const bgCustomColor = document.getElementById('bg-custom-color');
const cardColorSection = document.getElementById('card-color-section');
const cardColorOptions = document.getElementById('card-color-options');
const cardCustomColor = document.getElementById('card-custom-color');

// Image upload elements
const imageUpload = document.getElementById('image-upload');
const uploadBtn = document.getElementById('upload-btn');
const imagePreviewContainer = document.getElementById('image-preview-container');
const uploadedImagePreview = document.getElementById('uploaded-image-preview');
const removeImageBtn = document.getElementById('remove-image-btn');
const imageControls = document.getElementById('image-controls');
const imageSizeSlider = document.getElementById('image-size');
const imageXSlider = document.getElementById('image-x');
const imageYSlider = document.getElementById('image-y');

// Exit fullscreen button
const exitFullscreenBtn = document.getElementById('exit-fullscreen-btn');

// Create mode elements
const codeEditor = document.getElementById('code-editor');
const runCodeBtn = document.getElementById('run-code-btn');
const createPreviewCanvas = document.getElementById('create-preview-canvas');

// ===== CLOCK CONFIGURATIONS =====
const CLOCK_CONFIG = [
  {
    id: 'binary',
    name: 'Binary',
    module: { globalName: 'renderClock5', src: 'clocks/clock1/binary.js' },
    drawSize: 100,
    showCardColor: false,
  },
  {
    id: 'rolling',
    name: 'Rolling',
    module: { globalName: 'renderClock6', src: 'clocks/clock2/rolling.js' },
    drawSize: 300,
    showCardColor: false,
  },
  {
    id: 'panel',
    name: 'Panel',
    module: { globalName: 'renderClock8', src: 'clocks/clock3/panel.js' },
    drawSize: 100,
    showCardColor: false,
  },
  {
    id: 'digital',
    name: 'Reel',
    module: { globalName: 'renderClock1', src: 'clocks/clock4/digital.js' },
    drawSize: 100,
    showCardColor: false,
  },
  {
    id: 'analog',
    name: 'Analog',
    module: { globalName: 'renderClock2', src: 'clocks/clock5/analog.js' },
    drawSize: 300,
    showCardColor: false,
  },
  {
    id: 'flip',
    name: 'Flip',
    module: { globalName: 'renderClock3', src: 'clocks/clock6/flip.js' },
    drawSize: 300,
    showCardColor: true,
  },
  {
    id: 'minimal',
    name: 'Minimal',
    module: { globalName: 'renderClock4', src: 'clocks/clock7/minimal-analog.js' },
    drawSize: 300,
    showCardColor: false,
  },
  {
    id: 'lumen',
    name: 'Lumen',
    module: { globalName: 'renderClockLumen', src: 'clocks/clock9/lumen.js' },
    drawSize: 100,
    showCardColor: false,
  },
  {
    id: 'grid',
    name: 'Grid',
    module: { globalName: 'renderClock7', src: 'clocks/clock8/grid.js' },
    drawSize: 100,
    showCardColor: false,
  },
];

// Color Palettes
const fontPalette = [
  '#ffffff', '#00e5ff', '#00ff88', '#b388ff', '#ff4081',
  '#2196f3', '#ffd600', '#ff7043', '#e91e63', '#8bc34a',
];

const bgPalette = [
  '#000000', '#0a0a0f', '#0d1117', '#1a1a2e', '#16213e',
  '#1e3a5f', '#0f172a', '#1f2937', '#111827', '#18181b',
];

const cardPalette = [
  'rgba(255,255,255,0.05)', 'rgba(255,255,255,0.1)', 'rgba(0,229,255,0.1)',
  'rgba(0,255,136,0.1)', 'rgba(179,136,255,0.1)', 'rgba(255,64,129,0.1)',
];

// State
let currentClockIndex = null;
let currentSettings = {
  fontColor: '#ffffff',
  bgColor: '#000000',
  cardColor: 'rgba(255,255,255,0.05)',
  uploadedImage: null,
  imageSize: 100,
  imageX: 50,
  imageY: 50,
};
let animationFrameId = null;
let previewAnimations = [];
const loadedScripts = new Map();

// ===== THREE.JS BACKGROUND =====
function initThreeBackground() {
  if (!window.THREE) return;
  
  const scene = new THREE.Scene();
  const camera = new THREE.PerspectiveCamera(75, window.innerWidth / window.innerHeight, 0.1, 1000);
  const renderer = new THREE.WebGLRenderer({ canvas: threeBg, alpha: true, antialias: true });
  
  renderer.setSize(window.innerWidth, window.innerHeight);
  renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
  
  // Create floating particles
  const particlesGeometry = new THREE.BufferGeometry();
  const particlesCount = 200;
  const positions = new Float32Array(particlesCount * 3);
  const colors = new Float32Array(particlesCount * 3);
  
  const neonColors = [
    { r: 0, g: 0.9, b: 1 },     // cyan
    { r: 0, g: 1, b: 0.53 },    // green
    { r: 0.7, g: 0.53, b: 1 },  // purple
  ];
  
  for (let i = 0; i < particlesCount * 3; i += 3) {
    positions[i] = (Math.random() - 0.5) * 20;
    positions[i + 1] = (Math.random() - 0.5) * 20;
    positions[i + 2] = (Math.random() - 0.5) * 20;
    
    const color = neonColors[Math.floor(Math.random() * neonColors.length)];
    colors[i] = color.r;
    colors[i + 1] = color.g;
    colors[i + 2] = color.b;
  }
  
  particlesGeometry.setAttribute('position', new THREE.BufferAttribute(positions, 3));
  particlesGeometry.setAttribute('color', new THREE.BufferAttribute(colors, 3));
  
  const particlesMaterial = new THREE.PointsMaterial({
    size: 0.05,
    vertexColors: true,
    transparent: true,
    opacity: 0.6,
    blending: THREE.AdditiveBlending,
  });
  
  const particles = new THREE.Points(particlesGeometry, particlesMaterial);
  scene.add(particles);
  
  // Add glowing ring
  const ringGeometry = new THREE.TorusGeometry(3, 0.02, 16, 100);
  const ringMaterial = new THREE.MeshBasicMaterial({ 
    color: 0x00e5ff,
    transparent: true,
    opacity: 0.3,
  });
  const ring = new THREE.Mesh(ringGeometry, ringMaterial);
  ring.rotation.x = Math.PI / 2;
  scene.add(ring);
  
  camera.position.z = 8;
  
  let mouseX = 0;
  let mouseY = 0;
  let targetX = 0;
  let targetY = 0;
  
  document.addEventListener('mousemove', (e) => {
    mouseX = (e.clientX / window.innerWidth) * 2 - 1;
    mouseY = -(e.clientY / window.innerHeight) * 2 + 1;
  });
  
  function animate() {
    requestAnimationFrame(animate);
    
    targetX += (mouseX - targetX) * 0.02;
    targetY += (mouseY - targetY) * 0.02;
    
    particles.rotation.y += 0.001;
    particles.rotation.x = targetY * 0.3;
    particles.rotation.z = targetX * 0.3;
    
    ring.rotation.z += 0.002;
    ring.position.x = targetX * 2;
    ring.position.y = targetY * 2;
    
    renderer.render(scene, camera);
  }
  
  animate();
  
  window.addEventListener('resize', () => {
    camera.aspect = window.innerWidth / window.innerHeight;
    camera.updateProjectionMatrix();
    renderer.setSize(window.innerWidth, window.innerHeight);
  });
}

// ===== CLOCK CARD GENERATION =====
function createClockCards() {
  clockGrid.innerHTML = '';
  
  CLOCK_CONFIG.forEach((clock, index) => {
    const card = document.createElement('div');
    card.className = 'clock-card';
    card.dataset.index = index;
    
    const canvas = document.createElement('canvas');
    canvas.className = 'clock-card-canvas';
    canvas.width = 640;
    canvas.height = 360;
    
    const overlay = document.createElement('div');
    overlay.className = 'clock-card-overlay';
    overlay.innerHTML = `
      <div class="clock-card-name">${clock.name}</div>
      <div class="clock-card-actions">
        <button class="card-action-btn primary" data-action="launch">Launch</button>
        <button class="card-action-btn secondary" data-action="settings">Settings</button>
      </div>
    `;
    
    card.appendChild(canvas);
    card.appendChild(overlay);
    clockGrid.appendChild(card);
    
    // Start preview animation
    startPreviewAnimation(canvas, index);
    
    // Event listeners
    card.querySelector('[data-action="launch"]').addEventListener('click', (e) => {
      e.stopPropagation();
      launchClock(index);
    });
    
    card.querySelector('[data-action="settings"]').addEventListener('click', (e) => {
      e.stopPropagation();
      openSettings(index);
    });
    
    card.addEventListener('click', () => {
      launchClock(index);
    });
  });
}

function startPreviewAnimation(canvas, clockIndex) {
  const ctx = canvas.getContext('2d');
  const clock = CLOCK_CONFIG[clockIndex];
  
  ensureClockScript(clockIndex);
  
  function render() {
    const renderer = window[clock.module.globalName];
    if (typeof renderer === 'function') {
      // Fill black background
      ctx.fillStyle = '#000000';
      ctx.fillRect(0, 0, canvas.width, canvas.height);
      
      const opts = {
        suppressBg: true,
        fontFamily: '"Inter", sans-serif',
        flipBackColor: 'transparent',
      };
      
      renderer(ctx, canvas.width, canvas.height, '#ffffff', clock.drawSize, new Date(), opts);
    } else {
      ctx.fillStyle = '#000000';
      ctx.fillRect(0, 0, canvas.width, canvas.height);
      ctx.fillStyle = 'rgba(255,255,255,0.2)';
      ctx.font = '24px Inter';
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.fillText('Loading...', canvas.width / 2, canvas.height / 2);
    }
    
    const frameId = requestAnimationFrame(render);
    previewAnimations[clockIndex] = frameId;
  }
  
  render();
}

function ensureClockScript(clockIndex) {
  const clock = CLOCK_CONFIG[clockIndex];
  if (!clock || typeof window[clock.module.globalName] === 'function' || loadedScripts.has(clockIndex)) return;
  
  const script = document.createElement('script');
  script.src = clock.module.src;
  loadedScripts.set(clockIndex, script);
  document.body.appendChild(script);
}

// ===== SETTINGS MODAL =====
function openSettings(clockIndex) {
  currentClockIndex = clockIndex;
  const clock = CLOCK_CONFIG[clockIndex];
  
  // Show/hide card color section based on clock type
  if (clock.showCardColor) {
    cardColorSection.classList.remove('hidden');
  } else {
    cardColorSection.classList.add('hidden');
  }
  
  renderColorPalette(fontColorOptions, fontPalette, currentSettings.fontColor, (color) => {
    currentSettings.fontColor = color;
    fontCustomColor.value = color;
    renderColorPalette(fontColorOptions, fontPalette, color, arguments.callee);
  });
  
  renderColorPalette(bgColorOptions, bgPalette, currentSettings.bgColor, (color) => {
    currentSettings.bgColor = color;
    bgCustomColor.value = color;
    renderColorPalette(bgColorOptions, bgPalette, color, arguments.callee);
  });
  
  if (clock.showCardColor) {
    renderColorPalette(cardColorOptions, cardPalette, currentSettings.cardColor, (color) => {
      currentSettings.cardColor = color;
      renderColorPalette(cardColorOptions, cardPalette, color, arguments.callee);
    });
  }
  
  settingsModal.classList.remove('hidden');
}

function renderColorPalette(container, colors, selectedColor, onClick) {
  container.innerHTML = '';
  colors.forEach((color) => {
    const swatch = document.createElement('button');
    swatch.className = 'color-swatch' + (selectedColor === color ? ' selected' : '');
    swatch.style.background = color;
    swatch.addEventListener('click', () => onClick(color));
    container.appendChild(swatch);
  });
}

function closeSettings() {
  settingsModal.classList.add('hidden');
  currentClockIndex = null;
}

// ===== FULLSCREEN CLOCK =====
function launchClock(clockIndex) {
  currentClockIndex = clockIndex;
  const clock = CLOCK_CONFIG[clockIndex];
  
  // Stop all preview animations
  previewAnimations.forEach((id) => cancelAnimationFrame(id));
  
  // Hide dashboard, show fullscreen
  platformDashboard.classList.add('hidden');
  fullscreenClock.classList.remove('hidden');
  
  // Resize canvas
  resizeCanvas();
  
  // Load script and start rendering
  ensureClockScript(clockIndex);
  startFullscreenRender();
}

function resizeCanvas() {
  clockCanvas.width = window.innerWidth;
  clockCanvas.height = window.innerHeight;
}

function startFullscreenRender() {
  const clock = CLOCK_CONFIG[currentClockIndex];
  
  function render() {
    const renderer = window[clock.module.globalName];
    
    // Draw background
    ctx.fillStyle = currentSettings.bgColor;
    ctx.fillRect(0, 0, clockCanvas.width, clockCanvas.height);
    
    // Draw uploaded image if exists
    if (currentSettings.uploadedImage) {
      const img = currentSettings.uploadedImage;
      const scale = currentSettings.imageSize / 100;
      const imgW = img.width * scale;
      const imgH = img.height * scale;
      const x = (clockCanvas.width * currentSettings.imageX / 100) - imgW / 2;
      const y = (clockCanvas.height * currentSettings.imageY / 100) - imgH / 2;
      ctx.drawImage(img, x, y, imgW, imgH);
    }
    
    if (typeof renderer === 'function') {
      const opts = {
        suppressBg: true,
        fontFamily: '"Inter", sans-serif',
        flipBackColor: currentSettings.cardColor,
        bg: currentSettings.bgColor,
      };
      
      renderer(ctx, clockCanvas.width, clockCanvas.height, currentSettings.fontColor, clock.drawSize, new Date(), opts);
    }
    
    animationFrameId = requestAnimationFrame(render);
  }
  
  render();
}

function exitFullscreen() {
  // Stop fullscreen animation
  if (animationFrameId) {
    cancelAnimationFrame(animationFrameId);
    animationFrameId = null;
  }
  
  // Show dashboard, hide fullscreen
  fullscreenClock.classList.add('hidden');
  platformDashboard.classList.remove('hidden');
  currentClockIndex = null;
  
  // Restart preview animations
  createClockCards();
}

// ===== CREATE MODE =====
function initCreateMode() {
  const previewCtx = createPreviewCanvas.getContext('2d');
  createPreviewCanvas.width = 640;
  createPreviewCanvas.height = 360;
  
  let customRenderFn = null;
  
  runCodeBtn.addEventListener('click', () => {
    try {
      // Create function from code
      const code = codeEditor.value;
      const fn = new Function('ctx', 'w', 'h', 'now', code + '\nrenderCustomClock(ctx, w, h, now);');
      customRenderFn = fn;
    } catch (e) {
      console.error('Code error:', e);
      alert('Error in code: ' + e.message);
    }
  });
  
  function renderCreatePreview() {
    previewCtx.fillStyle = '#000000';
    previewCtx.fillRect(0, 0, createPreviewCanvas.width, createPreviewCanvas.height);
    
    if (customRenderFn) {
      try {
        customRenderFn(previewCtx, createPreviewCanvas.width, createPreviewCanvas.height, new Date());
      } catch (e) {
        console.error('Render error:', e);
      }
    } else {
      // Default preview
      previewCtx.fillStyle = 'rgba(255,255,255,0.2)';
      previewCtx.font = '16px Inter';
      previewCtx.textAlign = 'center';
      previewCtx.textBaseline = 'middle';
      previewCtx.fillText('Click "Run" to preview your clock', createPreviewCanvas.width / 2, createPreviewCanvas.height / 2);
    }
    
    requestAnimationFrame(renderCreatePreview);
  }
  
  renderCreatePreview();
}

// ===== EVENT LISTENERS =====
function initEventListeners() {
  // Navigation
  navBtns.forEach((btn) => {
    btn.addEventListener('click', () => {
      navBtns.forEach((b) => b.classList.remove('active'));
      btn.classList.add('active');
      
      const view = btn.dataset.view;
      if (view === 'clocks') {
        clocksView.classList.remove('hidden');
        createView.classList.add('hidden');
      } else if (view === 'create') {
        clocksView.classList.add('hidden');
        createView.classList.remove('hidden');
      }
    });
  });
  
  // Settings modal
  closeModalBtn.addEventListener('click', closeSettings);
  cancelSettingsBtn.addEventListener('click', closeSettings);
  settingsModal.querySelector('.modal-backdrop').addEventListener('click', closeSettings);
  
  applySettingsBtn.addEventListener('click', () => {
    closeSettings();
    if (currentClockIndex !== null) {
      launchClock(currentClockIndex);
    }
  });
  
  // Custom color inputs
  fontCustomColor.addEventListener('input', (e) => {
    currentSettings.fontColor = e.target.value;
    renderColorPalette(fontColorOptions, fontPalette, e.target.value, () => {});
  });
  
  bgCustomColor.addEventListener('input', (e) => {
    currentSettings.bgColor = e.target.value;
    renderColorPalette(bgColorOptions, bgPalette, e.target.value, () => {});
  });
  
  // Image upload
  uploadBtn.addEventListener('click', () => imageUpload.click());
  
  imageUpload.addEventListener('change', (e) => {
    const file = e.target.files[0];
    if (file) {
      const reader = new FileReader();
      reader.onload = (event) => {
        const img = new Image();
        img.onload = () => {
          currentSettings.uploadedImage = img;
          uploadedImagePreview.src = event.target.result;
          imagePreviewContainer.classList.remove('hidden');
          imageControls.classList.remove('hidden');
        };
        img.src = event.target.result;
      };
      reader.readAsDataURL(file);
    }
  });
  
  removeImageBtn.addEventListener('click', () => {
    currentSettings.uploadedImage = null;
    imagePreviewContainer.classList.add('hidden');
    imageControls.classList.add('hidden');
    imageUpload.value = '';
  });
  
  imageSizeSlider.addEventListener('input', (e) => {
    currentSettings.imageSize = parseInt(e.target.value);
  });
  
  imageXSlider.addEventListener('input', (e) => {
    currentSettings.imageX = parseInt(e.target.value);
  });
  
  imageYSlider.addEventListener('input', (e) => {
    currentSettings.imageY = parseInt(e.target.value);
  });
  
  // Exit fullscreen
  exitFullscreenBtn.addEventListener('click', exitFullscreen);
  
  // Keyboard shortcuts
  document.addEventListener('keydown', (e) => {
    if (e.key === 'Escape') {
      if (!fullscreenClock.classList.contains('hidden')) {
        exitFullscreen();
      } else if (!settingsModal.classList.contains('hidden')) {
        closeSettings();
      }
    }
  });
  
  // Resize handler
  window.addEventListener('resize', () => {
    if (!fullscreenClock.classList.contains('hidden')) {
      resizeCanvas();
    }
  });
}

// ===== INITIALIZATION =====
function init() {
  initThreeBackground();
  createClockCards();
  initCreateMode();
  initEventListeners();
  
  // Load all clock scripts
  CLOCK_CONFIG.forEach((_, index) => ensureClockScript(index));
}

// Start app
document.addEventListener('DOMContentLoaded', init);
