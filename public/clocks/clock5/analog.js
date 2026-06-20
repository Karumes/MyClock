(function(){
  // window.renderClock2(ctx, w, h, paint, size, now, opts)
  window.renderClock2 = function(ctx, w, h, paint, size, now, opts){
        function parseHexColor(hex) {
          if (typeof hex !== 'string') return null;
          const value = hex.trim();
          const match = /^#([0-9a-f]{3}|[0-9a-f]{6})$/i.exec(value);
          if (!match) return null;
          const raw = match[1];
          const full = raw.length === 3 ? raw.split('').map((ch) => ch + ch).join('') : raw;
          return {
            r: parseInt(full.slice(0, 2), 16),
            g: parseInt(full.slice(2, 4), 16),
            b: parseInt(full.slice(4, 6), 16),
          };
        }

        function lerp(a, b, t) {
          return a + (b - a) * t;
        }

        function sampleFontGradientColor(x, y, fallback, opts) {
          if (!opts || opts.fontMode !== 'gradient' || !Array.isArray(opts.fontGrad)) {
            return fallback;
          }
          const c1 = parseHexColor(opts.fontGrad[0]);
          const c2 = parseHexColor(opts.fontGrad[1]);
          if (!c1 || !c2) return fallback;

          const pattern = opts.fontGrad[2] || 'vertical';
          let t = 0;
          if (pattern === 'horizontal') {
            t = x / Math.max(1, w);
          } else if (pattern === 'diag-tlbr') {
            t = (x + y) / Math.max(1, w + h);
          } else if (pattern === 'diag-bltr') {
            t = (x + (h - y)) / Math.max(1, w + h);
          } else if (pattern === 'radial') {
            const centerX = w / 2;
            const centerY = h / 2;
            const dist = Math.hypot(x - centerX, y - centerY);
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

    now = now || new Date();
    opts = opts || {};

    const maxSize = Math.min(w, h) * 0.85;
    const effectiveSize = Math.min(size, maxSize);

    const cx = w/2, cy = h/2;
    const r = effectiveSize;
    const colorAt = (x, y, fallback) => sampleFontGradientColor(x, y, fallback, opts);

    ctx.clearRect(0,0,w,h);
    if (opts && !opts.suppressBg) {
      if (opts.bgGradient && Array.isArray(opts.bgGradient) && opts.bgGradient.length >= 2) {
        const g = ctx.createLinearGradient(0,0,0,h);
        g.addColorStop(0, opts.bgGradient[0]);
        g.addColorStop(1, opts.bgGradient[1]);
        ctx.fillStyle = g; ctx.fillRect(0,0,w,h);
      } else if (opts.bg) {
        ctx.fillStyle = opts.bg; ctx.fillRect(0,0,w,h);
      }
    }

    let basePaint = '#ffffff';
    try {
      ctx.fillStyle = paint;
      basePaint = paint;
    } catch {
      basePaint = '#ffffff';
      ctx.fillStyle = basePaint;
    }

    ctx.save();
    const ringR = r * 0.85;
    const rectW = Math.max(6, Math.round(r * 0.15));
    const rectH = Math.max(3, Math.round(r * 0.05));
    const dotR  = Math.max(3, Math.round(r * 0.03));
    const circleIdx = new Set([1,2,4,5,7,8,10,11]);
    for (let i=0;i<12;i++){
      const ang = (i * Math.PI) / 6 - Math.PI/2;
      const x = cx + Math.cos(ang) * ringR;
      const y = cy + Math.sin(ang) * ringR;

      if (circleIdx.has(i)) {
        ctx.fillStyle = colorAt(x, y, basePaint);
        ctx.beginPath();
        ctx.arc(Math.round(x), Math.round(y), dotR, 0, Math.PI*2);
        ctx.fill();
      } else {
        ctx.save();
        ctx.fillStyle = colorAt(x, y, basePaint);
        ctx.translate(x, y);
        ctx.rotate(ang);
        ctx.fillRect(-rectW/2, -rectH/2, rectW, rectH);
        ctx.restore();
      }
    }
    ctx.restore();

    const sec = now.getSeconds() + now.getMilliseconds()/1000;
    const min = now.getMinutes() + sec/60;
    const hr  = (now.getHours()%12) + min/60;

    function drawStick(angle, length, thickness, color) {
      ctx.save();
      ctx.translate(cx, cy);
      ctx.rotate(angle);
      ctx.fillStyle = color;
      ctx.fillRect(0, -thickness/2, length, thickness);
      ctx.restore();
    }

    const hourAng = (hr * Math.PI)/6 - Math.PI/2;
    const minAng  = (min * Math.PI)/30 - Math.PI/2;
    const secAng  = (sec * Math.PI)/30 - Math.PI/2;

    const hourLen = r * 0.50, hourTh = Math.max(6, Math.round(r * 0.05));
    const minLen  = r * 0.78, minTh  = Math.max(4, Math.round(r * 0.02));
    const secLen  = r * 0.82, secTh  = Math.max(2, Math.round(r * 0.0035));

    const hourTipX = cx + Math.cos(hourAng) * hourLen;
    const hourTipY = cy + Math.sin(hourAng) * hourLen;
    const minTipX = cx + Math.cos(minAng) * minLen;
    const minTipY = cy + Math.sin(minAng) * minLen;
    const secTipX = cx + Math.cos(secAng) * secLen;
    const secTipY = cy + Math.sin(secAng) * secLen;

    drawStick(hourAng, hourLen, hourTh, colorAt(hourTipX, hourTipY, basePaint));
    drawStick(minAng,  minLen,  minTh,  colorAt(minTipX, minTipY, basePaint));
    drawStick(secAng,  secLen,  secTh,  colorAt(secTipX, secTipY, basePaint));

    ctx.fillStyle = colorAt(cx, cy, basePaint);
    ctx.beginPath();
    ctx.arc(cx, cy, Math.max(4, Math.round(r * 0.04)), 0, Math.PI*2);
    ctx.fill();
  };
})();
