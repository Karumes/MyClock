(function (global) {
  const COLS = 30;
  const ROWS = 18;
  const CELL_STATE = Array.from({ length: COLS * ROWS }, () => ({
    front: false,
    anim: null,
  }));

  function colorToRgb(color) {
    if (typeof color !== "string" || !color.startsWith("#")) {
      return { r: 255, g: 255, b: 255 };
    }
    const value = color.slice(1);
    const full = value.length === 3 ? value.split("").map((ch) => ch + ch).join("") : value;
    return {
      r: parseInt(full.slice(0, 2), 16),
      g: parseInt(full.slice(2, 4), 16),
      b: parseInt(full.slice(4, 6), 16),
    };
  }

  function mix(a, b, t) {
    return Math.round(a + (b - a) * t);
  }

  function mixColor(a, b, t) {
    const ca = colorToRgb(a);
    const cb = colorToRgb(b);
    return `rgb(${mix(ca.r, cb.r, t)}, ${mix(ca.g, cb.g, t)}, ${mix(ca.b, cb.b, t)})`;
  }

  function buildMask(text, family) {
    const maskCanvas = document.createElement("canvas");
    maskCanvas.width = COLS * 18;
    maskCanvas.height = ROWS * 18;
    const maskCtx = maskCanvas.getContext("2d");
    maskCtx.clearRect(0, 0, maskCanvas.width, maskCanvas.height);
    maskCtx.fillStyle = "#000";
    maskCtx.fillRect(0, 0, maskCanvas.width, maskCanvas.height);
    maskCtx.fillStyle = "#fff";
    maskCtx.textAlign = "center";
    maskCtx.textBaseline = "middle";

    let fontSize = Math.floor(maskCanvas.height * 0.58);
    maskCtx.font = `800 ${fontSize}px ${family}`;
    while (maskCtx.measureText(text).width > maskCanvas.width * 0.92 && fontSize > 20) {
      fontSize -= 2;
      maskCtx.font = `800 ${fontSize}px ${family}`;
    }
    maskCtx.fillText(text, maskCanvas.width / 2, maskCanvas.height / 2);

    const imageData = maskCtx.getImageData(0, 0, maskCanvas.width, maskCanvas.height).data;
    const mask = [];
    for (let row = 0; row < ROWS; row += 1) {
      for (let col = 0; col < COLS; col += 1) {
        const sampleX = Math.floor((col + 0.5) * (maskCanvas.width / COLS));
        const sampleY = Math.floor((row + 0.5) * (maskCanvas.height / ROWS));
        const base = (sampleY * maskCanvas.width + sampleX) * 4;
        const r = imageData[base];
        const g = imageData[base + 1];
        const b = imageData[base + 2];
        const luminance = 0.2126 * r + 0.7152 * g + 0.0722 * b;
        mask.push(luminance > 120);
      }
    }
    return mask;
  }

  function shade(color, amount) {
    return amount >= 0 ? mixColor(color, "#ffffff", amount) : mixColor(color, "#000000", -amount);
  }

  function drawSphere(ctx, x, y, radius, visibleColor, hiddenColor, progress) {
    const angle = progress * Math.PI;
    const faceColor = progress < 0.5 ? visibleColor : hiddenColor;
    const scaleX = Math.max(0.15, Math.abs(Math.cos(angle)));

    ctx.save();
    ctx.translate(x, y);
    ctx.scale(scaleX, 1);
    ctx.shadowColor = mixColor(faceColor, "#000000", 0.35);
    ctx.shadowBlur = radius * 0.75;

    const faceGradient = ctx.createRadialGradient(-radius * 0.3, -radius * 0.35, radius * 0.12, 0, 0, radius);
    faceGradient.addColorStop(0, shade(faceColor, 0.4));
    faceGradient.addColorStop(0.68, faceColor);
    faceGradient.addColorStop(1, shade(faceColor, -0.25));

    ctx.beginPath();
    ctx.arc(0, 0, radius, 0, Math.PI * 2);
    ctx.fillStyle = faceGradient;
    ctx.fill();

    const gloss = ctx.createRadialGradient(-radius * 0.35, -radius * 0.45, radius * 0.08, -radius * 0.2, -radius * 0.3, radius * 1.1);
    gloss.addColorStop(0, "rgba(255,255,255,0.36)");
    gloss.addColorStop(0.5, "rgba(255,255,255,0.08)");
    gloss.addColorStop(1, "rgba(255,255,255,0)");
    ctx.fillStyle = gloss;
    ctx.beginPath();
    ctx.arc(0, 0, radius, 0, Math.PI * 2);
    ctx.fill();

    ctx.shadowBlur = 0;
    ctx.lineWidth = Math.max(1.5, radius * 0.1);
    ctx.strokeStyle = mixColor(faceColor, "#000000", 0.2);
    ctx.beginPath();
    ctx.arc(0, 0, radius, 0, Math.PI * 2);
    ctx.stroke();
    ctx.restore();
  }

  global.renderClock1 = function renderClock1(ctx, w, h, paint, size, now, options) {
    now = now || new Date();
    options = options || {};

    const text = now.toLocaleTimeString("en-GB", { hour: "2-digit", minute: "2-digit" });
    const family = options.fontFamily || '"Avenir Next Rounded", "Nunito", sans-serif';
    const frontColor = typeof paint === "string" ? paint : "#ffffff";
    const backColor = options.flipBackColor || "#1e293b";
    const targetMask = buildMask(text, family);
    const timeNow = now.getTime();
    const animDuration = 460;

    for (let i = 0; i < CELL_STATE.length; i += 1) {
      const cell = CELL_STATE[i];
      if (cell.anim) {
        const progress = Math.min(1, (timeNow - cell.anim.startedAt) / animDuration);
        if (progress >= 1) {
          cell.front = cell.anim.to;
          cell.anim = null;
        }
      }
      if (!cell.anim && cell.front !== targetMask[i]) {
        cell.anim = {
          from: cell.front,
          to: targetMask[i],
          startedAt: timeNow,
        };
      }
    }

    const stepX = w / (COLS + 2);
    const stepY = h / (ROWS + 2);
    const radius = Math.min(stepX, stepY) * 0.42;
    const offsetX = (w - stepX * (COLS - 1)) / 2;
    const offsetY = (h - stepY * (ROWS - 1)) / 2;

    for (let row = 0; row < ROWS; row += 1) {
      for (let col = 0; col < COLS; col += 1) {
        const index = row * COLS + col;
        const cell = CELL_STATE[index];
        const x = offsetX + col * stepX;
        const y = offsetY + row * stepY;

        if (cell.anim) {
          const progress = Math.min(1, (timeNow - cell.anim.startedAt) / animDuration);
          const fromVisible = cell.anim.from ? frontColor : backColor;
          const toVisible = cell.anim.to ? frontColor : backColor;
          drawSphere(ctx, x, y, radius, fromVisible, toVisible, progress);
        } else {
          const visible = cell.front ? frontColor : backColor;
          const hidden = cell.front ? backColor : frontColor;
          drawSphere(ctx, x, y, radius, visible, hidden, 0);
        }
      }
    }
  };
})(this);
