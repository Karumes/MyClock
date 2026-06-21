(function () {
  const SEGMENTS = {
    0: [1, 1, 1, 1, 1, 1, 0],
    1: [0, 0, 1, 0, 0, 1, 0],
    2: [1, 0, 1, 1, 1, 0, 1],
    3: [1, 0, 1, 1, 0, 1, 1],
    4: [0, 1, 1, 0, 0, 1, 1],
    5: [1, 1, 0, 1, 0, 1, 1],
    6: [1, 1, 0, 1, 1, 1, 1],
    7: [1, 0, 1, 0, 0, 1, 0],
    8: [1, 1, 1, 1, 1, 1, 1],
    9: [1, 1, 1, 1, 0, 1, 1],
  };

  function clamp(value, min, max) {
    return Math.max(min, Math.min(max, value));
  }

  function parseHex(hex) {
    if (typeof hex !== "string" || !hex.startsWith("#")) return { r: 255, g: 255, b: 255 };
    const raw = hex.slice(1);
    const full = raw.length === 3 ? raw.split("").map((ch) => ch + ch).join("") : raw;
    return {
      r: parseInt(full.slice(0, 2), 16),
      g: parseInt(full.slice(2, 4), 16),
      b: parseInt(full.slice(4, 6), 16),
    };
  }

  function rgba(hex, alpha) {
    const c = parseHex(hex);
    return `rgba(${c.r}, ${c.g}, ${c.b}, ${alpha})`;
  }

  function drawRoundedSegment(ctx, x, y, width, height, radius) {
    const r = Math.min(radius, width / 2, height / 2);
    ctx.beginPath();
    ctx.moveTo(x + r, y);
    ctx.arcTo(x + width, y, x + width, y + height, r);
    ctx.arcTo(x + width, y + height, x, y + height, r);
    ctx.arcTo(x, y + height, x, y, r);
    ctx.arcTo(x, y, x + width, y, r);
    ctx.closePath();
  }

  function getSegmentRects(sw, sh, t) {
    const gap = t * 1.35;
    const segW = sw - t * 2.2;
    const segH = (sh - t * 3.4 - gap * 2) / 2;
    const midY = sh / 2;
    return [
      { x: t, y: t, w: segW, h: segH },
      { x: t, y: t + segH * 0.5, w: t, h: segH + gap },
      { x: sw - t * 2, y: t + segH * 0.5, w: t, h: segH + gap },
      { x: t, y: sh - t - segH, w: segW, h: segH },
      { x: t, y: midY + gap * 0.5, w: t, h: segH + gap },
      { x: sw - t * 2, y: midY + gap * 0.5, w: t, h: segH + gap },
      { x: t, y: midY - segH / 2, w: segW, h: segH },
    ];
  }

  function drawDigitCore(ctx, x, y, sw, sh, digit, color, glow) {
    const flags = SEGMENTS[digit] || SEGMENTS[8];
    const thickness = Math.max(3, sw * 0.11);
    const radius = thickness * 0.42;
    const rects = getSegmentRects(sw, sh, thickness);

    ctx.save();
    ctx.translate(x, y);

    for (let pass = 0; pass < 3; pass += 1) {
      const blur = glow * (0.45 + pass * 0.55);
      const alpha = pass === 0 ? 0.34 : pass === 1 ? 0.58 : 1;
      ctx.shadowColor = rgba(color, 0.92);
      ctx.shadowBlur = blur;
      ctx.fillStyle = rgba(color, alpha);
      flags.forEach((on, index) => {
        if (!on) return;
        const rect = rects[index];
        drawRoundedSegment(ctx, rect.x, rect.y, rect.w, rect.h, radius);
        ctx.fill();
      });
    }

    ctx.restore();
  }

  function drawLightRays(ctx, x, y, sw, sh, digit, floorY, color) {
    const flags = SEGMENTS[digit] || SEGMENTS[8];
    const thickness = Math.max(3, sw * 0.11);
    const rects = getSegmentRects(sw, sh, thickness);
    const rayIndices = [0, 3, 6];

    rayIndices.forEach((index) => {
      if (!flags[index]) return;
      const rect = rects[index];
      const sourceX = x + rect.x + rect.w / 2;
      const sourceY = y + rect.y + rect.h;
      const rayTop = Math.max(sourceY + 2, y + sh * 0.72);
      const rayBottom = floorY;
      const topHalf = rect.w * 0.34;
      const bottomHalf = rect.w * 1.05;
      const grad = ctx.createLinearGradient(0, rayTop, 0, rayBottom);
      grad.addColorStop(0, rgba(color, 0.42));
      grad.addColorStop(0.35, rgba(color, 0.16));
      grad.addColorStop(1, rgba(color, 0));

      ctx.save();
      ctx.beginPath();
      ctx.moveTo(sourceX - topHalf, rayTop);
      ctx.lineTo(sourceX + topHalf, rayTop);
      ctx.lineTo(sourceX + bottomHalf, rayBottom);
      ctx.lineTo(sourceX - bottomHalf, rayBottom);
      ctx.closePath();
      ctx.fillStyle = grad;
      ctx.filter = "blur(8px)";
      ctx.fill();
      ctx.restore();
    });

    flags.forEach((on, index) => {
      if (!on || rayIndices.includes(index)) return;
      const rect = rects[index];
      const sourceX = x + rect.x + rect.w / 2;
      const sourceY = y + rect.y + rect.h;
      const rayTop = sourceY;
      const rayBottom = floorY;
      const topHalf = thickness * 0.55;
      const bottomHalf = thickness * 1.8;
      const grad = ctx.createLinearGradient(0, rayTop, 0, rayBottom);
      grad.addColorStop(0, rgba(color, 0.28));
      grad.addColorStop(1, rgba(color, 0));
      ctx.save();
      ctx.beginPath();
      ctx.moveTo(sourceX - topHalf, rayTop);
      ctx.lineTo(sourceX + topHalf, rayTop);
      ctx.lineTo(sourceX + bottomHalf, rayBottom);
      ctx.lineTo(sourceX - bottomHalf, rayBottom);
      ctx.closePath();
      ctx.fillStyle = grad;
      ctx.filter = "blur(6px)";
      ctx.fill();
      ctx.restore();
    });
  }

  function drawColon(ctx, x, y, size, color, glow) {
    const dotR = size * 0.11;
    const gap = size * 0.18;
    ctx.save();
    ctx.fillStyle = rgba(color, 1);
    ctx.shadowColor = rgba(color, 0.95);
    ctx.shadowBlur = glow * 0.7;
    ctx.beginPath();
    ctx.arc(x, y - gap, dotR, 0, Math.PI * 2);
    ctx.fill();
    ctx.beginPath();
    ctx.arc(x, y + gap, dotR, 0, Math.PI * 2);
    ctx.fill();
    ctx.restore();
  }

  window.renderClock4 = function (ctx, w, h, paint, size, now, opts) {
    now = now || new Date();
    opts = opts || {};

    const hh = String(now.getHours()).padStart(2, "0");
    const mm = String(now.getMinutes()).padStart(2, "0");
    const ss = String(now.getSeconds()).padStart(2, "0");
    const chars = `${hh}:${mm}:${ss}`.split("");

    let digitColor = "#ffffff";
    try {
      ctx.fillStyle = paint;
      digitColor = paint;
    } catch (_) {
      digitColor = "#ffffff";
    }

    ctx.clearRect(0, 0, w, h);

    const bg = ctx.createLinearGradient(0, 0, w, h);
    bg.addColorStop(0, "#d88aa0");
    bg.addColorStop(0.42, "#b07aa8");
    bg.addColorStop(1, "#9a88b8");
    ctx.fillStyle = bg;
    ctx.fillRect(0, 0, w, h);

    const floorY = h * 0.92;
    const floorGrad = ctx.createLinearGradient(0, h * 0.62, 0, h);
    floorGrad.addColorStop(0, "rgba(255,255,255,0)");
    floorGrad.addColorStop(0.45, "rgba(255,255,255,0.05)");
    floorGrad.addColorStop(1, "rgba(255,255,255,0.12)");
    ctx.fillStyle = floorGrad;
    ctx.fillRect(0, h * 0.58, w, h * 0.42);

    const margin = Math.max(16, Math.min(w, h) * 0.04);
    const usableW = w - margin * 2;
    const digitW = Math.floor(clamp(size * 0.42, 28, usableW / 9.2));
    const digitH = Math.floor(digitW * 1.55);
    const colonW = Math.floor(digitW * 0.34);
    const totalW = digitW * 6 + colonW * 2;
    const startX = (w - totalW) / 2;
    const startY = h * 0.34 - digitH / 2;
    const glow = Math.max(12, digitW * 0.34);

    let cursor = startX;
    chars.forEach((ch) => {
      if (ch === ":") {
        drawColon(ctx, cursor + colonW / 2, startY + digitH / 2, digitH, digitColor, glow);
        cursor += colonW;
        return;
      }
      const digit = Number(ch);
      drawLightRays(ctx, cursor, startY, digitW, digitH, digit, floorY, digitColor);
      cursor += digitW;
    });

    cursor = startX;
    chars.forEach((ch) => {
      if (ch === ":") {
        drawColon(ctx, cursor + colonW / 2, startY + digitH / 2, digitH, digitColor, glow);
        cursor += colonW;
        return;
      }
      drawDigitCore(ctx, cursor, startY, digitW, digitH, Number(ch), digitColor, glow);
      cursor += digitW;
    });
  };
})();
