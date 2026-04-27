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

  function drawCard(ctx, x, y, width, height, bgColor) {
    const radius = Math.floor(Math.min(width, height) * 0.12);
    drawRoundedRect(ctx, x, y, width, height, radius);

    const gradient = ctx.createLinearGradient(x, y, x, y + height);
    gradient.addColorStop(0, mixColor(bgColor, "#ffffff", 0.22));
    gradient.addColorStop(1, mixColor(bgColor, "#000000", 0.02));
    ctx.fillStyle = gradient;
    ctx.fill();
  }

  function drawReel(ctx, x, y, width, height, stripIndex, family, nowMs) {
    const max = DIGIT_MAX[stripIndex];
    const anim = state.anim[stripIndex];
    const displayValue = anim
      ? anim.from + anim.delta * easeOutCubic((nowMs - anim.startedAt) / anim.duration)
      : state.value[stripIndex];

    const rowHeight = height / (max * 2 + 1);
    const centerX = x + width / 2;
    const centerY = y + height / 2;

    ctx.save();
    drawRoundedRect(ctx, x, y, width, height, Math.floor(Math.min(width, height) * 0.12));
    ctx.clip();

    // Show all digits 0 to max
    for (let digit = 0; digit <= max; digit += 1) {
      const itemCenterY = centerY + (digit - displayValue) * rowHeight;

      ctx.fillStyle = "rgba(255,255,255,0.28)";
      ctx.font = `600 ${Math.floor(rowHeight * 0.72)}px ${family}`;
      ctx.textAlign = "center";
      ctx.textBaseline = "middle";
      ctx.fillText(String(digit), centerX, itemCenterY);
    }

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

    const gap = Math.max(12, Math.floor(Math.min(w, h) * 0.022));
    const cardWidth = Math.max(72, Math.floor(Math.min(w / 10.5, size * 0.46)));
    const rowHeight = Math.max(38, Math.floor(Math.min(w, h) * 0.068));
    const totalWidth = cardWidth * 6 + gap * 5;
    const startX = Math.round((w - totalWidth) / 2);
    const circleFill = "#d9dfe8";
    const cardFill = "#d9dfe8";

    for (let i = 0; i < 6; i += 1) {
      const reelRows = DIGIT_MAX[i] * 2 + 1;
      const cardHeight = rowHeight * reelRows + Math.floor(rowHeight * 0.5);
      const startY = Math.round((h - cardHeight) / 2);
      const circleRadius = Math.max(48, Math.floor(Math.min(cardWidth, cardHeight) * 0.40));
      const x = startX + i * (cardWidth + gap);
      drawCard(ctx, x, startY, cardWidth, cardHeight, cardFill);
      drawReel(ctx, x, startY, cardWidth, cardHeight, i, family, nowMs);

      ctx.save();
      ctx.shadowColor = "rgba(255,255,255,0.45)";
      ctx.shadowBlur = 12;
      ctx.fillStyle = circleFill;
      ctx.beginPath();
      ctx.arc(x + cardWidth / 2, startY + cardHeight / 2, circleRadius, 0, Math.PI * 2);
      ctx.fill();
      ctx.restore();

      ctx.save();
      ctx.fillStyle = fontColor;
      ctx.font = `600 ${Math.floor(rowHeight * 1.1)}px ${family}`;
      ctx.textAlign = "center";
      ctx.textBaseline = "middle";
      ctx.fillText(String(nextDigits[i]), x + cardWidth / 2, startY + cardHeight / 2 + 1);
      ctx.restore();
    }
  };
})(this);
