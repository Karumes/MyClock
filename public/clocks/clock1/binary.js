(function () {
  const state = {
    chars: null,
    minuteKey: "",
    rotations: [0, 0, 0, 0],
    anims: [null, null, null, null],
  };

  const offscreenCache = {};

  function getOffscreen(key, physicalWidth, physicalHeight) {
    if (!offscreenCache[key]) {
      offscreenCache[key] = document.createElement("canvas");
    }
    const canvas = offscreenCache[key];
    if (canvas.width !== physicalWidth || canvas.height !== physicalHeight) {
      canvas.width = physicalWidth;
      canvas.height = physicalHeight;
    }
    const ctx = canvas.getContext("2d");
    ctx.setTransform(1, 0, 0, 1, 0, 0);
    ctx.clearRect(0, 0, physicalWidth, physicalHeight);
    ctx.imageSmoothingEnabled = false;
    return { canvas, ctx };
  }

  function easeOutExpo(t) {
    return t >= 1 ? 1 : 1 - Math.pow(2, -10 * Math.max(0, t));
  }

  function parseColor(color) {
    if (typeof color !== "string") return { r: 105, g: 247, b: 255 };
    const hex = /^#([0-9a-f]{3}|[0-9a-f]{6})$/i.exec(color.trim());
    if (hex) {
      let raw = hex[1];
      if (raw.length === 3) raw = raw.split("").map((x) => x + x).join("");
      return {
        r: parseInt(raw.slice(0, 2), 16),
        g: parseInt(raw.slice(2, 4), 16),
        b: parseInt(raw.slice(4, 6), 16),
      };
    }
    return { r: 105, g: 247, b: 255 };
  }

  function lighten(hex, amount) {
    const c = parseColor(hex);
    return `rgb(${Math.round(c.r + (255 - c.r) * amount)},${Math.round(c.g + (255 - c.g) * amount)},${Math.round(c.b + (255 - c.b) * amount)})`;
  }

  function drawDigitTo(ctx, x, y, value, rotation, color, font, alpha) {
    ctx.save();
    ctx.globalAlpha = alpha == null ? 1 : alpha;
    ctx.translate(x, y);
    ctx.rotate(rotation);
    ctx.font = font;
    ctx.fillStyle = color;
    ctx.textAlign = "center";
    ctx.textBaseline = "middle";
    ctx.fillText(value, 0, 0);
    ctx.restore();
  }

  function drawAnimFrameTo(ctx, index, x, y, anim, color, font, h, nowMs) {
    const raw = Math.min(1, (nowMs - anim.startedAt) / 700);
    const t = easeOutExpo(raw);
    const distance = h * 0.72;

    drawDigitTo(ctx, x, y + t * distance, anim.from, state.rotations[index], color, font, 1 - t);
    drawDigitTo(ctx, x, y - distance + t * distance, anim.to, state.rotations[index], color, font, t);

    if (raw >= 1) {
      state.chars[index] = anim.to;
      state.anims[index] = null;
    }
  }

  window.renderClock5 = function (ctx, w, h, paint, size, now, opts) {
    now = now || new Date();
    opts = opts || {};

    // 画面解像度と直接バインド
    const pw = ctx.canvas.width;
    const ph = ctx.canvas.height;

    // ── 時刻・状態の更新 ──────────────────────────────────
    const hh = String(now.getHours()).padStart(2, "0");
    const mm = String(now.getMinutes()).padStart(2, "0");
    const chars = [hh[0], hh[1], mm[0], mm[1]];
    const minuteKey = `${hh}:${mm}`;
    const nowMs = now.getTime();

    if (!state.chars) {
      state.chars = chars.slice();
      state.minuteKey = minuteKey;
      state.rotations = [0, 0, 0, 0];
    }
    if (state.minuteKey !== minuteKey) {
      state.minuteKey = minuteKey;
      state.rotations = [0, 0, 0, 0];
    }
    chars.forEach((c, i) => {
      if (state.chars[i] !== c && !state.anims[i]) {
        state.anims[i] = { from: state.chars[i], to: c, startedAt: nowMs };
      }
    });

    // ── フォント・色の設定 ────────────────────────────────
    const family =
      (typeof fontFamilies !== "undefined" && fontFamilies[opts.font]) ||
      opts.fontFamily ||
      '"Fredoka","M PLUS Rounded 1c","Nunito",sans-serif';

    const primary = typeof paint === "string" ? paint : "#69f7ff";
    const secondary = lighten(primary, 0.55);

    // 【画質改善のコア】外側から指定されたsize（すでにデバイスピクセル比が乗算された絶対値）をそのまま使用
    let fontSize = Math.round(size || Math.min(ph * 0.75, pw * 0.22));
    const font = `850 ${fontSize}px ${family}`;

    // ── 文字幅・配置の計算 ───────────────────────────────
    ctx.save();
    
    const { canvas: testCanvas, ctx: testCtx } = getOffscreen("test", 1, 1);
    testCtx.font = font;
    
    const widths = chars.map((c) => testCtx.measureText(c).width);
    const gap = fontSize * 0.18;
    const overlapAmt = fontSize * 0.18;
    const total = widths[0] + widths[1] + widths[2] + widths[3] - overlapAmt * 3 + gap;

    let x = Math.round((pw - total) / 2);
    const y = Math.round(ph / 2);
    const positions = [];
    for (let i = 0; i < 4; i++) {
      positions[i] = Math.round(x + widths[i] / 2);
      x += widths[i] - overlapAmt;
      if (i === 1) x += gap;
    }

    const colors = [primary, secondary, primary, secondary];

    // ── STEP 1: 各数字を描画 ──────────
    const charScreens = [];
    for (let i = 0; i < 4; i++) {
      const { canvas: cv, ctx: oc } = getOffscreen(`ch${i}`, pw, ph);
      if (state.anims[i]) {
        drawAnimFrameTo(oc, i, positions[i], y, state.anims[i], colors[i], font, ph, nowMs);
      } else {
        drawDigitTo(oc, positions[i], y, state.chars[i], state.rotations[i], colors[i], font);
      }
      charScreens.push(cv);
    }

    // ── STEP 2: 重なりマスク生成 ────────────
    const overlapColor = lighten(primary, 0.82);

    function makeOverlapMask(maskKey, canvasA, canvasB) {
      const { canvas: mv, ctx: mc } = getOffscreen(maskKey, pw, ph);
      mc.drawImage(canvasA, 0, 0);
      mc.globalCompositeOperation = "source-in";
      mc.drawImage(canvasB, 0, 0);
      mc.globalCompositeOperation = "source-over";
      return mv;
    }

    function makeOverlapOverlay(overlayKey, maskCanvas) {
      const { canvas: ov, ctx: oc } = getOffscreen(overlayKey, pw, ph);
      oc.drawImage(maskCanvas, 0, 0);
      oc.globalCompositeOperation = "source-in";
      oc.fillStyle = overlapColor;
      oc.fillRect(0, 0, pw, ph);
      oc.globalCompositeOperation = "source-over";
      return ov;
    }

    const mask01 = makeOverlapMask("mask01", charScreens[0], charScreens[1]);
    const mask23 = makeOverlapMask("mask23", charScreens[2], charScreens[3]);
    const overlay01 = makeOverlapOverlay("ov01", mask01);
    const overlay23 = makeOverlapOverlay("ov23", mask23);

    const { canvas: compCv, ctx: compCtx } = getOffscreen("composite", pw, ph);

    for (let i = 0; i < 4; i++) {
      compCtx.drawImage(charScreens[i], 0, 0);
    }
    compCtx.drawImage(overlay01, 0, 0);
    compCtx.drawImage(overlay23, 0, 0);

    // ── STEP 3: コロンを描画 ─────────────────
    const cx = Math.round((positions[1] + positions[2]) / 2);
    const dotR = Math.round(Math.max(7 * (window.devicePixelRatio || 1), fontSize * 0.08));

    compCtx.save();
    compCtx.fillStyle = opts.colonColor || "white";
    compCtx.globalAlpha = 0.85;

    compCtx.beginPath();
    compCtx.arc(cx, Math.round(y - fontSize * 0.18), dotR, 0, Math.PI * 2);
    compCtx.fill();

    compCtx.beginPath();
    compCtx.arc(cx, Math.round(y + fontSize * 0.18), dotR, 0, Math.PI * 2);
    compCtx.fill();
    compCtx.restore();

    // ── STEP 4: メインCanvasへの最終描画 ─────────────────
    ctx.save();
    ctx.imageSmoothingEnabled = false;
    ctx.setTransform(1, 0, 0, 1, 0, 0);
    ctx.clearRect(0, 0, pw, ph);
    ctx.drawImage(compCv, 0, 0);
    ctx.restore();
  };
})();