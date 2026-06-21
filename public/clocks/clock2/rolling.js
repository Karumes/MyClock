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

  function parseHexColor(hex) {
    if (typeof hex !== "string") return null;
    const value = hex.trim();
    const match = /^#([0-9a-f]{3}|[0-9a-f]{6})$/i.exec(value);
    if (!match) return null;
    const raw = match[1];
    const full = raw.length === 3 ? raw.split("").map((ch) => ch + ch).join("") : raw;
    return {
      r: parseInt(full.slice(0, 2), 16),
      g: parseInt(full.slice(2, 4), 16),
      b: parseInt(full.slice(4, 6), 16),
    };
  }

  function lerp(a, b, t) {
    return a + (b - a) * t;
  }

  function sampleFontGradientColor(x, y, w, h, options, fallback) {
    if (!options || options.fontMode !== "gradient" || !Array.isArray(options.fontGrad)) {
      return fallback;
    }

    const c1 = parseHexColor(options.fontGrad[0]);
    const c2 = parseHexColor(options.fontGrad[1]);
    if (!c1 || !c2) return fallback;

    const pattern = options.fontGrad[2] || "vertical";
    let t = 0;

    if (pattern === "horizontal") {
      t = x / Math.max(1, w);
    } else if (pattern === "diag-tlbr") {
      t = (x + y) / Math.max(1, w + h);
    } else if (pattern === "diag-bltr") {
      t = (x + (h - y)) / Math.max(1, w + h);
    } else if (pattern === "radial") {
      const cx = w / 2;
      const cy = h / 2;
      const dist = Math.hypot(x - cx, y - cy);
      t = dist / Math.max(1, Math.max(w, h) * 0.7);
    } else {
      t = y / Math.max(1, h);
    }

    t = Math.max(0, Math.min(1, t));
    const r = Math.round(lerp(c1.r, c2.r, t));
    const g = Math.round(lerp(c1.g, c2.g, t));
    const b = Math.round(lerp(c1.b, c2.b, t));
    return `rgb(${r}, ${g}, ${b})`;
  }

  function drawContinuousColumn(ctx, x, y, digitHeight, color, fontSize, family, now) {
    ctx.save();
    ctx.translate(x, y);
    ctx.fillStyle = color;
    ctx.textAlign = "center";
    ctx.textBaseline = "middle";
    ctx.font = `700 ${fontSize}px ${family}`;
    const ms = now.getTime();
    const phase = (ms % 1000) / 1000;
    const seconds = now.getSeconds();
    const base = seconds % 10;
    const offset = phase * digitHeight;
    const visibleRows = Math.ceil(ctx.canvas.height / digitHeight) + 24;
    const half = Math.floor(visibleRows / 2);

    for (let r = -half; r <= half; r += 1) {
      let value = (base - r) % 10;
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
    ctx.font = `700 ${Math.floor(fontSize * 0.68)}px ${family}`;
    ctx.fillText(":", x, y);
    ctx.restore();
  }

global.renderClock6 = function renderClock6(ctx, w, h, paint, size, now, options) {
    now = now || new Date();
    options = options || {};

    const family = options.fontFamily || '"JetBrains Mono", "SFMono-Regular", monospace';
    const baseColor = resolvePaint(ctx, paint);
    const digits = [
      Math.floor(now.getHours() / 10),
      now.getHours() % 10,
      Math.floor(now.getMinutes() / 10),
      now.getMinutes() % 10,
      Math.floor(now.getSeconds() / 10),
      now.getSeconds() % 10,
    ];

     let digitWidth = 20 + Math.floor(size * 0.42);
     let digitHeight = 96 + Math.floor(size * 0.95);
     let fontSize = 46 + Math.floor(size * 0.74);
     let pairOuterGap = Math.floor(digitWidth * 0.68);
     const pairBlock = digitWidth * 2;
     let totalWidth = pairBlock * 3 + pairOuterGap * 2;

     const startX = Math.floor(w / 2 - totalWidth / 2);
     const centerY = h / 2;
     const nowMs = now.getTime();
     const animDuration = 520;

     const xForIndex = (index) => {
       const pairIndex = Math.floor(index / 2);
       const inPairIndex = index % 2;
       const x = startX + pairIndex * (pairBlock + pairOuterGap) + inPairIndex * digitWidth;
       return x + digitWidth / 2;
     };

     const colon1X = (xForIndex(1) + xForIndex(2)) / 2;
     const colon2X = (xForIndex(3) + xForIndex(4)) / 2;

    const colorAt = (x, y) => sampleFontGradientColor(x, y, w, h, options, baseColor);

    for (let i = 0; i < digits.length; i += 1) {
      const colState = columnState[i];
      if (colState.shown === null) colState.shown = digits[i];
      if (colState.shown !== digits[i] && !colState.anim) {
        colState.anim = { from: colState.shown, to: digits[i], startedAt: nowMs };
      }
    }

    for (let i = 0; i < digits.length; i += 1) {
      const x = xForIndex(i);
      const colState = columnState[i];
      const colColor = colorAt(x, centerY);

      if (i === 5) {
        drawContinuousColumn(ctx, x, centerY, digitHeight, colColor, fontSize, family, now);
        colState.shown = digits[i];
        colState.anim = null;
        continue;
      }

      if (colState.anim) {
        const progress = Math.min(1, (nowMs - colState.anim.startedAt) / animDuration);
        drawDropColumn(ctx, x, centerY, colState.anim.from, colState.anim.to, progress, colColor, fontSize, family, h);
        if (progress >= 1) {
          colState.shown = colState.anim.to;
          colState.anim = null;
        }
      } else {
        drawStaticColumn(ctx, x, centerY, colState.shown, colColor, fontSize, family);
      }
    }

    drawColon(ctx, colon1X, centerY, colorAt(colon1X, centerY), fontSize, family);
    drawColon(ctx, colon2X, centerY, colorAt(colon2X, centerY), fontSize, family);
  };
})(this);
