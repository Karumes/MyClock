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

  function parseColor(color) {
    if (typeof color !== "string") return { r: 105, g: 247, b: 255 };
    const hex = /^#([0-9a-f]{3}|[0-9a-f]{6})$/i.exec(color.trim());
    if (hex) {
      const raw = hex[1];
      const full = raw.length === 3 ? raw.split("").map((ch) => ch + ch).join("") : raw;
      return {
        r: parseInt(full.slice(0, 2), 16),
        g: parseInt(full.slice(2, 4), 16),
        b: parseInt(full.slice(4, 6), 16),
      };
    }
    const rgb = /^rgba?\(([^)]+)\)$/i.exec(color.trim());
    if (rgb) {
      const parts = rgb[1].split(",").map((part) => Number(part.trim()));
      return { r: parts[0] || 0, g: parts[1] || 0, b: parts[2] || 0 };
    }
    return { r: 105, g: 247, b: 255 };
  }

  function lightenColor(color, amount) {
    const c = parseColor(color);
    const next = (channel) => Math.min(255, Math.round(channel + (255 - channel) * amount));
    return { r: next(c.r), g: next(c.g), b: next(c.b) };
  }

  function lightenHex(hex, amount) {
    const c = lightenColor(hex, amount);
    return `rgb(${c.r}, ${c.g}, ${c.b})`;
  }

  function safeColor(color, fallback) {
    return typeof color === "string" && color.trim() ? color : fallback;
  }

  function renderGlyphMask(ctx, text, x, y, angle, alpha, travelY) {
    ctx.save();
    ctx.translate(x, y + travelY);
    ctx.rotate(angle);
    ctx.globalAlpha = alpha;
    ctx.fillStyle = "#ffffff";
    ctx.fillText(text, 0, 0);
    ctx.restore();
  }

  function buildSlotMaskCanvas(w, h, font, weight, family, entries) {
    const mask = document.createElement("canvas");
    mask.width = w;
    mask.height = h;
    const mctx = mask.getContext("2d");
    mctx.textAlign = "center";
    mctx.textBaseline = "middle";
    mctx.font = `${weight} ${font}px ${family}`;
    entries.forEach((entry) => {
      renderGlyphMask(mctx, entry.text, entry.x, entry.y, entry.angle, entry.alpha, entry.travelY);
    });
    return mask;
  }

  function compositeSlots(ctx, w, h, slotMasks, slotColors) {
    const maskData = slotMasks.map((mask) => mask.getContext("2d").getImageData(0, 0, w, h).data);
    const colors = slotColors.map(parseColor);
    const blend01 = lightenColor(slotColors[1], 0.42);
    const blend23 = lightenColor(slotColors[3], 0.42);
    const output = ctx.createImageData(w, h);
    const out = output.data;

    for (let i = 0; i < out.length; i += 4) {
      const alphas = maskData.map((data) => data[i + 3]);
      const active = alphas.map((alpha, index) => (alpha >= 20 ? index : -1)).filter((index) => index >= 0);
      if (!active.length) continue;

      let color = colors[active[active.length - 1]];
      let alpha = Math.max(...active.map((index) => alphas[index]));

      const has01 = active.includes(0) && active.includes(1);
      const has23 = active.includes(2) && active.includes(3);

      if (has01 && !has23) {
        color = blend01;
        alpha = Math.min(255, Math.round((alphas[0] + alphas[1]) * 0.5));
      } else if (has23 && !has01) {
        color = blend23;
        alpha = Math.min(255, Math.round((alphas[2] + alphas[3]) * 0.5));
      } else if (active.length === 1) {
        color = colors[active[0]];
        alpha = alphas[active[0]];
      } else {
        const top = active[active.length - 1];
        color = colors[top];
        alpha = alphas[top];
      }

      out[i] = color.r;
      out[i + 1] = color.g;
      out[i + 2] = color.b;
      out[i + 3] = alpha;
    }

    ctx.putImageData(output, 0, 0);
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

    const fontSpec = `${weight} ${fontSize}px ${family}`;
    ctx.font = fontSpec;
    const startX = (w - metrics.total) / 2;
    const centerY = h / 2;
    const positions = [];
    let cursor = startX;
    for (let i = 0; i < chars.length; i += 1) {
      const width = metrics.widths[i];
      positions[i] = cursor + width / 2;
      cursor += width - metrics.overlap + (i === 1 ? metrics.groupGap : 0);
    }

    const slotEntries = [[], [], [], []];
    const slotColors = [primary, secondary, primary, secondary];

    for (let i = 0; i < chars.length; i += 1) {
      const anim = state.anims[i];
      if (anim) {
        const t = Math.min(1, (nowMs - anim.startedAt) / anim.duration);
        const eased = easeOutCubic(t);
        const travel = fontSize * 1.45;
        slotEntries[i].push({
          text: anim.from,
          x: positions[i],
          y: centerY,
          angle: state.rotations[i],
          alpha: 1 - eased * 0.2,
          travelY: eased * travel,
        });
        slotEntries[i].push({
          text: anim.to,
          x: positions[i],
          y: centerY,
          angle: state.rotations[i],
          alpha: 0.25 + eased * 0.75,
          travelY: -travel + eased * travel,
        });
        if (t >= 1) {
          state.chars[i] = anim.to;
          state.anims[i] = null;
        }
      } else {
        slotEntries[i].push({
          text: state.chars[i],
          x: positions[i],
          y: centerY,
          angle: state.rotations[i],
          alpha: 1,
          travelY: 0,
        });
      }
    }

    const layer = document.createElement("canvas");
    layer.width = w;
    layer.height = h;
    const lctx = layer.getContext("2d");
    lctx.textAlign = "center";
    lctx.textBaseline = "middle";
    lctx.font = fontSpec;
    lctx.imageSmoothingEnabled = true;
    lctx.imageSmoothingQuality = "high";

    const slotMasks = slotEntries.map((entries) => buildSlotMaskCanvas(w, h, fontSize, weight, family, entries));
    compositeSlots(lctx, w, h, slotMasks, slotColors);
    ctx.drawImage(layer, 0, 0);

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
