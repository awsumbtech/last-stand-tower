// Cartoon theme: drawing primitives (ink-outlined fills, googly eyes, stars).
(function () {
  const K = LST.CartoonKit;
  const { INK } = K;

  function outlined(ctx, fill, width) {
    ctx.fillStyle = fill;
    ctx.fill();
    ctx.lineWidth = width;
    ctx.strokeStyle = INK;
    ctx.stroke();
  }

  function eyes(ctx, spread, size, lookAngle, angry) {
    const lx = Math.cos(lookAngle) * size * 0.35;
    const ly = Math.sin(lookAngle) * size * 0.35;
    for (const side of [-1, 1]) {
      const ex = side * spread;
      ctx.beginPath();
      ctx.arc(ex, -size * 0.3, size, 0, Math.PI * 2);
      outlined(ctx, "#ffffff", 2);
      ctx.beginPath();
      ctx.arc(ex + lx, -size * 0.3 + ly, size * 0.5, 0, Math.PI * 2);
      ctx.fillStyle = INK;
      ctx.fill();
      if (angry) {
        ctx.beginPath();
        ctx.moveTo(ex - side * size * 1.2, -size * 1.7);
        ctx.lineTo(ex + side * size * 1.1, -size * 1.0);
        ctx.lineWidth = 3.5;
        ctx.strokeStyle = INK;
        ctx.lineCap = "round";
        ctx.stroke();
      }
    }
  }

  function star(ctx, points, outer, inner) {
    ctx.beginPath();
    for (let i = 0; i < points * 2; i++) {
      const r = i % 2 ? inner : outer;
      const a = (i / (points * 2)) * Math.PI * 2 - Math.PI / 2;
      if (i === 0) ctx.moveTo(Math.cos(a) * r, Math.sin(a) * r);
      else ctx.lineTo(Math.cos(a) * r, Math.sin(a) * r);
    }
    ctx.closePath();
  }

  Object.assign(K, { outlined, eyes, star });
})();
