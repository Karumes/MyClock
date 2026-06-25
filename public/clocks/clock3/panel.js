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

    const hh = String(now.getHours()).padStart(2, '0');
    const mm = String(now.getMinutes()).padStart(2, '0');
    const digits = [hh[0], hh[1], mm[0], mm[1]];

    const cx = w / 2;
    const cy = h / 2;
    
    // 【巨大化の完全解決】
    // 画面全体の高さ(h)に依存させるのをやめ、外側から渡される絶対サイズ(size)をそのままパネルの高さの基準にします。
    // これにより、プレビュー画面用の小さなサイズが渡されたときも、その中に綺麗に収まるようになります。
    const panelH = size; 
    
    // 縦幅(panelH)に対して常に「1:0.62」の固定アスペクト比を維持
    const panelW = panelH * 0.62; 
    
    const totalW = panelW * 4;
    const startX = cx - totalW / 2;
    const startY = cy - panelH / 2;

    const weight = 760;
    const family = '"Segoe UI"';
    const offset = Math.round(panelH * 0.145);
    const globalDrop = Math.round(panelH * 0.085);
    
    let fontSize = Math.max(16, Math.floor(Math.min(panelH * 1.55, panelW * 2.4)));
    const allowedH = Math.floor(panelH * 0.94);
    function measureDigitHeight(fs) {
      ctx.font = `${weight} ${fs}px ${family}`;
      const m = ctx.measureText('8');
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

    try { ctx.fillStyle = paint; } catch { ctx.fillStyle = '#ffffff'; }

    for (let i = 0; i < 4; i++) {
      const x0 = Math.floor(startX + i * panelW);
      const xCenter = Math.floor(x0 + panelW / 2);
      const yCenter = Math.floor(startY + panelH / 2) + globalDrop + (i % 2 === 0 ? offset : -offset);

      ctx.save();
      ctx.beginPath();
      
      // 横はパネル幅で厳格にクリップ、縦は無制限
      ctx.rect(x0, -10000, Math.ceil(panelW), h + 20000);
      ctx.clip();

      ctx.fillText(digits[i], xCenter, yCenter);

      ctx.restore();
    }

    ctx.save();
    ctx.strokeStyle = '#000';
    ctx.lineWidth = 0.1;
    for (let k = 1; k < 4; k++) {
      const xLine = Math.floor(startX + k * panelW) + 0.5;
      ctx.beginPath();
      ctx.moveTo(xLine, startY);
      ctx.lineTo(xLine, startY + panelH);
      ctx.stroke();
    }
    ctx.restore();
  };
})();