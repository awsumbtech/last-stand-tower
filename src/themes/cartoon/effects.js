// Cartoon theme: bursts (rings, dirt, splash, hit, pow) and confetti.
(function () {
  const K = LST.CartoonKit;
  const { INK, outlined, star } = K;



  // Theme methods (assembled into LST.themes.cartoon by index.js)
  Object.assign(K.methods, {
    burst(ctx, b) {
      const f = 1 - b.life / b.maxLife; // 0 -> 1
      ctx.save();
      ctx.translate(b.x, b.y);
      ctx.rotate(b.rot);
      ctx.lineJoin = "round";
      if (b.kind === "slam" || b.kind === "shockwave" || b.kind === "freeze" || b.kind === "overdrive") {
        const col = { slam: "#ff4757", shockwave: "#ffffff", freeze: "#8fdcff", overdrive: "#ff9f43" }[b.kind];
        const e2 = 1 - Math.pow(1 - f, 2);
        ctx.globalAlpha = 1 - f;
        ctx.beginPath();
        ctx.arc(0, 0, b.size * (0.15 + 0.85 * e2), 0, Math.PI * 2);
        ctx.fillStyle = b.kind === "freeze" ? "rgba(143, 220, 255, 0.25)" : b.kind === "shockwave" ? "rgba(255, 255, 255, 0.18)" : "rgba(255, 71, 87, 0.15)";
        ctx.fill();
        ctx.lineWidth = 12 * (1 - f) + 2;
        ctx.strokeStyle = INK;
        ctx.stroke();
        ctx.lineWidth = 7 * (1 - f) + 1;
        ctx.strokeStyle = col;
        ctx.stroke();
        if (b.kind === "freeze") {
          for (let i = 0; i < 8; i++) {
            const a = (i / 8) * Math.PI * 2;
            ctx.save();
            ctx.translate(Math.cos(a) * b.size * 0.5 * e2, Math.sin(a) * b.size * 0.5 * e2);
            star(ctx, 6, 9, 3);
            outlined(ctx, "#ffffff", 2);
            ctx.restore();
          }
        }
      } else if (b.kind === "dirt") {
        for (let i = 0; i < 9; i++) {
          const a = (i / 9) * Math.PI * 2;
          const d = b.size * (0.3 + f * 0.9);
          ctx.globalAlpha = 1 - f;
          ctx.beginPath();
          ctx.arc(Math.cos(a) * d, Math.sin(a) * d * 0.6 - Math.sin(f * Math.PI) * 30, 7 * (1 - f * 0.5), 0, Math.PI * 2);
          outlined(ctx, i % 2 ? "#8d6e63" : "#6d4c41", 2.5);
        }
      } else if (b.kind === "splash") {
        // Orange shockwave ring for the Splash card
        ctx.globalAlpha = 0.85 * (1 - f);
        ctx.beginPath();
        ctx.arc(0, 0, b.size * (0.4 + f * 0.9), 0, Math.PI * 2);
        ctx.fillStyle = "rgba(255, 159, 67, 0.35)";
        ctx.fill();
        ctx.lineWidth = 4 * (1 - f) + 1.5;
        ctx.strokeStyle = b.color;
        ctx.stroke();
      } else if (b.kind === "hit") {
        const s = b.size * (0.6 + f * 0.7);
        ctx.globalAlpha = 1 - f * 0.6;
        star(ctx, 5, s, s * 0.45);
        outlined(ctx, "#ffffff", 2.5);
      } else {
        // Comic "pow" star, then an expanding ring
        const s = b.size * (0.5 + Math.min(1, f * 2.2) * 0.7);
        if (f < 0.55) {
          star(ctx, 8, s, s * 0.6);
          outlined(ctx, "#fff3b0", 3.5);
          star(ctx, 8, s * 0.6, s * 0.36);
          ctx.fillStyle = b.color;
          ctx.fill();
        }
        ctx.globalAlpha = 1 - f;
        ctx.beginPath();
        ctx.arc(0, 0, b.size * (0.6 + f * 1.1), 0, Math.PI * 2);
        ctx.lineWidth = 5 * (1 - f) + 1;
        ctx.strokeStyle = "#ffffff";
        ctx.stroke();
      }
      ctx.restore();
    },

    confetti(ctx, c) {
      ctx.save();
      ctx.globalAlpha = Math.min(1, c.life / 0.4);
      ctx.translate(c.x, c.y);
      ctx.rotate(c.rot);
      ctx.scale(1, Math.cos(c.rot * 1.7));
      LST.draw.roundRect(ctx, -c.w / 2, -c.h / 2, c.w, c.h, 2);
      outlined(ctx, c.color, 2);
      ctx.restore();
    },
  });
})();
