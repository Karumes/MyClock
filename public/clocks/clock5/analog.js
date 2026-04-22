(function(){
  // window.renderClock2(ctx, w, h, paint, size, now, opts)
  window.renderClock2 = function(ctx, w, h, paint, size, now, opts){
    now = now || new Date();
    const cx = w/2, cy = h/2;
    const r = size;

    // clear and (optionally) background
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

    // 12 hour markers: circles for 1,2,4,5,7,8,10,11; rectangles for 0,3,6,9
    ctx.save();
    try { ctx.fillStyle = paint; } catch { ctx.fillStyle = '#ffffff'; }
    const ringR = r * 0.85;
    const rectW = Math.max(6, Math.round(size * 0.15)); // radial length
    const rectH = Math.max(3, Math.round(size * 0.05)); // tangential thickness
    const dotR  = Math.max(3, Math.round(size * 0.03));
    const circleIdx = new Set([1,2,4,5,7,8,10,11]);
    for (let i=0;i<12;i++){
      const ang = (i * Math.PI) / 6 - Math.PI/2;
      const x = cx + Math.cos(ang) * ringR;
      const y = cy + Math.sin(ang) * ringR;

      if (circleIdx.has(i)) {
        // circle marker
        ctx.beginPath();
        ctx.arc(Math.round(x), Math.round(y), dotR, 0, Math.PI*2);
        ctx.fill();
      } else {
        // rectangular marker (radially oriented)
        ctx.save();
        ctx.translate(x, y);
        ctx.rotate(ang);
        ctx.fillRect(-rectW/2, -rectH/2, rectW, rectH);
        ctx.restore();
      }
    }
    ctx.restore();

    // hands as rectangular sticks
    const sec = now.getSeconds() + now.getMilliseconds()/1000;
    const min = now.getMinutes() + sec/60;
    const hr  = (now.getHours()%12) + min/60;

    function drawStick(angle, length, thickness, color) {
      ctx.save();
      ctx.translate(cx, cy);
      ctx.rotate(angle);
      ctx.fillStyle = color;
      // from center to outer radius along the angle
      ctx.fillRect(0, -thickness/2, length, thickness);
      ctx.restore();
    }

    // angles
    const hourAng = (hr * Math.PI)/6 - Math.PI/2;
    const minAng  = (min * Math.PI)/30 - Math.PI/2;
    const secAng  = (sec * Math.PI)/30 - Math.PI/2;

    // dimensions
    const hourLen = r * 0.50, hourTh = Math.max(6, Math.round(r * 0.05));
    const minLen  = r * 0.78, minTh  = Math.max(4, Math.round(r * 0.02));
    const secLen  = r * 0.82, secTh  = Math.max(2, Math.round(r * 0.0035));

    // hour and minute (use paint color)
    const handColor = (typeof paint === 'string' || paint && paint.toString) ? paint : '#ffffff';
    drawStick(hourAng, hourLen, hourTh, handColor);
    drawStick(minAng,  minLen,  minTh,  handColor);

    // second (red)
    drawStick(secAng,  secLen,  secTh,  '#e53935');

    // center cap follows selected clock color
    ctx.fillStyle = handColor;
    ctx.beginPath();
    ctx.arc(cx, cy, Math.max(4, Math.round(r * 0.04)), 0, Math.PI*2);
    ctx.fill();
  };
})();