// Cartoon theme: projectiles and particles.
(function () {
  const K = LST.CartoonKit;
  const { outlined } = K;



  // Theme methods (assembled into LST.themes.cartoon by index.js)
  Object.assign(K.methods, {
    projectile(ctx, p) {
      const a = Math.atan2(p.vy, p.vx);
      ctx.save();
      ctx.translate(p.x, p.y);
      ctx.rotate(a);
      // little speed lines
      ctx.strokeStyle = "rgba(255,255,255,0.8)";
      ctx.lineWidth = 2.5;
      ctx.lineCap = "round";
      ctx.beginPath();
      ctx.moveTo(-12, -3); ctx.lineTo(-20, -3);
      ctx.moveTo(-12, 3); ctx.lineTo(-17, 3);
      ctx.stroke();
      ctx.beginPath();
      ctx.ellipse(0, 0, 8.5, 6, 0, 0, Math.PI * 2);
      outlined(ctx, "#ffe14d", 2.5);
      ctx.beginPath();
      ctx.arc(2, -2, 1.9, 0, Math.PI * 2);
      ctx.fillStyle = "#ffffff";
      ctx.fill();
      ctx.restore();
    },

    particle(ctx, p) {
      const f = Math.max(0, p.life / p.maxLife);
      ctx.beginPath();
      ctx.arc(p.x, p.y, p.size * 1.3 * (0.4 + f * 0.8), 0, Math.PI * 2);
      outlined(ctx, p.color === "#00f0ff" ? "#8fdcff" : p.color === "#ff4d6d" ? "#ff4757" : p.color, 1.5);
    },
  });
})();
