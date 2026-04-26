(function () {
  const state = {
    dur: 200,
    shown: null,
    anims: [null, null],
  };

  function easeInOutSine(t) {
    return 0.5 * (1 - Math.cos(Math.PI * Math.max(0, Math.min(1, t))));
  }

  function roundRectFill(ctx, x, y, width, height, radius, fill) {
    ctx.beginPath();
    ctx.moveTo(x + radius, y);
    ctx.arcTo(x + width, y, x + width, y + height, radius);
    ctx.arcTo(x + width, y + height, x, y + height, radius);
    ctx.arcTo(x, y + height, x, y, radius);
    ctx.arcTo(x, y, x + width, y, radius);
    ctx.closePath();
    ctx.fillStyle = fill;
    ctx.fill();
  }

  function drawPlate(ctx, x, y, width, height, panelColor) {
    roundRectFill(ctx, x, y, width, height, Math.floor(width * 0.08), panelColor);
  }

  function drawPanelMidline(ctx, x, y, width, height, panelColor) {
    // Draw after all card faces so this line stays on the front-most layer.
    ctx.save();
    ctx.strokeStyle = panelColor;
    ctx.lineWidth = Math.max(2, Math.floor(height * 0.018));
    ctx.beginPath();
    ctx.moveTo(x + 1, y + height / 2);
    ctx.lineTo(x + width - 1, y + height / 2);
    ctx.stroke();
    ctx.restore();
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

  function sampleFontGradientColor(x, y, w, h, opts, fallback) {
    if (!opts || opts.fontMode !== "gradient" || !Array.isArray(opts.fontGrad)) {
      return fallback;
    }

    const c1 = parseHexColor(opts.fontGrad[0]);
    const c2 = parseHexColor(opts.fontGrad[1]);
    if (!c1 || !c2) return fallback;

    const pattern = opts.fontGrad[2] || "vertical";
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

  function renderPairBitmap(width, height, pairText, color, family) {
    const canvas = document.createElement("canvas");
    canvas.width = width;
    canvas.height = height;
    const ctx = canvas.getContext("2d");
    const fontSize = Math.floor(height * 0.78);

    ctx.fillStyle = color;
    ctx.textAlign = "center";
    ctx.textBaseline = "middle";
    ctx.font = `700 ${fontSize}px ${family}`;

    // render text centered exactly in the panel bitmap
    ctx.fillText(pairText, width / 2, height / 2 + Math.floor(height * 0.04));
    return canvas;
  }

  function drawPairTileStatic(ctx, x, y, width, height, pairText, color, family, panelColor) {
    drawPlate(ctx, x, y, width, height, panelColor);
    ctx.drawImage(renderPairBitmap(width, height, pairText, color, family), x, y);
  }

  function drawPairTileAnimated(ctx, x, y, width, height, fromPair, toPair, color, progress, family, panelColor) {
    drawPlate(ctx, x, y, width, height, panelColor);

    const fromBmp = renderPairBitmap(width, height, fromPair, color, family);
    const toBmp = renderPairBitmap(width, height, toPair, color, family);
    const t = Math.max(0, Math.min(1, progress));
    const topProgress = easeInOutSine(Math.min(1, t * 2));
    const bottomProgress = easeInOutSine(Math.max(0, (t - 0.5) * 2));
    const hingeY = y + height / 2;
    const skewMax = 0.12;

    if (t < 0.5) {
      ctx.save();
      ctx.beginPath();
      ctx.rect(x, hingeY, width, y + height - hingeY);
      ctx.clip();
      ctx.drawImage(fromBmp, x, y);
      ctx.restore();
    } else {
      ctx.save();
      ctx.beginPath();
      ctx.rect(x, y, width, hingeY - y);
      ctx.clip();
      ctx.drawImage(toBmp, x, y);
      ctx.restore();
    }

    if (t < 0.5) {
      const scaleY = Math.max(0.0001, 1 - topProgress);
      const skew = (1 - scaleY) * skewMax;
      ctx.save();
      ctx.beginPath();
      ctx.rect(x, y, width, hingeY - y);
      ctx.clip();
      ctx.translate(0, hingeY);
      ctx.transform(1, 0, skew, 1, 0, 0);
      ctx.scale(1, scaleY);
      ctx.drawImage(fromBmp, x, -hingeY + y);
      ctx.restore();
    } else {
      const scaleY = Math.max(0.0001, bottomProgress);
      const skew = (1 - scaleY) * skewMax;
      ctx.save();
      ctx.beginPath();
      ctx.rect(x, hingeY, width, y + height - hingeY);
      ctx.clip();
      ctx.translate(0, hingeY);
      ctx.transform(1, 0, skew, 1, 0, 0);
      ctx.scale(1, scaleY);
      ctx.drawImage(toBmp, x, -hingeY + y);
      ctx.restore();
    }
  }

  window.renderClock3 = function (ctx, w, h, paint, size, now, opts) {
    now = now || new Date();

    const hh = String(now.getHours()).padStart(2, "0");
    const mm = String(now.getMinutes()).padStart(2, "0");
    const pairs = [hh, mm];
    const family = (opts && opts.fontFamily) || '"Roboto Condensed", "Segoe UI", sans-serif';
    let baseColor = "#ffffff";
    try {
      ctx.fillStyle = paint;
      baseColor = paint;
    } catch (_) {
      baseColor = "#ffffff";
    }
    const panelColor = (opts && typeof opts.flipBackColor === "string" && opts.flipBackColor.trim())
      ? opts.flipBackColor
      : "rgba(63, 61, 61, 0.4)";
    const ts = now.getTime();

    if (!state.shown) {
      state.shown = pairs.slice();
    }

    let tileHeight = Math.min(Math.floor(h * 0.78), Math.floor(size * 1.55));
    let tileWidth = Math.floor(tileHeight * 1.1);
    let gap = Math.max(12, Math.floor(tileWidth * 0.1));
    let totalWidth = tileWidth * 2 + gap;

    if (totalWidth > w * 0.92) {
      const scale = (w * 0.92) / totalWidth;
      tileWidth = Math.floor(tileWidth * scale);
      tileHeight = Math.floor(tileHeight * scale);
      gap = Math.max(10, Math.floor(gap * scale));
      totalWidth = tileWidth * 2 + gap;
    }

    const startX = Math.round((w - totalWidth) / 2);
    const startY = Math.round((h - tileHeight) / 2);
    const colorAt = (x, y) => sampleFontGradientColor(x, y, w, h, opts, baseColor);

    for (let i = 0; i < pairs.length; i += 1) {
      if (state.shown[i] !== pairs[i] && !state.anims[i]) {
        state.anims[i] = { from: state.shown[i], to: pairs[i], start: ts };
      }
    }

    for (let i = 0; i < pairs.length; i += 1) {
      const x = startX + i * (tileWidth + gap);
      const tileColor = colorAt(x + tileWidth / 2, startY + tileHeight / 2);
      const anim = state.anims[i];
      if (anim) {
        const progress = Math.min(1, (ts - anim.start) / state.dur);
        drawPairTileAnimated(ctx, x, startY, tileWidth, tileHeight, anim.from, anim.to, tileColor, progress, family, panelColor);
        if (progress >= 1) {
          state.shown[i] = anim.to;
          state.anims[i] = null;
        }
      } else {
        drawPairTileStatic(ctx, x, startY, tileWidth, tileHeight, state.shown[i], tileColor, family, panelColor);
      }
      drawPanelMidline(ctx, x, startY, tileWidth, tileHeight, panelColor);
    }
  };
})();
