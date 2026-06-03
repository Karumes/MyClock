(function () {
  // Lumen Clock - Light reflection with enhanced 3D reflection effect
  window.renderClockLumen = function (ctx, w, h, paint, size, now, opts) {
    now = now || new Date();
    ctx.clearRect(0, 0, w, h);

    const hh = String(now.getHours()).padStart(2, '0');
    const mm = String(now.getMinutes()).padStart(2, '0');
    const timeStr = `${hh}:${mm}`;

    // Color resolution
    let mainColor = '#ffffff';
    if (typeof paint === 'string' && paint.trim().length) {
      mainColor = paint;
    }

    // Font setup
    const family = (opts && opts.fontFamily) || '"Inter", "SF Pro Display", sans-serif';
    const weight = '200';
    
    // Calculate font size
    const maxWidth = w * 0.85;
    const maxHeight = h * 0.35;
    let fontSize = Math.min(maxHeight, Math.floor(size * 1.5));
    
    ctx.font = `${weight} ${fontSize}px ${family}`;
    let measured = ctx.measureText(timeStr).width;
    
    while (measured > maxWidth && fontSize > 20) {
      fontSize -= 2;
      ctx.font = `${weight} ${fontSize}px ${family}`;
      measured = ctx.measureText(timeStr).width;
    }

    // Position - main text slightly above center
    const mainY = h * 0.42;
    const centerX = w / 2;

    // Draw main time text with subtle glow
    ctx.save();
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.font = `${weight} ${fontSize}px ${family}`;
    
    // Subtle outer glow
    ctx.shadowColor = mainColor;
    ctx.shadowBlur = 40;
    ctx.fillStyle = mainColor;
    ctx.fillText(timeStr, centerX, mainY);
    
    // Brighter center
    ctx.shadowBlur = 20;
    ctx.fillText(timeStr, centerX, mainY);
    
    ctx.restore();

    // Enhanced reflection effect
    // Create reflection with multiple layers for depth
    const reflectionStartY = mainY + fontSize * 0.5;
    const reflectionHeight = fontSize * 1.8;
    const reflectionGap = fontSize * 0.15;

    // Create gradient for reflection fade
    const reflectionGradient = ctx.createLinearGradient(0, reflectionStartY + reflectionGap, 0, reflectionStartY + reflectionHeight);
    reflectionGradient.addColorStop(0, 'rgba(255, 255, 255, 0.25)');
    reflectionGradient.addColorStop(0.3, 'rgba(255, 255, 255, 0.12)');
    reflectionGradient.addColorStop(0.6, 'rgba(255, 255, 255, 0.04)');
    reflectionGradient.addColorStop(1, 'rgba(255, 255, 255, 0)');

    // Draw reflection with vertical flip and spreading blur effect
    ctx.save();
    
    // Set up transformation for flipped text
    ctx.translate(centerX, reflectionStartY + reflectionGap);
    ctx.scale(1, -1);
    ctx.translate(-centerX, 0);
    
    // Multiple passes for blur/spread effect
    const passes = 8;
    for (let i = 0; i < passes; i++) {
      const progress = i / (passes - 1);
      const alpha = 0.2 * (1 - progress * 0.7);
      const blur = 2 + progress * 15;
      const spread = 1 + progress * 0.15; // Slight horizontal spread
      const yOffset = progress * fontSize * 0.8;
      
      ctx.save();
      ctx.globalAlpha = alpha;
      ctx.filter = `blur(${blur}px)`;
      ctx.scale(spread, 1);
      ctx.translate(centerX * (1 - spread) / spread, 0);
      
      ctx.textAlign = 'center';
      ctx.textBaseline = 'top';
      ctx.font = `${weight} ${fontSize}px ${family}`;
      ctx.fillStyle = mainColor;
      ctx.fillText(timeStr, centerX / spread, -yOffset);
      ctx.restore();
    }
    
    ctx.restore();

    // Additional spreading glow at the bottom
    ctx.save();
    const glowGradient = ctx.createRadialGradient(
      centerX, reflectionStartY + reflectionHeight * 0.5,
      0,
      centerX, reflectionStartY + reflectionHeight * 0.5,
      measured * 0.8
    );
    glowGradient.addColorStop(0, 'rgba(255, 255, 255, 0.08)');
    glowGradient.addColorStop(0.5, 'rgba(255, 255, 255, 0.03)');
    glowGradient.addColorStop(1, 'rgba(255, 255, 255, 0)');
    
    ctx.fillStyle = glowGradient;
    ctx.fillRect(centerX - measured, reflectionStartY, measured * 2, reflectionHeight);
    ctx.restore();

    // Floor line effect - subtle horizontal light streak
    ctx.save();
    const lineY = reflectionStartY + reflectionGap - 2;
    const lineGradient = ctx.createLinearGradient(centerX - measured * 0.6, 0, centerX + measured * 0.6, 0);
    lineGradient.addColorStop(0, 'rgba(255, 255, 255, 0)');
    lineGradient.addColorStop(0.3, 'rgba(255, 255, 255, 0.15)');
    lineGradient.addColorStop(0.5, 'rgba(255, 255, 255, 0.25)');
    lineGradient.addColorStop(0.7, 'rgba(255, 255, 255, 0.15)');
    lineGradient.addColorStop(1, 'rgba(255, 255, 255, 0)');
    
    ctx.strokeStyle = lineGradient;
    ctx.lineWidth = 1;
    ctx.beginPath();
    ctx.moveTo(centerX - measured * 0.6, lineY);
    ctx.lineTo(centerX + measured * 0.6, lineY);
    ctx.stroke();
    ctx.restore();
  };
})();
