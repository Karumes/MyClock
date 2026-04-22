(function () {
  // window.renderClock8(ctx, w, h, paint, size, now, opts)
  window.renderClock8 = function (ctx, w, h, paint, size, now, opts) {
    now = now || new Date();
    ctx.clearRect(0, 0, w, h);
    if (opts && !opts.suppressBg) {
      if (opts.bgGradient && Array.isArray(opts.bgGradient) && opts.bgGradient.length >= 2) {
        const g = ctx.createLinearGradient(0, 0, 0, h);
        g.addColorStop(0, opts.bgGradient[0]);
        g.addColorStop(1, opts.bgGradient[1]);
        ctx.fillStyle = g;
        ctx.fillRect(0, 0, w, h);
      } else if (opts.bg) {
        ctx.fillStyle = opts.bg;
        ctx.fillRect(0, 0, w, h);
      }
    }

    // digits HHMM (no colon)
    const hh = String(now.getHours()).padStart(2, '0');
    const mm = String(now.getMinutes()).padStart(2, '0');
    const digits = [hh[0], hh[1], mm[0], mm[1]];

    // 4 vertical panels
    const panelW = w / 4;
    const panelH = h;

    // font setup (square/straight font)
    const weight = 700; // Oswald
    const family = (opts && opts.fontFamily) || "system-ui, sans-serif";

    // vertical shift: hours lower, minutes higher
    const vShiftMag = Math.round(panelH * 0.01); // minimize shift to allow bigger font
    // per-group offsets: hours down, minutes up (can be overridden)
    const hourOffsetDown = (opts && typeof opts.hourOffsetY === 'number')
      ? Math.round(Math.max(0, opts.hourOffsetY))
      : Math.round(panelH * 0.10);
    const minOffsetUp = (opts && typeof opts.minOffsetY === 'number')
      ? Math.round(Math.max(0, opts.minOffsetY))
      : Math.round(panelH * 0.10);
    // global push to move the whole numbers lower (can be overridden)
    const globalPushDown = (opts && typeof opts.globalOffsetY === 'number')
      ? Math.round(opts.globalOffsetY)
      : Math.round(panelH * 0.06);

    // Fit font so top/bottom don't clip even after the shifts
    let fontSize = Math.max(16, Math.floor(panelH * 2.60)); // larger base size target
    const margin = Math.floor(panelH * 0.001); // minimal margin for maximum height
    // include worst-case extra (hours down plus global; minutes up reduced by global)
    const maxExtra = Math.max(hourOffsetDown + globalPushDown, Math.abs(minOffsetUp - globalPushDown));
    const allowedHBase = Math.max(8, panelH - 2 * margin - 2 * (vShiftMag + maxExtra));
    // relax fit a bit more so numbers can be bigger without being scaled down too much
    const allowedH = Math.floor(allowedHBase * 1.20);
    function measureDigitHeight(fs) {
      ctx.font = `${weight} ${fs}px ${family}`;
      const m = ctx.measureText('8'); // tallest digit
      const asc = (m.actualBoundingBoxAscent != null) ? m.actualBoundingBoxAscent : fs * 0.8;
      const desc = (m.actualBoundingBoxDescent != null) ? m.actualBoundingBoxDescent : fs * 0.2;
      return asc + desc;
    }
    let measured = measureDigitHeight(fontSize);
    if (measured > allowedH) {
      fontSize = Math.floor(fontSize * (allowedH / measured));
      measured = measureDigitHeight(fontSize);
      while (measured > allowedH && fontSize > 8) {
        fontSize--;
        measured = measureDigitHeight(fontSize);
      }
    }
    // small oversize boost after fitting; configurable via opts.oversize
    const oversize = (opts && typeof opts.oversize === 'number') ? Math.max(1, opts.oversize) : 1.08;
    fontSize = Math.floor(fontSize * oversize);

    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.font = `${weight} ${fontSize}px ${family}`;

    // fill color/paint
    try { ctx.fillStyle = paint; } catch { ctx.fillStyle = '#ffffff'; }

    // Draw each digit clipped to its panel with vertical offsets (hours lower, minutes higher)
    for (let i = 0; i < 4; i++) {
      const x0 = Math.floor(i * panelW);
      const xCenter = Math.floor(x0 + panelW / 2);
      let yCenter = Math.floor(panelH / 2);
      // Per-digit shifts:
      // 1st: down, 2nd: up, 3rd: down, 4th: up
      if (i === 0 || i === 2) {
        yCenter += vShiftMag + hourOffsetDown;
      } else {
        yCenter -= vShiftMag + minOffsetUp;
      }
      // move the whole numbers lower
      yCenter += globalPushDown;

      ctx.save();
      // clip to panel rect so overflow is cropped
      ctx.beginPath();
      ctx.rect(x0, 0, Math.ceil(panelW), panelH);
      ctx.clip();

      // render digit
      ctx.fillText(digits[i], xCenter, yCenter);

      ctx.restore();
    }

    // divider lines between panels (on top of numbers) — pure black and thinner
    ctx.save();
    ctx.strokeStyle = '#000'; // pure black
    ctx.lineWidth = 0.1;      // thinner than before
    for (let k = 1; k < 4; k++) {
      const xLine = Math.floor(k * panelW) + 0.5; // center between panels, crisp 1px line
      ctx.beginPath();
      ctx.moveTo(xLine, 0);
      ctx.lineTo(xLine, h);
      ctx.stroke();
    }
    ctx.restore();
  };
})();
