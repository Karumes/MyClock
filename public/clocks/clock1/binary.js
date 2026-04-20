(function () {
  // Clock 5 — per-digit color + averaged overlap
  window.renderClock5 = function (ctx, w, h, paint, size, now, opts) {
    now = now || new Date();
    ctx.clearRect(0, 0, w, h);

    // digits (colon removed)
    const hh = String(now.getHours()).padStart(2, '0');
    const mm = String(now.getMinutes()).padStart(2, '0');
    const chars = [hh[0], hh[1], mm[0], mm[1]];

    // color helpers
    function isHex(c) { return typeof c === 'string' && /^#([0-9a-f]{3}|[0-9a-f]{6}|[0-9a-f]{8})$/i.test(c.trim()); }
    function toRgb(hex) { hex = hex.replace('#',''); if (hex.length===3) hex = hex.split('').map(ch=>ch+ch).join(''); return { r: parseInt(hex.slice(0,2),16), g: parseInt(hex.slice(2,4),16), b: parseInt(hex.slice(4,6),16) }; }
    function lightenHex(hex, amt) { try { const {r,g,b}=toRgb(hex); const nr=Math.min(255,Math.round(r+(255-r)*amt)); const ng=Math.min(255,Math.round(g+(255-g)*amt)); const nb=Math.min(255,Math.round(b+(255-b)*amt)); return `rgb(${nr},${ng},${nb})`; } catch(e){ return hex; } }
    function isWhiteColor(c) {
      if (typeof c !== 'string') return false;
      const s = c.trim().toLowerCase();
      return s === '#fff' || s === '#ffffff' || s === '#ffffffff' ||
             s === 'white' || /^rgba?\(\s*255\s*,\s*255\s*,\s*255(\s*,\s*1(\.0+)?)?\s*\)$/.test(s);
    }

    // determine user color
    // Default to blue, but honor explicit selections (including white)
    let selectedColor = '#2196f3';
    if (typeof paint === 'string' && paint.trim().length) {
      selectedColor = paint; // use as-is (white allowed)
    } else if (window && window.editingSettings && window.editingSettings.color) {
      selectedColor = window.editingSettings.color; // use as-is (white allowed)
    }

    // compute lighter variant for second digits
    let lighterColor = selectedColor;
    if (isHex(selectedColor)) {
      lighterColor = lightenHex(selectedColor, 0.36);
    } else if (/^rgb/i.test(selectedColor)) {
      const nums = selectedColor.match(/[\d.]+/g) || [];
      if (nums.length >= 3) {
        const r = Number(nums[0]), g = Number(nums[1]), b = Number(nums[2]);
        const nr = Math.min(255, Math.round(r + (255 - r) * 0.36));
        const ng = Math.min(255, Math.round(g + (255 - g) * 0.36));
        const nb = Math.min(255, Math.round(b + (255 - b) * 0.36));
        lighterColor = `rgb(${nr},${ng},${nb})`;
      }
    }

    // font + layout
    const weight = '800';
    // Prefer fully rounded corners (M PLUS Rounded 1c). Fall back to other rounded families.
    const family = (opts && opts.fontFamily) || "'Nunito', 'Quicksand', 'Cabin Rounded', 'Segoe UI', system-ui, sans-serif";
    const margin = Math.max(12, Math.floor(Math.min(w,h) * 0.02));
    const usableW = w - margin*2;
    const usableH = h - margin*2;
    const overlapRatio = 0.32;
    let fontSize = Math.max(18, Math.floor(usableH * 0.92));

    ctx.textBaseline = 'middle';
    ctx.textAlign = 'left';
    ctx.lineJoin = 'round';
    ctx.lineCap = 'round';

    // measure widths and group gap
    let measured = [], overlap = 0, totalWidth = 0, lineHeight = 0, groupGap = 0;
    function measureFor(fs) {
      ctx.font = `${weight} ${fs}px ${family}`;
      measured = chars.map(ch => ctx.measureText(ch).width);
      const avg = measured.reduce((a,b)=>a+b,0)/measured.length;
      overlap = Math.max(Math.round(avg * overlapRatio), 2);
      // smaller gap between hour and minute so groups sit closer
      groupGap = Math.max(1, Math.round(fs * 0.17)); // slightly larger HH–MM gap
      // add one groupGap between HH and MM (after second digit)
      totalWidth = measured.reduce((a,b)=>a+b,0) - overlap * (chars.length - 1) + groupGap;
      lineHeight = Math.ceil(fs * 1.05);
      return { totalWidth, lineHeight };
    }
    let m = measureFor(fontSize);
    while ((m.totalWidth > usableW || m.lineHeight > usableH) && fontSize > 8) { fontSize--; m = measureFor(fontSize); }
    ctx.font = `${weight} ${fontSize}px ${family}`;
    totalWidth = m.totalWidth;

    const startX = Math.round((w - totalWidth)/2);
    const centerY = Math.round(h/2);

    // create glyph canvases
    const glyphs = [];
    for (let i=0;i<chars.length;i++){
      const ch = chars[i];
      const chW = Math.ceil(measured[i]);
      const chH = Math.ceil(lineHeight*1.2);
      const g = document.createElement('canvas');
      g.width = chW + 6; g.height = chH;
      const gctx = g.getContext('2d');
      gctx.textBaseline = 'middle'; gctx.textAlign='left';
      gctx.font = `${weight} ${fontSize}px ${family}`;
      // First hour (i=0) and first minute (i=2) use the same primary color
      const fill = (i === 0 || i === 2) ? selectedColor : lighterColor;
      gctx.fillStyle = fill;
      gctx.fillText(ch, 3, g.height/2);
      glyphs[i] = { canvas: g, w: g.width, h: g.height };
    }

    // composite: comp canvas same size as target
    const comp = document.createElement('canvas'); comp.width = w; comp.height = h;
    const cctx = comp.getContext('2d');
    cctx.clearRect(0,0,w,h);

    function drawGlyphToFull(glyph, posX, posY){
      const tmp = document.createElement('canvas'); tmp.width = w; tmp.height = h;
      const t = tmp.getContext('2d');
      t.clearRect(0,0,w,h);
      t.drawImage(glyph.canvas, posX, posY);
      return tmp;
    }
    function mergeAverageToComp(tmpCanvas){
      const compData = cctx.getImageData(0,0,w,h);
      const tmpCtx = tmpCanvas.getContext('2d');
      const tmpData = tmpCtx.getImageData(0,0,w,h);
      const cd = compData.data, td = tmpData.data;
      for (let p=0;p<cd.length;p+=4){
        const sa = td[p+3]/255, da = cd[p+3]/255;
        if (sa===0 && da===0) { /* nothing */ }
        else if (da === 0) { cd[p]=td[p]; cd[p+1]=td[p+1]; cd[p+2]=td[p+2]; cd[p+3]=td[p+3]; }
        else if (sa !== 0) {
          const sumA = sa + da;
          cd[p]   = Math.round((td[p]*sa   + cd[p]*da)   / sumA);
          cd[p+1] = Math.round((td[p+1]*sa + cd[p+1]*da) / sumA);
          cd[p+2] = Math.round((td[p+2]*sa + cd[p+2]*da) / sumA);
          cd[p+3] = Math.min(255, Math.round((sa + da) * 255));
        }
      }
      cctx.putImageData(compData,0,0);
    }

    // iterate glyphs, placing them at absolute positions
    let x = startX;
    const positions = [];
    for (let i=0;i<chars.length;i++){
      const chW = measured[i];
      positions[i] = { x: Math.round(x), y: Math.round(centerY - (lineHeight*1.2)/2) };
      // advance; include a single groupGap after the second digit (between HH and MM)
      x += chW - overlap + (i === 1 ? groupGap : 0);
    }

    // draw first glyph into comp
    let firstIndex = 0;
    const ginfo0 = glyphs[firstIndex];
    cctx.globalCompositeOperation = 'source-over';
    cctx.drawImage(ginfo0.canvas, positions[firstIndex].x, positions[firstIndex].y);

    // draw remaining glyphs merging by averaging
    for (let i=firstIndex+1;i<chars.length;i++){
      const ginfo = glyphs[i];
      const full = drawGlyphToFull(ginfo, positions[i].x, positions[i].y);
      mergeAverageToComp(full);
    }

    // finally draw comp onto main canvas
    ctx.drawImage(comp, 0, 0);

    // draw two white semi-transparent circles (":") between HH and MM — no background fill
    const hourRightX = positions[1].x + measured[1] - Math.round(overlap / 2);
    const minuteLeftX = positions[2].x + Math.round(overlap / 2);
    const cx = Math.round((hourRightX + minuteLeftX) / 2);
    const dotR = Math.max(Math.round(fontSize * 0.09), 6);
    // move the colon upward: negative offset raises the dots
    const colonShift = (opts && typeof opts.colonOffsetY === 'number') ? opts.colonOffsetY : -Math.round(fontSize * 0.10);
    const midY = centerY + colonShift;
    const topY = midY - Math.round(fontSize * 0.18);
    const bottomY = midY + Math.round(fontSize * 0.18);

    // semi-transparent white, no background — remains transparent
    ctx.save();
    ctx.fillStyle = 'rgba(255,255,255,0.6)';
    ctx.beginPath(); ctx.arc(cx, topY, dotR, 0, Math.PI * 2); ctx.fill();
    ctx.beginPath(); ctx.arc(cx, bottomY, dotR, 0, Math.PI * 2); ctx.fill();
    ctx.restore();
  };
})();
