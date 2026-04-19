(function (global) {
  const columnState = Array.from({ length: 6 }, () => ({
    shown: null,
    anim: null,
  }));

  function easeOutCubic(t) {
    return 1 - Math.pow(1 - t, 3);
  }

  function resolvePaint(ctx, paint) {
    try {
      ctx.fillStyle = paint;
      return paint;
    } catch (_) {
      return "#ffffff";
    }
  }

  function drawContinuousColumn(ctx, x, y, digitHeight, currentValue, color, fontSize, family, speed, nowMs) {
    ctx.save();
    ctx.translate(x, y);
    ctx.fillStyle = color;
    ctx.textAlign = "center";
    ctx.textBaseline = "middle";
    ctx.font = `700 ${fontSize}px ${family}`;
    const rowsPerSecond = speed || 1;
    const absoluteOffsetRows = (nowMs / 1000) * rowsPerSecond;
    const fracRow = absoluteOffsetRows - Math.floor(absoluteOffsetRows);
    const offset = fracRow * digitHeight;
    const visibleRows = Math.ceil(ctx.canvas.height / digitHeight) + 24;
    const half = Math.floor(visibleRows / 2);

    for (let r = -half; r <= half; r += 1) {
      let value = (currentValue - r) % 10;
      value = (value + 10) % 10;
      ctx.fillText(String(value), 0, r * digitHeight + offset);
    }
    ctx.restore();
  }

  function drawStaticColumn(ctx, x, y, value, color, fontSize, family) {
    ctx.save();
    ctx.translate(x, y);
    ctx.fillStyle = color;
    ctx.textAlign = "center";
    ctx.textBaseline = "middle";
    ctx.font = `700 ${fontSize}px ${family}`;
    ctx.fillText(String(value), 0, 0);
    ctx.restore();
  }

  function drawDropColumn(ctx, x, y, fromValue, toValue, progress, color, fontSize, family, canvasHeight) {
    const eased = easeOutCubic(progress);
    const topStart = -canvasHeight / 2 - fontSize * 1.2;
    const bottomEnd = canvasHeight / 2 + fontSize * 1.2;
    const incomingY = topStart + (0 - topStart) * eased;
    const outgoingY = 0 + (bottomEnd - 0) * eased;

    ctx.save();
    ctx.translate(x, y);
    ctx.fillStyle = color;
    ctx.textAlign = "center";
    ctx.textBaseline = "middle";
    ctx.font = `700 ${fontSize}px ${family}`;

    if (fromValue !== null && fromValue !== undefined) {
      ctx.globalAlpha = 1 - eased * 0.1;
      ctx.fillText(String(fromValue), 0, outgoingY);
    }

    ctx.globalAlpha = 0.25 + eased * 0.75;
    ctx.fillText(String(toValue), 0, incomingY);
    ctx.restore();
  }

  function drawColon(ctx, x, y, color, fontSize, family) {
    ctx.save();
    ctx.fillStyle = color;
    ctx.textAlign = "center";
    ctx.textBaseline = "middle";
    ctx.font = `700 ${Math.floor(fontSize * 0.55)}px ${family}`;
    ctx.fillText(":", x, y);
    ctx.restore();
  }

  global.renderClock6 = function renderClock6(ctx, w, h, paint, size, now, options) {
    now = now || new Date();
    options = options || {};

    const family = options.fontFamily || '"JetBrains Mono", "SFMono-Regular", monospace';
    const color = resolvePaint(ctx, paint);
    const digits = [
      Math.floor(now.getHours() / 10),
      now.getHours() % 10,
      Math.floor(now.getMinutes() / 10),
      now.getMinutes() % 10,
      Math.floor(now.getSeconds() / 10),
      now.getSeconds() % 10,
    ];

    const digitWidth = Math.min(120, Math.floor(w / 9.5));
    const digitHeight = Math.max(96, Math.floor(size * 0.95));
    const fontSize = Math.max(46, Math.floor(size * 0.74));
    const pairInnerGap = Math.max(8, Math.floor(digitWidth * 0.12));
    const pairOuterGap = Math.max(24, Math.floor(digitWidth * 0.28));
    const totalWidth = digitWidth * 6 + pairInnerGap * 3 + pairOuterGap * 2;
    const startX = (w - totalWidth) / 2 + digitWidth / 2;
    const centerY = h / 2;
    const nowMs = now.getTime();
    const animDuration = 520;

    const xForIndex = (index) => {
      const pairIndex = Math.floor(index / 2);
      const inPairIndex = index % 2;
      return startX + pairIndex * (digitWidth * 2 + pairInnerGap + pairOuterGap) + inPairIndex * (digitWidth + pairInnerGap);
    };

    for (let i = 0; i < digits.length; i += 1) {
      const state = columnState[i];
      if (state.shown === null) state.shown = digits[i];
      if (state.shown !== digits[i] && !state.anim) {
        state.anim = { from: state.shown, to: digits[i], startedAt: nowMs };
      }
    }

    for (let i = 0; i < digits.length; i += 1) {
      const x = xForIndex(i);
      const state = columnState[i];

      if (i === 5) {
        drawContinuousColumn(ctx, x, centerY, digitHeight, digits[i], color, fontSize, family, options.clock6Speed || 1, nowMs);
        state.shown = digits[i];
        state.anim = null;
        continue;
      }

      if (state.anim) {
        const progress = Math.min(1, (nowMs - state.anim.startedAt) / animDuration);
        drawDropColumn(ctx, x, centerY, state.anim.from, state.anim.to, progress, color, fontSize, family, h);
        if (progress >= 1) {
          state.shown = state.anim.to;
          state.anim = null;
        }
      } else {
        drawStaticColumn(ctx, x, centerY, state.shown, color, fontSize, family);
      }
    }

    drawColon(ctx, (xForIndex(1) + xForIndex(2)) / 2, centerY, color, fontSize, family);
    drawColon(ctx, (xForIndex(3) + xForIndex(4)) / 2, centerY, color, fontSize, family);
  };
})(this);
