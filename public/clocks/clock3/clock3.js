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

  function drawPlate(ctx, x, y, width, height) {
    roundRectFill(ctx, x, y, width, height, Math.floor(width * 0.08), "rgba(63, 61, 61, 0.4)");
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

    const leftX = width * 0.25;
    const rightX = width * 0.75;
    const centerY = height * 0.5;

    ctx.fillText(pairText[0], leftX, centerY);
    ctx.fillText(pairText[1], rightX, centerY);
    return canvas;
  }

  function drawPairTileStatic(ctx, x, y, width, height, pairText, color, family) {
    drawPlate(ctx, x, y, width, height);
    ctx.drawImage(renderPairBitmap(width, height, pairText, color, family), x, y);
  }

  function drawPairTileAnimated(ctx, x, y, width, height, fromPair, toPair, color, progress, family) {
    drawPlate(ctx, x, y, width, height);

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
    const color = typeof paint === "string" ? paint : "#ffffff";
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

    for (let i = 0; i < pairs.length; i += 1) {
      if (state.shown[i] !== pairs[i] && !state.anims[i]) {
        state.anims[i] = { from: state.shown[i], to: pairs[i], start: ts };
      }
    }

    for (let i = 0; i < pairs.length; i += 1) {
      const x = startX + i * (tileWidth + gap);
      const anim = state.anims[i];
      if (anim) {
        const progress = Math.min(1, (ts - anim.start) / state.dur);
        drawPairTileAnimated(ctx, x, startY, tileWidth, tileHeight, anim.from, anim.to, color, progress, family);
        if (progress >= 1) {
          state.shown[i] = anim.to;
          state.anims[i] = null;
        }
      } else {
        drawPairTileStatic(ctx, x, startY, tileWidth, tileHeight, state.shown[i], color, family);
      }
    }
  };
})();
