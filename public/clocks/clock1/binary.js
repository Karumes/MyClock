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

  // 単一スロット（数字）を描画する（アニメーション対応）
  function renderSlot(ctx, index, char, anim, x, y, fontSpec, fontSize, nowMs) {
    ctx.save();
    ctx.font = fontSpec;
    ctx.textAlign = "center";
    ctx.textBaseline = "middle";

    if (anim) {
      const t = Math.min(1, (nowMs - anim.startedAt) / anim.duration);
      const eased = easeOutCubic(t);
      const travel = fontSize * 1.45;

      // 退場する数字
      ctx.save();
      ctx.translate(x, y + eased * travel);
      ctx.rotate(state.rotations[index]);
      ctx.globalAlpha = 1 - eased * 0.2;
      ctx.fillText(anim.from, 0, 0);
      ctx.restore();

      // 入場する数字
      ctx.save();
      ctx.translate(x, y - travel + eased * travel);
      ctx.rotate(state.rotations[index]);
      ctx.globalAlpha = 0.25 + eased * 0.75;
      ctx.fillText(anim.to, 0, 0);
      ctx.restore();

      if (t >= 1) {
        state.chars[index] = anim.to;
        state.anims[index] = null;
      }
    } else {
      // 静止状態
      ctx.translate(x, y);
      ctx.rotate(state.rotations[index]);
      ctx.fillText(char, 0, 0);
    }
    ctx.restore();
  }

  window.renderClock5 = function (ctx, w, h, paint, size, now, opts) {
    now = now || new Date();
    opts = opts || {};
    
    const dpr = window.devicePixelRatio || 1;
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
    
    // 左から2番目と一番右（スロット1, 3）の明るさ調整
    const secondary = /^#([0-9a-f]{3}|[0-9a-f]{6})$/i.test(primary) ? lightenHex(primary, 0.55) : primary;
    const colonColor = safeColor(opts.colonColor, "rgba(255,255,255,0.72)");
    const margin = Math.max(12, Math.floor(Math.min(w, h) * 0.035));
    const usableW = w - margin * 2;
    const usableH = h - margin * 2;
    let fontSize = Math.floor(Math.min(usableH * 0.9, usableW * 0.32, size * 1.35));

    ctx.textAlign = "center";
    ctx.textBaseline = "middle";

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

    const startX = (w - metrics.total) / 2;
    const centerY = h / 2;
    const positions = [];
    let cursor = startX;
    for (let i = 0; i < chars.length; i += 1) {
      const width = metrics.widths[i];
      positions[i] = cursor + width / 2;
      cursor += width - metrics.overlap + (i === 1 ? metrics.groupGap : 0);
    }

    const slotColors = [primary, secondary, primary, secondary];
    
    // 【調整】左右それぞれの「重なり部分」の超明るい色
    const blend01 = lightenHex(slotColors[1], 0.85);
    const blend23 = lightenHex(slotColors[3], 0.85); // 右側も左と同じく明るい発光色に設定

    const bw = w * dpr;
    const bh = h * dpr;
    const fontSpecDpr = `${weight} ${fontSize * dpr}px ${family}`;

    const mainLayer = document.createElement("canvas");
    mainLayer.width = bw;
    mainLayer.height = bh;
    const mctx = mainLayer.getContext("2d");

    // --- 1. 左側2つの数字（スロット0, 1）の合成処理 ---
    const leftLayer = document.createElement("canvas");
    leftLayer.width = bw;
    leftLayer.height = bh;
    const lctx = leftLayer.getContext("2d");

    lctx.fillStyle = "#ffffff";
    renderSlot(lctx, 0, state.chars[0], state.anims[0], positions[0] * dpr, centerY * dpr, fontSpecDpr, fontSize * dpr, nowMs);

    lctx.save();
    lctx.globalCompositeOperation = "source-in";
    lctx.fillStyle = blend01;
    renderSlot(lctx, 1, state.chars[1], state.anims[1], positions[1] * dpr, centerY * dpr, fontSpecDpr, fontSize * dpr, nowMs);
    lctx.restore();

    const leftBaseLayer = document.createElement("canvas");
    leftBaseLayer.width = bw;
    leftBaseLayer.height = bh;
    const lbctx = leftBaseLayer.getContext("2d");
    
    lbctx.fillStyle = slotColors[0];
    renderSlot(lbctx, 0, state.chars[0], state.anims[0], positions[0] * dpr, centerY * dpr, fontSpecDpr, fontSize * dpr, nowMs);
    lbctx.fillStyle = slotColors[1];
    renderSlot(lbctx, 1, state.chars[1], state.anims[1], positions[1] * dpr, centerY * dpr, fontSpecDpr, fontSize * dpr, nowMs);

    lctx.save();
    lctx.globalCompositeOperation = "destination-over";
    lctx.drawImage(leftBaseLayer, 0, 0);
    lctx.restore();

    mctx.drawImage(leftLayer, 0, 0);

    // --- 2. 右側2つの数字（スロット2, 3）の合成処理（新規追加） ---
    const rightLayer = document.createElement("canvas");
    rightLayer.width = bw;
    rightLayer.height = bh;
    const rctx = rightLayer.getContext("2d");

    // スロット2の形状を書き込む
    rctx.fillStyle = "#ffffff";
    renderSlot(rctx, 2, state.chars[2], state.anims[2], positions[2] * dpr, centerY * dpr, fontSpecDpr, fontSize * dpr, nowMs);

    // スロット3の形状を「重なった部分だけ」抽出して blend23 で塗る
    rctx.save();
    rctx.globalCompositeOperation = "source-in";
    rctx.fillStyle = blend23;
    renderSlot(rctx, 3, state.chars[3], state.anims[3], positions[3] * dpr, centerY * dpr, fontSpecDpr, fontSize * dpr, nowMs);
    rctx.restore();

    const rightBaseLayer = document.createElement("canvas");
    rightBaseLayer.width = bw;
    rightBaseLayer.height = bh;
    const rbctx = rightBaseLayer.getContext("2d");
    
    rbctx.fillStyle = slotColors[2];
    renderSlot(rbctx, 2, state.chars[2], state.anims[2], positions[2] * dpr, centerY * dpr, fontSpecDpr, fontSize * dpr, nowMs);
    rbctx.fillStyle = slotColors[3];
    renderSlot(rbctx, 3, state.chars[3], state.anims[3], positions[3] * dpr, centerY * dpr, fontSpecDpr, fontSize * dpr, nowMs);

    // 通常文字レイヤーの上に重なりハイライトを合成
    rctx.save();
    rctx.globalCompositeOperation = "destination-over";
    rctx.drawImage(rightBaseLayer, 0, 0);
    rctx.restore();

    mctx.drawImage(rightLayer, 0, 0);

    // メインキャンバスへ高品質転記
    ctx.imageSmoothingEnabled = true;
    ctx.imageSmoothingQuality = "high";
    ctx.drawImage(mainLayer, 0, 0, w, h);

    // コロンの描画
    ctx.font = `${weight} ${fontSize}px ${family}`;
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