(function () {
  // Binary Clock - Rounded dots matrix style
  window.renderClock5 = function (ctx, w, h, paint, size, now, opts) {
    now = now || new Date();
    ctx.clearRect(0, 0, w, h);

    const hh = String(now.getHours()).padStart(2, '0');
    const mm = String(now.getMinutes()).padStart(2, '0');
    const ss = String(now.getSeconds()).padStart(2, '0');
    
    // Binary representation for each digit
    const digits = [
      parseInt(hh[0]), parseInt(hh[1]),
      parseInt(mm[0]), parseInt(mm[1]),
      parseInt(ss[0]), parseInt(ss[1])
    ];

    // Color helpers
    function isHex(c) { return typeof c === 'string' && /^#([0-9a-f]{3}|[0-9a-f]{6}|[0-9a-f]{8})$/i.test(c.trim()); }
    function toRgb(hex) { 
      hex = hex.replace('#',''); 
      if (hex.length===3) hex = hex.split('').map(ch=>ch+ch).join(''); 
      return { r: parseInt(hex.slice(0,2),16), g: parseInt(hex.slice(2,4),16), b: parseInt(hex.slice(4,6),16) }; 
    }

    // Determine user color
    let selectedColor = '#00e5ff';
    if (typeof paint === 'string' && paint.trim().length) {
      selectedColor = paint;
    } else if (window && window.editingSettings && window.editingSettings.color) {
      selectedColor = window.editingSettings.color;
    }

    // Grid dimensions
    const cols = 6; // 6 digits
    const rows = 4; // 4 bits per digit (0-9 needs 4 bits)
    
    // Calculate dot size and spacing
    const maxWidth = w * 0.8;
    const maxHeight = h * 0.6;
    const dotSpacing = Math.min(maxWidth / (cols * 2 + 1), maxHeight / (rows + 1));
    const dotRadius = Math.floor(dotSpacing * 0.35);
    const groupGap = dotSpacing * 0.8;
    
    // Total grid dimensions
    const gridWidth = cols * dotSpacing * 1.5 + groupGap * 2;
    const gridHeight = rows * dotSpacing * 1.5;
    
    const startX = (w - gridWidth) / 2;
    const startY = (h - gridHeight) / 2;

    // Draw grid background dots (dim)
    ctx.save();
    
    for (let col = 0; col < cols; col++) {
      const groupOffset = col < 2 ? 0 : col < 4 ? groupGap : groupGap * 2;
      const x = startX + col * dotSpacing * 1.5 + dotSpacing * 0.75 + groupOffset;
      
      for (let row = 0; row < rows; row++) {
        const y = startY + row * dotSpacing * 1.5 + dotSpacing * 0.75;
        
        // Dim background dot
        ctx.fillStyle = 'rgba(255, 255, 255, 0.05)';
        ctx.beginPath();
        ctx.arc(x, y, dotRadius, 0, Math.PI * 2);
        ctx.fill();
      }
    }

    // Draw active bits
    for (let col = 0; col < cols; col++) {
      const digit = digits[col];
      const groupOffset = col < 2 ? 0 : col < 4 ? groupGap : groupGap * 2;
      const x = startX + col * dotSpacing * 1.5 + dotSpacing * 0.75 + groupOffset;
      
      for (let row = 0; row < rows; row++) {
        const bitValue = 1 << (3 - row); // 8, 4, 2, 1
        const isOn = (digit & bitValue) !== 0;
        const y = startY + row * dotSpacing * 1.5 + dotSpacing * 0.75;
        
        if (isOn) {
          // Glowing active dot
          ctx.save();
          ctx.shadowColor = selectedColor;
          ctx.shadowBlur = 15;
          ctx.fillStyle = selectedColor;
          ctx.beginPath();
          ctx.arc(x, y, dotRadius, 0, Math.PI * 2);
          ctx.fill();
          
          // Inner bright center
          ctx.shadowBlur = 0;
          const rgb = isHex(selectedColor) ? toRgb(selectedColor) : { r: 0, g: 229, b: 255 };
          ctx.fillStyle = `rgba(${Math.min(255, rgb.r + 100)}, ${Math.min(255, rgb.g + 100)}, ${Math.min(255, rgb.b + 100)}, 0.8)`;
          ctx.beginPath();
          ctx.arc(x, y, dotRadius * 0.5, 0, Math.PI * 2);
          ctx.fill();
          ctx.restore();
        }
      }
    }

    // Draw separator lines between HH:MM:SS groups
    ctx.fillStyle = 'rgba(255, 255, 255, 0.15)';
    const sepY1 = startY + dotSpacing * 0.3;
    const sepY2 = startY + gridHeight - dotSpacing * 0.3;
    
    // Between HH and MM
    const sep1X = startX + 2 * dotSpacing * 1.5 + groupGap * 0.5;
    ctx.beginPath();
    ctx.arc(sep1X, sepY1 + (sepY2 - sepY1) * 0.35, dotRadius * 0.4, 0, Math.PI * 2);
    ctx.fill();
    ctx.beginPath();
    ctx.arc(sep1X, sepY1 + (sepY2 - sepY1) * 0.65, dotRadius * 0.4, 0, Math.PI * 2);
    ctx.fill();
    
    // Between MM and SS
    const sep2X = startX + 4 * dotSpacing * 1.5 + groupGap * 1.5;
    ctx.beginPath();
    ctx.arc(sep2X, sepY1 + (sepY2 - sepY1) * 0.35, dotRadius * 0.4, 0, Math.PI * 2);
    ctx.fill();
    ctx.beginPath();
    ctx.arc(sep2X, sepY1 + (sepY2 - sepY1) * 0.65, dotRadius * 0.4, 0, Math.PI * 2);
    ctx.fill();

    ctx.restore();
  };
})();
