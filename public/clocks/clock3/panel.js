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

    const weight = 760;
    const family = '"Arial Rounded MT Bold", "Nunito", "Segoe UI", system-ui, sans-serif';
    const offset = Math.round(panelH * 0.145);
    let fontSize = Math.max(16, Math.floor(Math.min(panelH * 1.55, panelW * 2.4)));
    const allowedH = Math.floor(panelH * 0.94);
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
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.font = `${weight} ${fontSize}px ${family}`;

    // fill color/paint
    try { ctx.fillStyle = paint; } catch { ctx.fillStyle = '#ffffff'; }

    // Draw each digit clipped to its panel with vertical offsets (hours lower, minutes higher)
    for (let i = 0; i < 4; i++) {
      const x0 = Math.floor(i * panelW);
      const xCenter = Math.floor(x0 + panelW / 2);
      const yCenter = Math.floor(panelH / 2) + (i % 2 === 0 ? offset : -offset);

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
