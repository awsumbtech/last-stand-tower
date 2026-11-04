// Cartoon theme: floating text, wave banners and the boss banner.
(function () {
  const K = LST.CartoonKit;
  const { INK, FONT, outlined, star } = K;

  function textPop(ctx, str, x, y, fill, size) {
    ctx.font = `700 ${size}px ${FONT}`;
    ctx.textAlign = "center";
    ctx.textBaseline = "middle";
    ctx.lineJoin = "round";
    ctx.lineWidth = size * 0.26;
    ctx.strokeStyle = INK;
    ctx.strokeText(str, x, y);
    ctx.fillStyle = fill;
    ctx.fillText(str, x, y);
  }

  Object.assign(K, { textPop });

  // Theme methods (assembled into LST.themes.cartoon by index.js)
  Object.assign(K.methods, {
    text(ctx, t) {
      const f = t.life / t.maxLife; // 1 -> 0
      const age = 1 - f;
      // Squash & stretch pop: wide, then tall, then settle
      const k = Math.min(1, age * 5);
      const sx = age < 0.2 ? 0.6 + k * 0.7 : 1 + Math.sin(age * 18) * 0.06 * f;
      const sy = age < 0.2 ? 1.4 - k * 0.5 : 1 - Math.sin(age * 18) * 0.06 * f;
      ctx.save();
      ctx.globalAlpha = Math.min(1, f * 3);
      ctx.translate(t.x, t.y - Math.sin(Math.min(1, age * 2) * Math.PI / 2) * 10);
      ctx.scale(sx, sy);
      if (t.kind === "coin") {
        ctx.beginPath();
        ctx.ellipse(-13, 0, 8 * Math.abs(Math.cos(age * 9)) + 1.5, 8, 0, 0, Math.PI * 2); // spinning coin
        outlined(ctx, "#ffd23f", 2.5);
        textPop(ctx, t.text, 8, 0, "#fff3b0", 20);
      } else if (t.kind === "hit") {
        textPop(ctx, t.text, 0, 0, "#ffffff", 19);
      } else if (t.kind === "crit") {
        // Crits: bigger, tilted, with a starburst behind the number.
        ctx.rotate(-0.12);
        star(ctx, 8, 24, 15);
        outlined(ctx, "#ff9f43", 3);
        textPop(ctx, t.text, 0, 1, "#ffd23f", 26);
      } else if (t.kind === "bonus") {
        textPop(ctx, t.text, 0, 0, "#3ddc84", 26);
      } else {
        textPop(ctx, t.text, 0, 0, "#ff6b6b", 20);
      }
      ctx.restore();
    },

    banner(ctx, text, alpha, r) {
      // Fit long banners ("WAVE CLEAR!") on narrow phones, including the pop overshoot.
      const size = Math.round(Math.min(60, r.width / 7.5, (r.width * 0.82) / (text.length * 0.62 * 1.4)));
      const pop = 1 + Math.max(0, alpha - 0.85) * 2.5;
      ctx.save();
      ctx.globalAlpha = alpha;
      ctx.translate(r.width / 2, r.height * 0.28);
      ctx.scale(pop * (1 + Math.max(0, alpha - 0.9)), pop);
      ctx.rotate(-0.05);
      textPop(ctx, text, 0, 0, "#ffd23f", size);
      ctx.restore();
    },

    // Warning stripes slam in, "BOSS!" wobbles, then it all slides away.
    bossBanner(ctx, t, r, o = {}) {
      const total = o.total || 2.4;
      const age = total - t;
      const inK = Math.min(1, age / 0.25);
      const outK = Math.min(1, t / 0.3);
      const W = r.width, H = r.height;
      const bandH = Math.min(120, H * 0.16);
      ctx.save();
      ctx.globalAlpha = outK;
      ctx.translate(W / 2, H * 0.3);
      ctx.rotate(-0.06);
      ctx.scale(1, inK < 1 ? inK * 1.2 : 1 + Math.max(0, 0.15 - (age - 0.25)) );
      // band
      ctx.save();
      ctx.beginPath();
      ctx.rect(-W, -bandH / 2, W * 2, bandH);
      ctx.fillStyle = "#ffd23f";
      ctx.fill();
      ctx.clip();
      ctx.fillStyle = INK;
      const off = (age * 60) % 40;
      for (let x = -W - 40; x < W + 40; x += 40) {
        ctx.beginPath();
        ctx.moveTo(x + off, -bandH / 2);
        ctx.lineTo(x + off + 20, -bandH / 2);
        ctx.lineTo(x + off + 20 - bandH * 0.4, bandH / 2);
        ctx.lineTo(x + off - bandH * 0.4, bandH / 2);
        ctx.fill();
      }
      ctx.restore();
      ctx.lineWidth = 6;
      ctx.strokeStyle = INK;
      ctx.strokeRect(-W, -bandH / 2, W * 2, bandH);
      // label plate
      const size = Math.round(Math.min(72, W / 6));
      const wob = Math.sin(age * 20) * 0.05 * Math.max(0, 1 - age);
      ctx.rotate(wob);
      const s = 1 + Math.max(0, 0.3 - age) * 1.5;
      ctx.scale(s, s);
      textPop(ctx, o.title || "BOSS!", 0, -size * 0.05, o.color || "#ff4757", size);
      ctx.restore();
      ctx.save();
      ctx.globalAlpha = outK * Math.min(1, Math.max(0, (age - 0.35) / 0.2));
      textPop(ctx, o.sub || "Big Red is coming!", W / 2, H * 0.3 + bandH / 2 + 26, "#ffffff", Math.round(Math.min(26, W / 16)));
      ctx.restore();
    },
  });
})();
