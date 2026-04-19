(function () {
  // Clock 7: 2x2 digits (HH / MM). All digits use the same font size, stylish sans-serif.
  window.renderClock7 = function (ctx, w, h, paint, size, now, opts) {
    ctx.clearRect(0, 0, w, h);

    const hh = String(now.getHours()).padStart(2, '0');
    const mm = String(now.getMinutes()).padStart(2, '0');

    ctx.fillStyle = paint || '#ffffff';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';

    // small outer margins
    const margin = Math.max(8, Math.floor(Math.min(w, h) * 0.03));
    const usableW = w - margin * 2;
    const usableH = h - margin * 2;

    // Stylish, simple sans-serif stack (falls back to system UI)
    const weight = '300'; // thinner look kept
    const family = (opts && opts.fontFamily) || "Inter, 'Segoe UI', 'Helvetica Neue', Arial, system-ui, sans-serif";

    // Candidate font size (start large, then shrink to fit)
    let fontSize = Math.max(12, Math.floor(size * 1.15), Math.floor(Math.min(usableW, usableH) / 2));
    const minFont = 8;

    // Desired vertical spacing factor (<1 to make rows closer). 0.75 -> 25% closer.
    const verticalSpacingFactor = 0.90;

    // iterate down until the grid fits. Use the widest of the four digits for safe spacing.
    let digitW = 0;
    let lineH = 0;
    let centerDist = 0; // center-to-center desired distance
    const digits = [hh[0], hh[1], mm[0], mm[1]];
    while (fontSize >= minFont) {
      ctx.font = `${weight} ${fontSize}px ${family}`;
      // measure widest digit among the four
      digitW = Math.max(...digits.map(d => ctx.measureText(d).width));

      // determine actual glyph height if available
      const m = ctx.measureText('0');
      const actualH = (m.actualBoundingBoxAscent && m.actualBoundingBoxDescent)
        ? Math.ceil(m.actualBoundingBoxAscent + m.actualBoundingBoxDescent)
        : Math.ceil(fontSize * 1.05);

      // approximate nominal line height
      lineH = Math.ceil(fontSize * 1.05);

      // propose center-to-center distance reduced by factor but never less than actual glyph height
      centerDist = Math.max(actualH, Math.floor(lineH * verticalSpacingFactor));

      const totalRowWidth = 2 * digitW;       // no extra horizontal gap
      const totalColHeight = 2 * centerDist;  // top-to-bottom centers distance sum

      if (totalRowWidth <= usableW && totalColHeight <= usableH) break;
      fontSize--;
    }

    // finalize font
    fontSize = Math.max(minFont, fontSize);
    ctx.font = `${weight} ${fontSize}px ${family}`;
    digitW = Math.max(...digits.map(d => ctx.measureText(d).width));
    const mFinal = ctx.measureText('0');
    const actualFinalH = (mFinal.actualBoundingBoxAscent && mFinal.actualBoundingBoxDescent)
      ? Math.ceil(mFinal.actualBoundingBoxAscent + mFinal.actualBoundingBoxDescent)
      : Math.ceil(fontSize * 1.05);
    lineH = Math.ceil(fontSize * 1.05);
    centerDist = Math.max(actualFinalH, Math.floor(lineH * verticalSpacingFactor));

    // compute centers so vertical distance between centers is centerDist
    const centerX = w / 2;
    const centerY = h / 2;
    const halfDx = digitW / 2;
    const halfDy = centerDist / 2;

    const cxLeft = centerX - halfDx;
    const cxRight = centerX + halfDx;
    const cyTop = centerY - halfDy;
    const cyBottom = centerY + halfDy;

    // draw digits
    ctx.fillText(hh[0], cxLeft, cyTop);
    ctx.fillText(hh[1], cxRight, cyTop);
    ctx.fillText(mm[0], cxLeft, cyBottom);
    ctx.fillText(mm[1], cxRight, cyBottom);
  };
})();
