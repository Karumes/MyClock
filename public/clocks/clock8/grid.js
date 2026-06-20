(function () {
  window.renderClock7 = function (ctx, w, h, paint, size, now, opts) {
    ctx.clearRect(0, 0, w, h);

    const hh = String(now.getHours()).padStart(2, '0');
    const mm = String(now.getMinutes()).padStart(2, '0');

    ctx.fillStyle = paint || '#ffffff';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';

    const margin = Math.max(8, Math.floor(Math.min(w, h) * 0.03));
    const usableW = w - margin * 2;
    const usableH = h - margin * 2;

    const weight = '300';
    const family = (opts && opts.fontFamily) || "Inter, 'Segoe UI', 'Helvetica Neue', Arial, system-ui, sans-serif";

    let fontSize = Math.max(12, Math.floor(size * 0.9), Math.floor(Math.min(usableW, usableH) / 2));
    const minFont = 8;

    const verticalSpacingFactor = 0.90;

    let digitW = 0;
    let lineH = 0;
    let centerDist = 0;
    const digits = [hh[0], hh[1], mm[0], mm[1]];
    while (fontSize >= minFont) {
      ctx.font = `${weight} ${fontSize}px ${family}`;
      digitW = Math.max(...digits.map(d => ctx.measureText(d).width));

      const m = ctx.measureText('0');
      const actualH = (m.actualBoundingBoxAscent && m.actualBoundingBoxDescent)
        ? Math.ceil(m.actualBoundingBoxAscent + m.actualBoundingBoxDescent)
        : Math.ceil(fontSize * 1.05);

      lineH = Math.ceil(fontSize * 1.05);
      centerDist = Math.max(actualH, Math.floor(lineH * verticalSpacingFactor));

      const totalRowWidth = 2 * digitW;
      const totalColHeight = 2 * centerDist;

      if (totalRowWidth <= usableW * 2 && totalColHeight <= usableH * 2) break;
      fontSize--;
    }

    fontSize = Math.max(minFont, fontSize);
    ctx.font = `${weight} ${fontSize}px ${family}`;
    digitW = Math.max(...digits.map(d => ctx.measureText(d).width));
    const mFinal = ctx.measureText('0');
    const actualFinalH = (mFinal.actualBoundingBoxAscent && mFinal.actualBoundingBoxDescent)
      ? Math.ceil(mFinal.actualBoundingBoxAscent + mFinal.actualBoundingBoxDescent)
      : Math.ceil(fontSize * 1.05);
    lineH = Math.ceil(fontSize * 1.05);
    centerDist = Math.max(actualFinalH, Math.floor(lineH * verticalSpacingFactor));

    const centerX = w / 2;
    const centerY = h / 2;
    const halfDx = digitW / 2;
    const halfDy = centerDist / 2;

    const cxLeft = centerX - halfDx;
    const cxRight = centerX + halfDx;
    const cyTop = centerY - halfDy;
    const cyBottom = centerY + halfDy;

    ctx.fillText(hh[0], cxLeft, cyTop);
    ctx.fillText(hh[1], cxRight, cyTop);
    ctx.fillText(mm[0], cxLeft, cyBottom);
    ctx.fillText(mm[1], cxRight, cyBottom);
  };
})();
