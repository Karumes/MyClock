(function (global) {
  const DIGIT_MAX = [2, 9, 5, 9, 5, 9];
  const state = {
    value: [0, 0, 0, 0, 0, 0],
    anim: [null, null, null, null, null, null],
    initialized: false,
  };

  function clamp(value, min, max) {
    return Math.max(min, Math.min(max, value));
  }

  function mod(value, base) {
    return ((value % base) + base) % base;
  }

  function easeOutCubic(t) {
    return 1 - Math.pow(1 - clamp(t, 0, 1), 3);
  }

  function parseHexColor(color) {
    if (typeof color !== "string" || !color.startsWith("#")) return { r: 59, g: 95, b: 191 };
    const value = color.slice(1);
    const full = value.length === 3 ? value.split("").map((ch) => ch + ch).join("") : value;
    return {
      r: parseInt(full.slice(0, 2), 16),
      g: parseInt(full.slice(2, 4), 16),
      b: parseInt(full.slice(4, 6), 16),
    };
  }

  function mixColor(a, b, t) {
    const ca = parseHexColor(a);
    const cb = parseHexColor(b);
    const mix = (x, y) => Math.round(x + (y - x) * t);
    return `rgb(${mix(ca.r, cb.r)}, ${mix(ca.g, cb.g)}, ${mix(ca.b, cb.b)})`;
  }

  function paintToColor(ctx, paint) {
    try {
      ctx.fillStyle = paint;
      return paint;
    } catch (_) {
      return "#3b5fbf";
    }
  }

  function drawRoundedRect(ctx, x, y, width, height, radius) {
    const r = Math.min(radius, width / 2, height / 2);
    ctx.beginPath();
    ctx.moveTo(x + r, y);
    ctx.arcTo(x + width, y, x + width, y + height, r);
    ctx.arcTo(x + width, y + height, x, y + height, r);
    ctx.arcTo(x, y + height, x, y, r);
    ctx.arcTo(x, y, x + width, y, r);
    ctx.closePath();
  }

  function buildStrip(width, rowHeight, stripIndex, family, bgColor, fontColor, padding) {
    const max = DIGIT_MAX[stripIndex];
    const cycle = max + 1;
    const stripCanvas = document.createElement("canvas");
    stripCanvas.width = width;
    stripCanvas.height = Math.ceil(rowHeight * cycle + padding * 2);
    const stripCtx = stripCanvas.getContext("2d");

    const stripRadius = Math.floor(Math.min(width, stripCanvas.height) * 0.06);
    drawRoundedRect(stripCtx, 0, 0, width, stripCanvas.height, stripRadius);
    const stripGradient = stripCtx.createLinearGradient(0, 0, 0, stripCanvas.height);
    stripGradient.addColorStop(0, mixColor(bgColor, "#ffffff", 0.14));
    stripGradient.addColorStop(1, mixColor(bgColor, "#000000", 0.05));
    stripCtx.fillStyle = stripGradient;
    stripCtx.fill();

    stripCtx.fillStyle = fontColor;
    stripCtx.font = `600 ${Math.floor(rowHeight * 0.48)}px ${family}`;
    stripCtx.textAlign = "center";
    stripCtx.textBaseline = "middle";

    for (let digit = 0; digit <= max; digit += 1) {
      const rowCenterY = padding + digit * rowHeight + rowHeight / 2;
      stripCtx.fillText(String(digit), width / 2, rowCenterY);
    }

    return stripCanvas;
  }

  function drawRaisedStrip(ctx, image, x, y) {
    ctx.save();
    ctx.shadowColor = "rgba(255,255,255,0.88)";
    ctx.shadowBlur = 12;
    ctx.shadowOffsetX = -5;
    ctx.shadowOffsetY = -5;
    ctx.drawImage(image, x, y);
    ctx.restore();

    ctx.save();
    ctx.shadowColor = "rgba(41,53,72,0.22)";
    ctx.shadowBlur = 16;
    ctx.shadowOffsetX = 8;
    ctx.shadowOffsetY = 8;
    ctx.drawImage(image, x, y);
    ctx.restore();

    ctx.drawImage(image, x, y);
  }

  function drawReel(ctx, x, centerY, width, stripIndex, family, nowMs, bgColor, fontColor, rowHeight, padding) {
    const max = DIGIT_MAX[stripIndex];
    const anim = state.anim[stripIndex];
    const displayValue = anim
      ? anim.from + anim.delta * easeOutCubic((nowMs - anim.startedAt) / anim.duration)
      : state.value[stripIndex];
    const stripCanvas = buildStrip(Math.ceil(width), rowHeight, stripIndex, family, bgColor, fontColor, padding);
    const stripY = centerY - (padding + rowHeight / 2) - displayValue * rowHeight;
    drawRaisedStrip(ctx, stripCanvas, x, stripY);

    return {
      rowHeight,
      stripCanvas,
      stripY,
      displayValue,
      visibleDigit: clamp(Math.round(displayValue), 0, max),
    };
  }

  function drawCircleWindow(ctx, cx, cy, radius, circleFill, visibleDigit, family, fontColor, rowHeight) {
    ctx.save();
    ctx.shadowColor = "rgba(255,255,255,0.88)";
    ctx.shadowBlur = 14;
    ctx.shadowOffsetX = -5;
    ctx.shadowOffsetY = -5;
    ctx.fillStyle = circleFill;
    ctx.beginPath();
    ctx.arc(cx, cy, radius, 0, Math.PI * 2);
    ctx.fill();
    ctx.restore();

    ctx.save();
    ctx.shadowColor = "rgba(41,53,72,0.24)";
    ctx.shadowBlur = 18;
    ctx.shadowOffsetX = 8;
    ctx.shadowOffsetY = 8;
    ctx.fillStyle = circleFill;
    ctx.beginPath();
    ctx.arc(cx, cy, radius, 0, Math.PI * 2);
    ctx.fill();
    ctx.restore();

    ctx.save();
    const circleGradient = ctx.createRadialGradient(cx - radius * 0.24, cy - radius * 0.28, radius * 0.18, cx, cy, radius);
    circleGradient.addColorStop(0, mixColor(circleFill, "#ffffff", 0.22));
    circleGradient.addColorStop(1, mixColor(circleFill, "#000000", 0.04));
    ctx.fillStyle = circleGradient;
    ctx.beginPath();
    ctx.arc(cx, cy, radius, 0, Math.PI * 2);
    ctx.fill();
    ctx.restore();

    ctx.save();
    ctx.fillStyle = fontColor;
    ctx.font = `700 ${Math.floor(rowHeight * 1.02)}px ${family}`;
    ctx.textAlign = "center";
    ctx.textBaseline = "middle";
    ctx.fillText(String(visibleDigit), cx, cy + 1);
    ctx.restore();
  }

  function updateState(nextDigits, nowMs) {
    if (!state.initialized) {
      for (let i = 0; i < 6; i += 1) {
        state.value[i] = nextDigits[i];
      }
      state.initialized = true;
      return;
    }

    for (let i = 0; i < 6; i += 1) {
      const nextValue = nextDigits[i];
      const maxValue = DIGIT_MAX[i];
      if (!state.anim[i] && Math.round(state.value[i]) === maxValue && nextValue === 0) {
        state.value[i] = 0;
        state.anim[i] = null;
        continue;
      }
      if (!state.anim[i] && state.value[i] !== nextValue) {
        const delta = nextValue - state.value[i];
        state.anim[i] = {
          from: state.value[i],
          delta,
          startedAt: nowMs,
          duration: 520,
        };
      }

      const anim = state.anim[i];
      if (anim) {
        const t = clamp((nowMs - anim.startedAt) / anim.duration, 0, 1);
        state.value[i] = anim.from + anim.delta * easeOutCubic(t);
        if (t >= 1) {
          state.value[i] = nextDigits[i];
          state.anim[i] = null;
        }
      } else {
        state.value[i] = nextValue;
      }
    }
  }

  global.renderClock1 = function renderClock1(ctx, w, h, paint, size, now, options) {
    now = now || new Date();
    options = options || {};

    const bgColor = (options.bg && typeof options.bg === "string") ? options.bg : "#aeb8cc";
    const fontColor = paintToColor(ctx, paint);
    const family = options.fontFamily || '"Segoe UI", sans-serif';
    const nowMs = now.getTime();

    const nextDigits = [
      Math.floor(now.getHours() / 10),
      now.getHours() % 10,
      Math.floor(now.getMinutes() / 10),
      now.getMinutes() % 10,
      Math.floor(now.getSeconds() / 10),
      now.getSeconds() % 10,
    ];

    updateState(nextDigits, nowMs);

    ctx.clearRect(0, 0, w, h);
    const background = ctx.createLinearGradient(0, 0, 0, h);
    background.addColorStop(0, bgColor);
    background.addColorStop(1, mixColor(bgColor, "#000000", 0.08));
    ctx.fillStyle = background;
    ctx.fillRect(0, 0, w, h);

    const pairInnerGap = Math.max(8, Math.floor(Math.min(w, h) * 0.012));
    const pairOuterGap = Math.max(22, Math.floor(Math.min(w, h) * 0.03));
    const cardWidth = Math.max(72, Math.floor(Math.min(w / 10.5, size * 0.46)));
    const baseRowHeight = Math.max(30, Math.floor(Math.min(w, h) * 0.055));
    const totalWidth = cardWidth * 6 + pairInnerGap * 3 + pairOuterGap * 2;
    const startX = Math.round((w - totalWidth) / 2);
    const circleFill = "#d9dfe8";
    const cardFill = "#d9dfe8";
    const centerY = Math.round(h / 2);

    for (let i = 0; i < 6; i += 1) {
      const reelRows = DIGIT_MAX[i] + 1;
      const rowHeight = Math.min(baseRowHeight, Math.floor((h * 0.76) / (reelRows + 0.6)));
      const padding = Math.max(16, Math.floor(rowHeight * 0.5));
      const cardHeight = rowHeight * reelRows + padding * 2;
      const circleRadius = Math.max(48, Math.floor(Math.min(cardWidth, cardHeight) * 0.34));
      const groupIndex = Math.floor(i / 2);
      const inGroupIndex = i % 2;
      const x = startX
        + groupIndex * (cardWidth * 2 + pairInnerGap + pairOuterGap)
        + inGroupIndex * (cardWidth + pairInnerGap);
      const reel = drawReel(ctx, x, centerY, cardWidth, i, family, nowMs, cardFill, fontColor, rowHeight, padding);
      drawCircleWindow(
        ctx,
        x + cardWidth / 2,
        centerY,
        circleRadius,
        circleFill,
        reel.visibleDigit,
        family,
        fontColor,
        reel.rowHeight,
      );
    }
  };
})(this);
