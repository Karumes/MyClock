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


  function drawPolygon(ctx, points, offsetX, offsetY) {
    if (points.length < 3) return;
    ctx.beginPath();
    ctx.moveTo(points[0].x + offsetX, points[0].y + offsetY);
    for (let i = 1; i < points.length; i++) {
      ctx.lineTo(points[i].x + offsetX, points[i].y + offsetY);
    }
    ctx.closePath();
    ctx.fill();
  }

  function getStrictSegments(sw, sh, t) {
    const slit = Math.max(1, t * 0.08); 

    const midY = sh / 2;
    const th = t; 

    return [
      [
        { x: th + slit, y: 0 },
        { x: sw - th - slit, y: 0 },
        { x: sw - th * 0.5 - slit, y: th * 0.5 },
        { x: sw - th - slit, y: th },
        { x: th + slit, y: th },
        { x: th * 0.5 + slit, y: th * 0.5 }
      ],
      [
        { x: 0, y: th + slit },
        { x: th * 0.5, y: th * 0.5 + slit },
        { x: th, y: th + slit },
        { x: th, y: midY - th * 0.5 - slit },
        { x: th * 0.5, y: midY - slit },
        { x: 0, y: midY - th * 0.5 - slit }
      ],
      [
        { x: sw - th, y: th + slit },
        { x: sw - th * 0.5, y: th * 0.5 + slit },
        { x: sw, y: th + slit },
        { x: sw, y: midY - th * 0.5 - slit },
        { x: sw - th * 0.5, y: midY - slit },
        { x: sw - th, y: midY - th * 0.5 - slit }
      ],
      [
        { x: th + slit, y: sh - th },
        { x: sw - th - slit, y: sh - th },
        { x: sw - th * 0.5 - slit, y: sh - th * 0.5 },
        { x: sw - th - slit, y: sh },
        { x: th + slit, y: sh },
        { x: th * 0.5 + slit, y: sh - th * 0.5 }
      ],
      [
        { x: 0, y: midY + th * 0.5 + slit },
        { x: th * 0.5, y: midY + slit },
        { x: th, y: midY + th * 0.5 + slit },
        { x: th, y: sh - th - slit },
        { x: th * 0.5, y: sh - th * 0.5 - slit },
        { x: 0, y: sh - th - slit }
      ],
      [
        { x: sw - th, y: midY + th * 0.5 + slit },
        { x: sw - th * 0.5, y: midY + slit },
        { x: sw, y: midY + th * 0.5 + slit },
        { x: sw, y: sh - th - slit },
        { x: sw - th * 0.5, y: sh - th * 0.5 - slit },
        { x: sw - th, y: sh - th - slit }
      ],
      [
        { x: th + slit, y: midY - th * 0.5 },
        { x: sw - th - slit, y: midY - th * 0.5 },
        { x: sw - th * 0.5 - slit, y: midY },
        { x: sw - th - slit, y: midY + th * 0.5 },
        { x: th + slit, y: midY + th * 0.5 },
        { x: th * 0.5 + slit, y: midY }
      ]
    ];
  }

  function drawDigitCore(ctx, x, y, sw, sh, digit, color) {
    const flags = SEGMENTS[digit] || SEGMENTS[8];
    const thickness = Math.max(3, sw * 0.15); 
    const segPointsList = getStrictSegments(sw, sh, thickness);

    ctx.save();
    ctx.fillStyle = rgba(color, 1.0);

    segPointsList.forEach((points, index) => {
      if (!flags[index]) return;
      drawPolygon(ctx, points, x, y);
    });

    ctx.restore();
  }

  function drawColon(ctx, x, y, size, color) {
    const dotR = size * 0.05;
    const gap = size * 0.16;

    ctx.save();
    ctx.fillStyle = rgba(color, 1.0);
    ctx.beginPath();
    ctx.arc(x, y - gap, dotR, 0, Math.PI * 2);
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
    const digits = `${hh}${mm}${ss}`;

    let digitColor = "#ffffff";
    try {
      digitColor = typeof paint === "string" && paint.trim() ? paint : "#ffffff";
    } catch (_) {
      digitColor = "#ffffff";
    }

    ctx.clearRect(0, 0, w, h);
    ctx.fillStyle = opts.bg || "#000000";
    ctx.fillRect(0, 0, w, h);

    const margin = Math.max(16, Math.min(w, h) * 0.05);
    const usableW = w - margin * 2;

    const digitW = Math.floor(clamp(size * 0.38, 24, usableW / 11.0));
    const digitH = Math.floor(digitW * 1.75); 
    
    const spacing = Math.floor(digitW * 0.45); 
    const colonW = Math.floor(digitW * 0.75);
    
    const totalW = (digitW * 6) + (spacing * 3) + (colonW * 2);
    
    const startX = (w - totalW) / 2;
    const startY = (h - digitH) / 2;
    const colonY = startY + digitH / 2;

    const getX = (i) => {
      let x = startX + i * (digitW + spacing);
      if (i >= 2) x += colonW - spacing;
      if (i >= 4) x += colonW - spacing;
      return x;
    };

    drawDigitCore(ctx, getX(0), startY, digitW, digitH, Number(digits[0]), digitColor);
    drawDigitCore(ctx, getX(1), startY, digitW, digitH, Number(digits[1]), digitColor);
    drawColon(ctx, getX(1) + digitW + colonW / 2, colonY, digitH, digitColor);

    drawDigitCore(ctx, getX(2), startY, digitW, digitH, Number(digits[2]), digitColor);
    drawDigitCore(ctx, getX(3), startY, digitW, digitH, Number(digits[3]), digitColor);
    drawColon(ctx, getX(3) + digitW + colonW / 2, colonY, digitH, digitColor);

    drawDigitCore(ctx, getX(4), startY, digitW, digitH, Number(digits[4]), digitColor);
    drawDigitCore(ctx, getX(5), startY, digitW, digitH, Number(digits[5]), digitColor);
  };
})();