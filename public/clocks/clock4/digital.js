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

  function easeOutCubic(t) {
    return 1 - Math.pow(1 - clamp(t, 0, 1), 3);
  }

  function easeInOutSine(t) {
    return -(Math.cos(Math.PI * clamp(t, 0, 1)) - 1) / 2;
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

  function getReelMetrics(w, h, size, stripIndex) {
    const maxValue = DIGIT_MAX[stripIndex];
    const edgeInset = 4;
    const minEdgePadding = 2;
    const digitGap = Math.max(64, Math.floor(Math.min(w, h) * 0.08));
    const pairGap = Math.max(18, Math.floor(digitGap * 0.67));
    const cardWidth = Math.max(54, Math.floor(size * 0.55));
    const circleRadius = Math.max(48, Math.floor(cardWidth * 0.75));
    const maxRowByHeight = Math.floor((h * 0.9) / (maxValue + 0.35));
    const maxRowByCircle = Math.floor((circleRadius - edgeInset - minEdgePadding) * 3.05);
    const rowHeight = Math.max(42, Math.min(maxRowByHeight, maxRowByCircle));
    const maxVisibleEdge = Math.max(0, circleRadius - Math.floor(rowHeight / 2) - edgeInset);
    const desiredEdgePadding = Math.max(minEdgePadding, Math.floor(rowHeight * 0.03));
    const topPadding = Math.min(maxVisibleEdge, desiredEdgePadding);
    const bottomPadding = Math.min(maxVisibleEdge, desiredEdgePadding);

    return {
      digitGap,
      pairGap,
      cardWidth,
      circleRadius,
      rowHeight,
      topPadding,
      bottomPadding,
    };
  }

  function buildStrip(width, rowHeight, stripIndex, family, bgColor, cardDigitColor, topPadding, bottomPadding, digitFontSize) {
    const max = DIGIT_MAX[stripIndex];
    const cycle = max + 1;
    const stripCanvas = document.createElement("canvas");
    stripCanvas.width = width;
    stripCanvas.height = Math.ceil(rowHeight * cycle + topPadding + bottomPadding);
    const stripCtx = stripCanvas.getContext("2d");

    const stripRadius = Math.floor(Math.min(width, stripCanvas.height) * 0.2);
    drawRoundedRect(stripCtx, 0, 0, width, stripCanvas.height, stripRadius);
    const stripGradient = stripCtx.createLinearGradient(0, 0, 0, stripCanvas.height);
    stripGradient.addColorStop(0, mixColor(bgColor, "#ffffff", 0.18));
    stripGradient.addColorStop(1, mixColor(bgColor, "#000000", 0.06));
    stripCtx.fillStyle = stripGradient;
    stripCtx.fill();

    stripCtx.fillStyle = cardDigitColor;
    const fontSize = digitFontSize || Math.floor(rowHeight * 0.9);
    stripCtx.font = `400 ${fontSize}px ${family}`;
    stripCtx.textAlign = "center";
    stripCtx.textBaseline = "middle";

    for (let digit = 0; digit <= max; digit += 1) {
      const rowCenterY = topPadding + digit * rowHeight + rowHeight / 2;
      stripCtx.fillText(String(digit), width / 2, rowCenterY);
    }

    return stripCanvas;
  }

  function drawRaisedStrip(ctx, image, x, y) {
    ctx.save();
    ctx.shadowColor = "rgba(41,53,72,0.22)";
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

  function drawReel(ctx, x, centerY, width, stripIndex, family, digitFontSize, nowMs, bgColor, cardDigitColor, rowHeight, topPadding, bottomPadding) {
    const max = DIGIT_MAX[stripIndex];
    const anim = state.anim[stripIndex];
    const displayValue = anim
      ? anim.from + anim.delta * easeOutCubic((nowMs - anim.startedAt) / anim.duration)
      : state.value[stripIndex];
    const stripCanvas = buildStrip(
      Math.ceil(width),
      rowHeight,
      stripIndex,
      family,
      bgColor,
      cardDigitColor,
      topPadding,
      bottomPadding,
      digitFontSize,
    );
    const stripY = centerY - (topPadding + rowHeight / 2) - displayValue * rowHeight;
    drawRaisedStrip(ctx, stripCanvas, x, stripY);

    const progress = anim ? easeOutCubic((nowMs - anim.startedAt) / anim.duration) : 0;
    return {
      rowHeight,
      stripCanvas,
      stripY,
      displayValue,
      progress,
      visibleDigit: anim && anim.wrap ? max : clamp(Math.round(displayValue), 0, max),
      circleOffsetY: anim && anim.wrap ? progress * max * rowHeight : 0,
    };
  }

  function drawCircleWindow(ctx, cx, cy, radius, circleFill, visibleDigit, family, circleDigitColor, circleFontSize, offsetY, scale) {
    const circleY = cy + (offsetY || 0);
    const actualScale = scale || 1;
    const scaledRadius = radius * actualScale;
    ctx.save();
    ctx.shadowColor = "rgba(41,53,72,0.22)";
    ctx.shadowBlur = 14;
    ctx.shadowOffsetX = -5;
    ctx.shadowOffsetY = -5;
    ctx.fillStyle = circleFill;
    ctx.beginPath();
    ctx.arc(cx, circleY, scaledRadius, 0, Math.PI * 2);
    ctx.fill();
    ctx.restore();

    ctx.save();
    ctx.shadowColor = "rgba(41,53,72,0.24)";
    ctx.shadowBlur = 18;
    ctx.shadowOffsetX = 8;
    ctx.shadowOffsetY = 8;
    ctx.fillStyle = circleFill;
    ctx.beginPath();
    ctx.arc(cx, circleY, scaledRadius, 0, Math.PI * 2);
    ctx.fill();
    ctx.restore();

    ctx.save();
    const circleGradient = ctx.createRadialGradient(
      cx - scaledRadius * 0.24,
      circleY - scaledRadius * 0.28,
      scaledRadius * 0.18,
      cx,
      circleY,
      scaledRadius,
    );
    circleGradient.addColorStop(0, mixColor(circleFill, "#ffffff", 0.22));
    circleGradient.addColorStop(1, mixColor(circleFill, "#000000", 0.04));
    ctx.fillStyle = circleGradient;
    ctx.beginPath();
    ctx.arc(cx, circleY, scaledRadius, 0, Math.PI * 2);
    ctx.fill();
    ctx.restore();

    ctx.save();
    ctx.fillStyle = circleDigitColor;
    const cFont = circleFontSize || Math.floor(scaledRadius * 0.98);
    ctx.font = `700 ${cFont}px ${family}`;
    ctx.textAlign = "center";
    ctx.textBaseline = "middle";
    ctx.fillText(String(visibleDigit), cx, circleY + 1);
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
      if (!state.anim[i] && state.value[i] !== nextValue) {
        const currentValue = Math.round(state.value[i]);
        const wrap = currentValue === maxValue && nextValue === 0;
        const delta = wrap ? -maxValue : nextValue - state.value[i];
        state.anim[i] = {
          from: state.value[i],
          delta,
          startedAt: nowMs,
          duration: wrap ? 460 : 520,
          wrap,
          to: nextValue,
        };
      }

      const anim = state.anim[i];
      if (anim) {
        const t = clamp((nowMs - anim.startedAt) / anim.duration, 0, 1);
        state.value[i] = anim.from + anim.delta * easeOutCubic(t);
        if (t >= 1) {
          state.value[i] = anim.to;
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
    const cardDigitColor = paintToColor(ctx, paint);
    const circleDigitColor = options.circleDigitColor || cardDigitColor;
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

    const layoutMetrics = getReelMetrics(w, h, size, 1);
    let cardDigitSize = Math.max(12, Math.min(
      Math.floor(layoutMetrics.cardWidth * 0.72),
      Math.floor(layoutMetrics.rowHeight * 0.84),
    ));
    const fixedCircleDigitSize = Math.ceil(cardDigitSize * 1.15);
    const totalWidth = layoutMetrics.cardWidth * 6 + layoutMetrics.pairGap * 3 + layoutMetrics.digitGap * 2;
    const startX = Math.round((w - totalWidth) / 2);
    const surfaceFill = options.cardColor || "#d9dfe8";
    const circleFill = surfaceFill;
    const cardFill = surfaceFill;
    const centerY = Math.round(h / 2);

    for (let i = 0; i < 6; i += 1) {
      let x = startX;
      for (let j = 0; j < i; j += 1) {
        x += layoutMetrics.cardWidth + (j % 2 === 0 ? layoutMetrics.pairGap : layoutMetrics.digitGap);
      }
      const reel = drawReel(
        ctx,
        x,
        centerY,
        layoutMetrics.cardWidth,
        i,
        family,
        cardDigitSize,
        nowMs,
        cardFill,
        cardDigitColor,
        layoutMetrics.rowHeight,
        layoutMetrics.topPadding,
        layoutMetrics.bottomPadding,
      );
      const circleScale = state.anim[i]
        ? 1 - 0.14 * Math.sin(Math.PI * easeInOutSine(reel.progress))
        : 1;
      drawCircleWindow(
        ctx,
        x + layoutMetrics.cardWidth / 2,
        centerY,
        layoutMetrics.circleRadius,
        circleFill,
        reel.visibleDigit,
        family,
        circleDigitColor,
        fixedCircleDigitSize,
        reel.circleOffsetY,
        circleScale,
      );
    }
  };
})(this);
