// Cartoon theme: enemy status overlays (slam telegraph, dizzy stars).
(function () {
  const K = LST.CartoonKit;
  const { INK, FONT, outlined, star } = K;

  // Slam telegraph: a red ring closes in on the tower and a dashed line points at it.
  function telegraph(ctx, e, r) {
    const k = 1 - Math.max(0, e.windup) / (e.windupMax || 1); // 0 -> 1
    ctx.save();
    ctx.setLineDash([10, 8]);
    ctx.lineDashOffset = -r.time * 60;
    ctx.lineWidth = 4;
    ctx.strokeStyle = `rgba(255, 71, 87, ${0.4 + 0.5 * k})`;
    ctx.beginPath();
    ctx.moveTo(e.x, e.y);
    ctx.lineTo(0, 0);
    ctx.stroke();
    ctx.setLineDash([]);
    const R = 34 + (1 - k) * 70;
    ctx.beginPath();
    ctx.arc(0, 0, R, 0, Math.PI * 2);
    ctx.fillStyle = `rgba(255, 71, 87, ${0.12 + 0.2 * k})`;
    ctx.fill();
    ctx.lineWidth = 5;
    ctx.strokeStyle = INK;
    ctx.stroke();
    ctx.lineWidth = 3;
    ctx.strokeStyle = "#ff4757";
    ctx.stroke();
    if (Math.floor(r.time * 8) % 2 === 0) {
      ctx.font = `700 26px ${FONT}`;
      ctx.textAlign = "center";
      ctx.textBaseline = "middle";
      ctx.lineWidth = 6;
      ctx.strokeStyle = INK;
      ctx.strokeText("!", e.x, e.y - e.radius * 2.6);
      ctx.fillStyle = "#ffd23f";
      ctx.fillText("!", e.x, e.y - e.radius * 2.6);
    }
    ctx.restore();
  }

  // Cartoon dizzy stars for stunned enemies.
  function dizzy(ctx, e, r) {
    ctx.save();
    for (let i = 0; i < 3; i++) {
      const a = r.time * 5 + (i * Math.PI * 2) / 3;
      ctx.save();
      ctx.translate(e.x + Math.cos(a) * e.radius * 1.1, e.y - e.radius * 1.6 + Math.sin(a) * e.radius * 0.35);
      star(ctx, 5, 6, 2.8);
      outlined(ctx, "#ffd23f", 2);
      ctx.restore();
    }
    ctx.restore();
  }

  Object.assign(K, { telegraph, dizzy });
})();
