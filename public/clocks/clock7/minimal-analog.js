(function () {
  function blendHex(hex, amount) {
    const value = hex.replace("#", "");
    const full = value.length === 3 ? value.split("").map((ch) => ch + ch).join("") : value;
    const r = parseInt(full.slice(0, 2), 16);
    const g = parseInt(full.slice(2, 4), 16);
    const b = parseInt(full.slice(4, 6), 16);
    const next = (channel) => Math.max(0, Math.min(255, Math.round(channel + (255 - channel) * amount)));
    return `rgb(${next(r)}, ${next(g)}, ${next(b)})`;
  }

  window.renderClock4 = function (ctx, w, h, paint, size, now, opts) {
    now = now || new Date();
    const bg = (opts && opts.bg) || "#bcd4e6";
    const diskColor = typeof bg === "string" && bg.startsWith("#") ? blendHex(bg, 0.18) : "rgba(255,255,255,0.68)";
    const cx = w / 2;
    const cy = h / 2;
    const radius = Math.min(Math.min(w, h) * 0.37, size * 0.96);
    const seconds = now.getSeconds() + now.getMilliseconds() / 1000;
    const minutes = now.getMinutes() + seconds / 60;
    const hours = (now.getHours() % 12) + minutes / 60;
    const hourAngle = (hours / 12) * Math.PI * 2 - Math.PI / 2;
    const minuteAngle = (minutes / 60) * Math.PI * 2 - Math.PI / 2;
    let handColor = "#2348ff";
    try {
      ctx.strokeStyle = paint;
      handColor = paint;
    } catch (_) {
      handColor = "#2348ff";
    }

    ctx.save();
    ctx.shadowColor = "rgba(255,255,255,0.42)";
    ctx.shadowBlur = radius * 0.22;
    ctx.fillStyle = diskColor;
    ctx.beginPath();
    ctx.arc(cx, cy, radius, 0, Math.PI * 2);
    ctx.fill();

    ctx.shadowBlur = 0;
    ctx.strokeStyle = handColor;
    ctx.lineWidth = Math.max(3, radius * 0.03);
    ctx.beginPath();
    ctx.arc(cx, cy, radius * 0.98, 0, Math.PI * 2);
    ctx.stroke();

    function drawHand(angle, length, width) {
      ctx.save();
      ctx.translate(cx, cy);
      ctx.rotate(angle);
      ctx.strokeStyle = handColor;
      ctx.lineWidth = width;
      ctx.lineCap = "round";
      ctx.shadowColor = "rgba(0, 0, 0, 0.12)";
      ctx.shadowBlur = width * 1.6;
      ctx.beginPath();
      ctx.moveTo(0, 0);
      ctx.lineTo(length, 0);
      ctx.stroke();
      ctx.restore();
    }

    drawHand(hourAngle, radius * 0.44, Math.max(7, radius * 0.065));
    drawHand(minuteAngle, radius * 0.62, Math.max(6, radius * 0.052));

    ctx.fillStyle = handColor;
    ctx.beginPath();
    ctx.arc(cx, cy, Math.max(5, radius * 0.035), 0, Math.PI * 2);
    ctx.fill();
    ctx.restore();
  };
})();
