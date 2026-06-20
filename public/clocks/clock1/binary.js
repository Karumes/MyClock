(function () {
  const state = {
    chars: null,
    minuteKey: "",
    rotations: [0, 0, 0, 0],
    anims: [null, null, null, null],
  };

  function randomRotations() {
    return Array.from({ length: 4 }, () => (Math.random() * 10 - 5) * Math.PI / 180);
  }

  function easeOutCubic(t) {
    return 1 - Math.pow(1 - Math.max(0, Math.min(1, t)), 3);
  }

  function lightenHex(hex, amount) {
    const value = hex.replace("#", "");
    const full = value.length === 3 ? value.split("").map((ch) => ch + ch).join("") : value;
    const r = parseInt(full.slice(0, 2), 16);
    const g = parseInt(full.slice(2, 4), 16);
    const b = parseInt(full.slice(4, 6), 16);
    const next = (channel) => Math.min(255, Math.round(channel + (255 - channel) * amount));
    return `rgb(${next(r)}, ${next(g)}, ${next(b)})`;
  }

  function safeColor(color, fallback) {
    return typeof color === "string" && color.trim() ? color : fallback;
  }

  function drawDigit(ctx, text, x, y, angle, color, fontSize, family, alpha, travelY) {
    ctx.save();
    ctx.translate(x, y + travelY);
    ctx.rotate(angle);
    ctx.globalAlpha = alpha;
    ctx.fillStyle = color;
    ctx.fillText(text, 0, 0);
    ctx.restore();
  }

  window.renderClock5 = function (ctx, w, h, paint, size, now, opts) {
    now = now || new Date();
    opts = opts || {};
    ctx.clearRect(0, 0, w, h);

    const hh = String(now.getHours()).padStart(2, "0");
    const mm = String(now.getMinutes()).padStart(2, "0");
    const chars = [hh[0], hh[1], mm[0], mm[1]];
    const minuteKey = `${hh}:${mm}`;
    const nowMs = now.getTime();

    if (!state.chars) {
      state.chars = chars.slice();
      state.minuteKey = minuteKey;
      state.rotations = randomRotations();
    }

    if (state.minuteKey !== minuteKey) {
      state.minuteKey = minuteKey;
      state.rotations = randomRotations();
    }

    chars.forEach((ch, index) => {
      if (state.chars[index] !== ch && !state.anims[index]) {
        state.anims[index] = {
          from: state.chars[index],
          to: ch,
          startedAt: nowMs,
          duration: 620,
        };
      }
    });

    const family = opts.fontFamily || '"Arial Rounded MT Bold", "Nunito", "Segoe UI Rounded", sans-serif';
    const weight = 850;
    const primary = safeColor(paint, "#69f7ff");
    const secondary = /^#([0-9a-f]{3}|[0-9a-f]{6})$/i.test(primary) ? lightenHex(primary, 0.34) : primary;
    const colonColor = safeColor(opts.colonColor, "rgba(255,255,255,0.72)");
    const margin = Math.max(12, Math.floor(Math.min(w, h) * 0.035));
    const usableW = w - margin * 2;
    const usableH = h - margin * 2;
    let fontSize = Math.floor(Math.min(usableH * 0.9, usableW * 0.32, size * 1.35));

    ctx.textAlign = "center";
    ctx.textBaseline = "middle";
    ctx.lineJoin = "round";

    function measure(fs) {
      ctx.font = `${weight} ${fs}px ${family}`;
      const widths = chars.map((ch) => ctx.measureText(ch).width);
      const avg = widths.reduce((sum, value) => sum + value, 0) / widths.length;
      const overlap = avg * 0.3;
      const groupGap = fs * 0.18;
      const total = widths.reduce((sum, value) => sum + value, 0) - overlap * 3 + groupGap;
      return { widths, overlap, groupGap, total };
    }

    let metrics = measure(fontSize);
    while ((metrics.total > usableW || fontSize * 1.08 > usableH) && fontSize > 20) {
      fontSize -= 1;
      metrics = measure(fontSize);
    }

    ctx.font = `${weight} ${fontSize}px ${family}`;
    const startX = (w - metrics.total) / 2;
    const centerY = h / 2;
    const positions = [];
    let cursor = startX;
    for (let i = 0; i < chars.length; i += 1) {
      const width = metrics.widths[i];
      positions[i] = cursor + width / 2;
      cursor += width - metrics.overlap + (i === 1 ? metrics.groupGap : 0);
    }

    for (let i = 0; i < chars.length; i += 1) {
      const color = (i === 0 || i === 2) ? primary : secondary;
      const anim = state.anims[i];
      if (anim) {
        const t = Math.min(1, (nowMs - anim.startedAt) / anim.duration);
        const eased = easeOutCubic(t);
        const travel = fontSize * 1.45;
        drawDigit(ctx, anim.from, positions[i], centerY, state.rotations[i], color, fontSize, family, 1 - eased * 0.2, eased * travel);
        drawDigit(ctx, anim.to, positions[i], centerY, state.rotations[i], color, fontSize, family, 0.25 + eased * 0.75, -travel + eased * travel);
        if (t >= 1) {
          state.chars[i] = anim.to;
          state.anims[i] = null;
        }
      } else {
        drawDigit(ctx, state.chars[i], positions[i], centerY, state.rotations[i], color, fontSize, family, 1, 0);
      }
    }

    const cx = (positions[1] + positions[2]) / 2;
    const dotR = Math.max(6, fontSize * 0.07);
    ctx.save();
    ctx.fillStyle = colonColor;
    ctx.globalAlpha = 0.78;
    ctx.beginPath();
    ctx.arc(cx, centerY - fontSize * 0.16, dotR, 0, Math.PI * 2);
    ctx.fill();
    ctx.beginPath();
    ctx.arc(cx, centerY + fontSize * 0.16, dotR, 0, Math.PI * 2);
    ctx.fill();
    ctx.restore();
  };
})();
