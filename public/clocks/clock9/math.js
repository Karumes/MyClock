(function () {
  const state = { minuteKey: "", clues: [] };

  // ----------------------------------------------------
  // シード付き擬似乱数エンジン (mulberry32)
  // ----------------------------------------------------
  function mulberry32(seed) {
    let a = seed >>> 0;
    return function () {
      a = (a + 0x6d2b79f5) | 0;
      let t = Math.imul(a ^ (a >>> 15), 1 | a);
      t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
      return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
    };
  }

  function hashSeed(str) {
    let h = 0x811c9dc5;
    for (let i = 0; i < str.length; i++) {
      h ^= str.charCodeAt(i);
      h = Math.imul(h, 0x01000193);
    }
    return h >>> 0;
  }

  function makeRand(now, difficulty, role, value) {
    const seedStr = `${now.getTime()}_${difficulty}_${role}_${value}`;
    return mulberry32(hashSeed(seedStr));
  }

  function randInt(rand, min, maxExclusive) {
    return Math.floor(rand() * (maxExclusive - min)) + min;
  }

  function choice(rand, arr) {
    return arr[randInt(rand, 0, arr.length)];
  }

  function shuffle(rand, arr) {
    for (let i = arr.length - 1; i > 0; i--) {
      const j = randInt(rand, 0, i + 1);
      [arr[i], arr[j]] = [arr[j], arr[i]];
    }
    return arr;
  }

  function factorial(n) {
    let r = 1;
    for (let i = 2; i <= n; i++) r *= i;
    return r;
  }

  function combination(n, r) {
    if (r < 0 || r > n) return 0;
    let num = 1, den = 1;
    for (let i = 0; i < r; i++) {
      num *= (n - i);
      den *= (i + 1);
    }
    return Math.round(num / den);
  }

  // ----------------------------------------------------
  // 【厳密化】数式生成ロジック（すべて整数逆算）
  // ----------------------------------------------------
  function makeEasyFormula(rand, val, type) {
    switch (type) {
      case 0: { // 加算: A + B = val
        const A = randInt(rand, 0, val + 1);
        return { type: "row", parts: [String(A), " + ", String(val - A)] };
      }
      case 1: { // 減算: A - B = val
        const B = randInt(rand, 5, 25);
        return { type: "row", parts: [String(val + B), " - ", String(B)] };
      }
      case 2: { // 乗算と加減算: A * B + diff = val
        const A = randInt(rand, 2, 6);
        const B = randInt(rand, 2, 10);
        const diff = val - (A * B);
        const op = diff >= 0 ? " + " : " - ";
        return { type: "row", parts: [String(A), " × ", String(B), op, String(Math.abs(diff))] };
      }
      case 3: { // 割り算: A ÷ B = val (A = val * B で絶対に整数)
        const B = randInt(rand, 2, 8);
        return { type: "row", parts: [String(val * B), " ÷ ", String(B)] };
      }
      default: { // 3項演算: A - B + C = val
        const A = randInt(rand, 15, 40);
        const B = randInt(rand, 5, 15);
        const current = A - B;
        const diff = val - current;
        const op = diff >= 0 ? " + " : " - ";
        return { type: "row", parts: [String(A), " - ", String(B), op, String(Math.abs(diff))] };
      }
    }
  }

  function makeMediumFormula(rand, val, type) {
    switch (type) {
      case 0: // 平方根: sqrt(val^2) = val
        return { type: "sqrt", content: { type: "row", parts: [String(val * val)] } };
      case 1: { // 平方数との差: k^2 + diff = val
        const k = randInt(rand, 2, 9);
        const diff = val - (k * k);
        const op = diff >= 0 ? " + " : " - ";
        return {
          type: "row",
          parts: [{ type: "sup", base: String(k), exp: "2" }, op, String(Math.abs(diff))]
        };
      }
      case 2: { // 分数: A / B = val
        const B = randInt(rand, 2, 6);
        return { type: "row", parts: [{ type: "frac", num: String(val * B), den: String(B) }] };
      }
      default: { // 複合平方根: sqrt(val^2 - k + k)
        const k = randInt(rand, 2, 6);
        const insideBase = (val * val) - k;
        if (insideBase >= 0) {
          return {
            type: "sqrt",
            content: {
              type: "row",
              parts: [String(insideBase), " + ", { type: "sqrt", content: { type: "row", parts: [String(k * k)] } }]
            }
          };
        }
        return { type: "sqrt", content: { type: "row", parts: [String(val * val)] } };
      }
    }
  }

  function makeHardFormula(rand, val, type) {
    switch (type) {
      case 0: { // 対数: log_b(b^val) = val (必ず整数化)
        const b = choice(rand, [2, 3, 5]);
        if (val <= 12) { // 桁数が大きくなりすぎない範囲で
          const pow = Math.pow(b, val);
          return { type: "row", parts: [{ type: "sub", base: "log", sub: String(b) }, `(${pow})`] };
        }
        // 値が大きい場合は自然対数 ln(e^val)
        return { type: "row", parts: ["ln(e", { type: "sup", base: "", exp: String(val) }, ")"] };
      }
      case 1: { // 三角関数の公式: val * (sin^2 + cos^2) = val * 1 = val
        const ang = choice(rand, ["θ", "x", "30°", "60°"]);
        return {
          type: "row",
          parts: [
            String(val), "sin", { type: "sup", base: "", exp: "2" }, `(${ang}) + `,
            String(val), "cos", { type: "sup", base: "", exp: "2" }, `(${ang})`
          ]
        };
      }
      case 2: { // 階乗: 割り算を利用して確実に整数化
        if (val >= 1 && val <= 12) {
          return { type: "frac", num: `${val}!`, den: `${val - 1}!` };
        }
        const k = randInt(rand, 3, 5); // 3!か4!
        const fact = factorial(k);
        const diff = val - fact;
        const op = diff >= 0 ? " + " : " - ";
        return { type: "row", parts: [`${k}!`, op, String(Math.abs(diff))] };
      }
      default: { // 組み合わせ (Combination)
        // C(val, 1) = val をベースに、ダミーではなく確実な数学的等価式を生成
        return { type: "row", parts: [{ type: "sup_sub", base: "C", sup: String(val), sub: "1" }] };
      }
    }
  }

  function makeChaosFormula(rand, val, type) {
    switch (type) {
      case 0: { // 行列式 (det): ad - bc = val 
        // 確実に整数かつ val になるように逆算: a*d - b*c = val
        // d=1, c=1 に固定すれば、a - b = val => a = val + b
        const b = randInt(rand, 1, 10);
        const a = val + b;
        // | a  b |
        // | 1  1 |  => a*1 - b*1 = a - b = (val + b) - b = val
        return { type: "det", a: String(a), b: String(b), c: "1", d: "1" };
      }
      case 1: { // 総和 (Sigma): sum_{k=1}^n (1) + base = val
        const n = randInt(rand, 2, 6);
        // シグマの1からnまでの「1」の和は n。よって、val - n を足せば必ず val になる
        const diff = val - n;
        const exprStr = diff >= 0 ? `1 + ${diff}` : `1 - ${Math.abs(diff)}`;
        return { type: "sigma", lower: "k=1", upper: String(n), expr: exprStr };
      }
      case 2: { // 定積分 (Integral): int_0^2 (C) dx = 2C = val => C = val / 2 (valが偶数の時)
        if (val % 2 === 0) {
          return { type: "int", lower: "0", upper: "2", expr: String(val / 2) };
        }
        // 奇数の場合は 0から1の積分: int_0^1 (val) dx = val
        return { type: "int", lower: "0", upper: "1", expr: String(val) };
      }
      default: { // 極限 (Limit): lim_{x->∞} (val*x / x) = val
        const k = randInt(rand, 2, 6);
        const topCoef = val * k;
        // (topCoef * x) / (k * x) の極限は topCoef / k = (val * k) / k = val (必ず整数)
        return {
          type: "row",
          parts: [
            { type: "sub", base: "lim", sub: "x→∞" },
            { type: "frac", num: `${topCoef}x`, den: `${k}x` }
          ]
        };
      }
    }
  }

  function generateClues(now, difficulty) {
    const randH = makeRand(now, difficulty, "hour", now.getHours());
    const randM = makeRand(now, difficulty, "minute", now.getMinutes());

    let types = [0, 1, 2, 3];
    shuffle(randH, types);
    const hourType = types[0];
    
    shuffle(randM, types);
    let minType = types.find(t => t !== hourType) || types[0];

    if (difficulty === "easy") return [makeEasyFormula(randH, now.getHours(), hourType), makeEasyFormula(randM, now.getMinutes(), minType)];
    if (difficulty === "medium") return [makeMediumFormula(randH, now.getHours(), hourType), makeMediumFormula(randM, now.getMinutes(), minType)];
    if (difficulty === "hard") return [makeHardFormula(randH, now.getHours(), hourType), makeHardFormula(randM, now.getMinutes(), minType)];
    return [makeChaosFormula(randH, now.getHours(), hourType), makeChaosFormula(randM, now.getMinutes(), minType)];
  }

  // ----------------------------------------------------
  // 幾何レイアウト計算エンジン
  // ----------------------------------------------------
  function layoutNode(ctx, node, family, size) {
    if (typeof node === "string") {
      ctx.font = `700 ${size}px ${family}`;
      return { width: ctx.measureText(node).width, height: size, ascent: size * 0.76, yOffset: 0 };
    }

    if (node.type === "row") {
      let totalW = 0;
      const children = node.parts.map(p => {
        const l = layoutNode(ctx, p, family, size);
        totalW += l.width;
        return { layout: l, part: p };
      });
      return { width: totalW, height: size, ascent: size * 0.76, yOffset: 0, children };
    }

    if (node.type === "frac") {
      const fSize = size * 0.92; 
      const numL = layoutNode(ctx, node.num, family, fSize);
      const denL = layoutNode(ctx, node.den, family, fSize);
      const w = Math.max(numL.width, denL.width) + size * 0.35;
      const margin = size * 0.75; 
      return { width: w, height: numL.height + denL.height + margin * 2, ascent: numL.height + margin, yOffset: 0, numL, denL, margin };
    }

    if (node.type === "sqrt") {
      const innerL = layoutNode(ctx, node.content, family, size * 0.9);
      return { width: innerL.width + size * 0.52, height: size, ascent: size * 0.76, yOffset: 0, innerL };
    }

    if (node.type === "sup") {
      const baseL = layoutNode(ctx, node.base, family, size);
      const expScale = size * 0.42; 
      const expL = layoutNode(ctx, node.exp, family, expScale);
      const w = baseL.width + expL.width + 4;
      return { width: w, height: size, ascent: baseL.ascent, yOffset: 0, baseL, expL };
    }

    if (node.type === "sub") {
      const baseL = layoutNode(ctx, node.base, family, size);
      const subL = layoutNode(ctx, node.sub, family, size * 0.55);
      return { width: baseL.width + subL.width + 2, height: size, ascent: baseL.ascent, yOffset: 0, baseL, subL };
    }

    if (node.type === "sup_sub") {
      const baseL = layoutNode(ctx, node.base, family, size);
      const supL = layoutNode(ctx, node.sup, family, size * 0.45);
      const subL = layoutNode(ctx, node.sub, family, size * 0.45);
      return { width: baseL.width + Math.max(supL.width, subL.width) + 3, height: size, ascent: baseL.ascent, yOffset: 0, baseL, supL, subL };
    }

    if (node.type === "det") {
      const fSize = size * 0.85;
      ctx.font = `700 ${fSize}px ${family}`;
      
      const maxTextW = Math.max(
        ctx.measureText(node.a).width, 
        ctx.measureText(node.b).width, 
        ctx.measureText(node.c).width, 
        ctx.measureText(node.d).width
      );
      
      const colW = maxTextW + size * 0.4;
      const pad = size * 0.25; 
      
      return { width: (colW * 2) + (pad * 2), height: size * 1.6, ascent: size * 0.8, yOffset: 0, colW, pad };
    }

    if (node.type === "sigma" || node.type === "int") {
      const exprL = layoutNode(ctx, node.expr, family, size * 0.95);
      const symWidth = node.type === "sigma" ? size * 1.35 : size * 1.15;
      
      let extraDxWidth = 0;
      if (node.type === "int") {
        ctx.font = `700 ${size * 0.95}px ${family}`;
        extraDxWidth = ctx.measureText(" dx").width;
      }

      const w = symWidth + exprL.width + extraDxWidth;
      return { width: w, height: size, ascent: size * 0.76, yOffset: 0, exprL, symWidth, extraDxWidth };
    }

    return { width: 0, height: 0, ascent: 0, yOffset: 0 };
  }

  // ----------------------------------------------------
  // レンダリング描画エンジン
  // ----------------------------------------------------
  function drawNode(ctx, node, x, y, layout, colors, family, size) {
    ctx.save();
    ctx.fillStyle = colors.primary;
    ctx.strokeStyle = colors.primary;

    if (typeof node === "string") {
      ctx.font = `700 ${size}px ${family}`;
      ctx.textAlign = "left";
      ctx.textBaseline = "middle";

      if (node === " + " || node === " - " || node === " + " || node === "- " || node === "+ ") {
        ctx.fillText(node, x, y - size * 0.02); 
      } else if (node === " × " || node === " ÷ ") {
        ctx.fillText(node, x, y - size * 0.01);
      } else {
        ctx.fillText(node, x, y);
      }
    } 
    else if (node.type === "row") {
      let curX = x;
      layout.children.forEach(child => {
        drawNode(ctx, child.part, curX, y, child.layout, colors, family, size);
        curX += child.layout.width;
      });
    } 
    else if (node.type === "frac") {
      const fSize = size * 0.92;
      const cx = x + layout.width / 2;
      const lineY = y; 

      ctx.save();
      ctx.font = `700 ${fSize}px ${family}`;
      ctx.textAlign = "center";
      
      ctx.textBaseline = "bottom";
      drawNode(ctx, node.num, cx - layout.numL.width / 2, lineY - size * 0.52, layout.numL, colors, family, fSize);
      
      ctx.textBaseline = "top";
      drawNode(ctx, node.den, cx - layout.denL.width / 2, lineY + size * 0.52, layout.denL, colors, family, fSize);
      ctx.restore();

      ctx.lineWidth = Math.max(2.2, size * 0.07);
      ctx.beginPath();
      ctx.moveTo(x, lineY);
      ctx.lineTo(x + layout.width, lineY);
      ctx.stroke();
    } 
    else if (node.type === "sqrt") {
      const startX = x;
      const rWidth = size * 0.38;
      const innerX = startX + rWidth + size * 0.08;
      
      drawNode(ctx, node.content, innerX, y, layout.innerL, colors, family, size * 0.9);

      ctx.lineWidth = Math.max(2.0, size * 0.065);
      ctx.lineJoin = "miter";
      ctx.lineCap = "square";
      
      const topY = y - size * 0.52;
      const bottomY = y + size * 0.48;
      
      ctx.beginPath();
      ctx.moveTo(startX, y - size * 0.05);
      ctx.lineTo(startX + rWidth * 0.4, y - size * 0.05);
      ctx.lineTo(startX + rWidth * 0.7, bottomY);
      ctx.lineTo(startX + rWidth, topY);
      ctx.lineTo(startX + layout.width, topY);
      ctx.stroke();
    } 
    else if (node.type === "sup") {
      ctx.save();
      ctx.textBaseline = "middle";
      drawNode(ctx, node.base, x, y, layout.baseL, colors, family, size);
      ctx.restore();

      const expX = x + layout.baseL.width + 4;
      const expY = y - size * 0.42; 
      drawNode(ctx, node.exp, expX, expY, layout.expL, colors, family, size * 0.42);
    } 
    else if (node.type === "sub") {
      drawNode(ctx, node.base, x, y, layout.baseL, colors, family, size);
      const subX = x + layout.baseL.width + 2;
      const subY = y + size * 0.38;
      drawNode(ctx, node.sub, subX, subY, layout.subL, colors, family, size * 0.55);
    } 
    else if (node.type === "sup_sub") {
      drawNode(ctx, node.base, x, y, layout.baseL, colors, family, size);
      const rightX = x + layout.baseL.width + 3;
      drawNode(ctx, node.sup, rightX, y - size * 0.38, layout.supL, colors, family, size * 0.45);
      drawNode(ctx, node.sub, rightX, y + size * 0.38, layout.subL, colors, family, size * 0.45);
    } 
    else if (node.type === "det") {
      const fSize = size * 0.85;
      const colW = layout.colW;
      const pad = layout.pad;

      const lineOffset = size * 0.05; 
      const leftLineX = x + lineOffset;
      const rightLineX = x + layout.width - lineOffset;

      ctx.save();
      ctx.font = `700 ${fSize}px ${family}`;
      ctx.textAlign = "center";   
      ctx.textBaseline = "middle";

      const col1X = leftLineX + pad + (colW / 2);
      const col2X = col1X + colW;

      ctx.fillText(node.a, col1X, y - size * 0.38);
      ctx.fillText(node.b, col2X, y - size * 0.38);
      ctx.fillText(node.c, col1X, y + size * 0.38);
      ctx.fillText(node.d, col2X, y + size * 0.38);
      ctx.restore();

      ctx.strokeStyle = colors.accent;
      ctx.lineWidth = Math.max(2.0, size * 0.055);
      ctx.beginPath();
      ctx.moveTo(leftLineX, y - size * 0.75);
      ctx.lineTo(leftLineX, y + size * 0.75);
      ctx.moveTo(rightLineX, y - size * 0.75);
      ctx.lineTo(rightLineX, y + size * 0.75);
      ctx.stroke();
    } 
    else if (node.type === "sigma") {
      const centerX = x + size * 0.65; 

      ctx.save();
      ctx.font = `700 ${size * 1.4}px ${family}`; 
      ctx.textAlign = "center";
      ctx.textBaseline = "middle";
      ctx.fillText("∑", centerX, y);
      ctx.restore();

      ctx.save();
      ctx.font = `700 ${size * 0.38}px ${family}`; 
      ctx.textAlign = "center";
      ctx.textBaseline = "bottom"; 
      ctx.fillText(node.upper, centerX, y - size * 0.88);
      ctx.textBaseline = "top";    
      ctx.fillText(node.lower, centerX, y + size * 0.88);
      ctx.restore();

      drawNode(ctx, node.expr, x + layout.symWidth, y, layout.exprL, colors, family, size * 0.95);
    } 
    else if (node.type === "int") {
      const centerX = x + size * 0.45; 

      ctx.save();
      ctx.font = `700 ${size * 1.65}px ${family}`;
      ctx.textAlign = "center";
      ctx.textBaseline = "middle";
      ctx.fillText("∫", centerX, y);
      ctx.restore();

      ctx.save();
      ctx.font = `700 ${size * 0.38}px ${family}`; 
      ctx.textAlign = "center";
      ctx.textBaseline = "bottom";
      ctx.fillText(node.upper, centerX + size * 0.45, y - size * 0.88); 
      ctx.textBaseline = "top";
      ctx.fillText(node.lower, centerX - size * 0.25, y + size * 0.88); 
      ctx.restore();

      drawNode(ctx, node.expr, x + layout.symWidth, y, layout.exprL, colors, family, size * 0.95);
      
      ctx.font = `700 ${size * 0.95}px ${family}`;
      ctx.textBaseline = "middle";
      ctx.textAlign = "left";
      ctx.fillText(" dx", x + layout.symWidth + layout.exprL.width, y);
    }

    ctx.restore();
  }

  // ----------------------------------------------------
  // クロック描画メインエントリー
  // ----------------------------------------------------
  window.renderClock9 = function (ctx, w, h, paint, size, now, opts) {
    now = now || new Date();
    opts = opts || {};

    const primary = typeof paint === "string" ? paint : "#f8fbff";
    const accent = opts.colonColor || opts.cardColor || primary;
    const family = opts.fontFamily || '"Cambria Math", "Georgia", "Times New Roman", serif';
    const difficulty = opts.mathDifficulty || "easy";

    const minuteKey = `${now.getHours()}:${now.getMinutes()}:${difficulty}`;
    if (state.minuteKey !== minuteKey) {
      state.minuteKey = minuteKey;
      state.clues = generateClues(now, difficulty);
    }


    const borderGap = 55; 
    const paddingOuter = 20;    
    
    const maxDrawWidth = (w / 2) - borderGap - paddingOuter;
    const baseFontSize = Math.min(w * 0.075, h * 0.19);
    const targetY = h / 2;      

    // --- コロン「:」の描画 ---
    ctx.save();
    ctx.fillStyle = accent;
    ctx.globalAlpha = 0.9;
    ctx.textAlign = "center";
    ctx.textBaseline = "middle";
    ctx.font = `700 ${baseFontSize}px ${family}`;
    ctx.fillText(":", w / 2, targetY - baseFontSize * 0.01);
    ctx.restore();

    // ----------------------------------------------------
    // 左側 (HOUR) 描画
    // ----------------------------------------------------
    let leftFontSize = baseFontSize;
    let leftLayout = layoutNode(ctx, state.clues[0], family, leftFontSize);
    while (leftLayout.width > maxDrawWidth && leftFontSize > 11) {
      leftFontSize -= 1;
      leftLayout = layoutNode(ctx, state.clues[0], family, leftFontSize);
    }

    const leftX = (w / 2) - borderGap - leftLayout.width;

    ctx.save();
    ctx.beginPath();
    ctx.rect(0, 0, (w / 2) - borderGap, h);
    ctx.clip();
    drawNode(ctx, state.clues[0], leftX, targetY, leftLayout, { primary, accent }, family, leftFontSize);
    ctx.restore();

    // ----------------------------------------------------
    // 右側 (MINUTE) 描画
    // ----------------------------------------------------
    let rightFontSize = baseFontSize;
    let rightLayout = layoutNode(ctx, state.clues[1], family, rightFontSize);
    while (rightLayout.width > maxDrawWidth && rightFontSize > 11) {
      rightFontSize -= 1;
      rightLayout = layoutNode(ctx, state.clues[1], family, rightFontSize);
    }

    const rightX = (w / 2) + borderGap;

    ctx.save();
    ctx.beginPath();
    ctx.rect((w / 2) + borderGap, 0, w / 2, h);
    ctx.clip();
    drawNode(ctx, state.clues[1], rightX, targetY, rightLayout, { primary, accent }, family, rightFontSize);
    ctx.restore();
  };
})();