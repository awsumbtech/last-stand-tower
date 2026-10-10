// Chunky cartoon: thick dark outlines, bright flat colors, googly eyes,
// and squash & stretch on everything that moves.
(function () {
  const INK = "#2b1d3a";
  const COLORS = {
    basic: { body: "#ff6fb5", shade: "#e04f98" },
    fast: { body: "#ffd23f", shade: "#e8b417" },
    tank: { body: "#ff9f43", shade: "#e07b1c" },
    boss: { body: "#ff4757", shade: "#d42a3a" },
  };

  // Grass tufts at fixed spots so the ground doesn't flicker.
  const TUFTS = [];
  for (let i = 0; i < 160; i++) {
    TUFTS.push([Math.sin(i * 12.9898) * 43758.5453 % 1, Math.sin(i * 78.233) * 12345.678 % 1, i % 3]);
  }

  function outlined(ctx, fill, width) {
    ctx.fillStyle = fill;
    ctx.fill();
    ctx.lineWidth = width;
    ctx.strokeStyle = INK;
    ctx.stroke();
  }

  function eyes(ctx, e, spread, size, lookAngle, angry) {
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

  function textPop(ctx, str, x, y, fill, size) {
    ctx.font = `900 ${size}px "Arial Rounded MT Bold", "Trebuchet MS", system-ui, sans-serif`;
    ctx.textAlign = "center";
    ctx.textBaseline = "middle";
    ctx.lineJoin = "round";
    ctx.lineWidth = size * 0.28;
    ctx.strokeStyle = INK;
    ctx.strokeText(str, x, y);
    ctx.fillStyle = fill;
    ctx.fillText(str, x, y);
  }

  LST.themes.cartoon = {
    id: "cartoon",
    name: "Cartoon",
    label: "Chunky cartoon: thick outlines, flat colors, squash & stretch",

    background(ctx, r) {
      const hw = r.halfW, hh = r.halfH;
      ctx.fillStyle = "#86d160";
      ctx.fillRect(-hw, -hh, hw * 2, hh * 2);
      ctx.strokeStyle = "#6cbb48";
      ctx.lineWidth = 3;
      ctx.lineCap = "round";
      for (const [u, v, k] of TUFTS) {
        const x = u * hw, y = v * hh;
        ctx.beginPath();
        ctx.moveTo(x - 5, y + 4); ctx.lineTo(x - 7, y - 4);
        ctx.moveTo(x, y + 4); ctx.lineTo(x, y - 7 - k);
        ctx.moveTo(x + 5, y + 4); ctx.lineTo(x + 7, y - 4);
        ctx.stroke();
      }
    },

    range(ctx, tower) {
      ctx.save();
      ctx.beginPath();
      ctx.arc(tower.x, tower.y, tower.range, 0, Math.PI * 2);
      ctx.fillStyle = "rgba(255, 255, 255, 0.14)";
      ctx.fill();
      ctx.setLineDash([14, 12]);
      ctx.lineWidth = 4;
      ctx.lineCap = "round";
      ctx.strokeStyle = "rgba(255, 255, 255, 0.7)";
      ctx.stroke();
      ctx.restore();
    },

    tower(ctx, t) {
      const R = t.radius * 1.15;
      // Squash when hit, a little bounce when firing.
      const hit = t.hitFlash / 0.2;
      const sx = 1 + hit * 0.15 + t.recoil * 0.04;
      const sy = 1 - hit * 0.12 - t.recoil * 0.04;
      ctx.save();
      ctx.translate(t.x, t.y);

      // Drop shadow
      ctx.beginPath();
      ctx.ellipse(4, 8, R * 1.1, R * 0.9, 0, 0, Math.PI * 2);
      ctx.fillStyle = "rgba(43, 29, 58, 0.25)";
      ctx.fill();

      ctx.save();
      ctx.scale(sx, sy);
      // Crenellations around the rim
      for (let i = 0; i < 8; i++) {
        ctx.save();
        ctx.rotate((i / 8) * Math.PI * 2);
        LST.draw.roundRect(ctx, R - 6, -7, 12, 14, 3);
        outlined(ctx, "#a9b4cf", 4);
        ctx.restore();
      }
      ctx.beginPath();
      ctx.arc(0, 0, R, 0, Math.PI * 2);
      outlined(ctx, hit > 0 ? "#ff8a8a" : "#c9d3ea", 5);
      ctx.beginPath();
      ctx.arc(0, 0, R * 0.62, 0, Math.PI * 2);
      outlined(ctx, "#8f9bba", 4);
      ctx.restore();

      // Cannon: gets short and fat right after a shot, then springs back.
      ctx.rotate(t.angle);
      const len = R + 14 - t.recoil * 8;
      const thick = 15 + t.recoil * 6;
      LST.draw.roundRect(ctx, -4, -thick / 2, len, thick, 6);
      outlined(ctx, "#5b6b8c", 4);
      LST.draw.roundRect(ctx, len - 10, -thick / 2 - 3, 12, thick + 6, 4);
      outlined(ctx, "#46536f", 4);
      ctx.beginPath();
      ctx.arc(0, 0, R * 0.38, 0, Math.PI * 2);
      outlined(ctx, "#5b6b8c", 4);
      ctx.restore();
    },

    enemy(ctx, e) {
      const c = COLORS[e.type];
      const tower = { x: 0, y: 0 };
      const look = Math.atan2(tower.y - e.y, tower.x - e.x);
      const pop = Math.min(1, e.age / 0.3); // pop in with a bounce
      const grow = pop < 1 ? 0.6 + 0.6 * pop - 0.2 * pop * pop : 1;
      // Squash & stretch walk cycle
      const freq = e.type === "fast" ? 18 : e.type === "basic" ? 10 : 6;
      const w = Math.sin(e.age * freq);
      const sx = (1 + 0.12 * w) * grow;
      const sy = (1 - 0.12 * w) * grow;
      const R = e.radius * 1.25;
      const fill = e.hitFlash > 0 ? "#ffffff" : c.body;

      ctx.save();
      ctx.translate(e.x, e.y);
      ctx.beginPath();
      ctx.ellipse(2, R * 0.85, R * 0.9, R * 0.35, 0, 0, Math.PI * 2);
      ctx.fillStyle = "rgba(43, 29, 58, 0.22)";
      ctx.fill();

      ctx.save();
      ctx.scale(sx, sy);
      ctx.lineJoin = "round";
      if (e.type === "basic") {
        ctx.beginPath();
        ctx.arc(0, 0, R, 0, Math.PI * 2);
        outlined(ctx, fill, 3.5);
        eyes(ctx, e, R * 0.38, R * 0.28, look, false);
      } else if (e.type === "fast") {
        // Teardrop pointing where it's going
        ctx.save();
        ctx.rotate(look + Math.PI / 2);
        ctx.beginPath();
        ctx.moveTo(0, -R * 1.5);
        ctx.quadraticCurveTo(R * 1.2, R * 0.2, 0, R);
        ctx.quadraticCurveTo(-R * 1.2, R * 0.2, 0, -R * 1.5);
        outlined(ctx, fill, 3);
        ctx.restore();
        eyes(ctx, e, R * 0.35, R * 0.3, look, false);
      } else if (e.type === "tank") {
        LST.draw.roundRect(ctx, -R, -R, R * 2, R * 2, R * 0.45);
        outlined(ctx, fill, 4);
        // Helmet band
        LST.draw.roundRect(ctx, -R, -R, R * 2, R * 0.7, R * 0.4);
        outlined(ctx, e.hitFlash > 0 ? "#ffffff" : c.shade, 3.5);
        ctx.save();
        ctx.translate(0, R * 0.25);
        eyes(ctx, e, R * 0.4, R * 0.22, look, true);
        ctx.restore();
      } else {
        // Boss: big blob with horns and angry brows
        for (const side of [-1, 1]) {
          ctx.beginPath();
          ctx.moveTo(side * R * 0.45, -R * 0.75);
          ctx.quadraticCurveTo(side * R * 1.1, -R * 1.2, side * R * 0.95, -R * 1.65);
          ctx.quadraticCurveTo(side * R * 0.65, -R * 1.05, side * R * 0.15, -R * 0.9);
          outlined(ctx, "#fff3d6", 3.5);
        }
        ctx.beginPath();
        ctx.arc(0, 0, R, 0, Math.PI * 2);
        outlined(ctx, fill, 5);
        eyes(ctx, e, R * 0.36, R * 0.22, look, true);
        // Toothy grin
        ctx.beginPath();
        ctx.moveTo(-R * 0.45, R * 0.35);
        ctx.quadraticCurveTo(0, R * 0.7, R * 0.45, R * 0.35);
        ctx.closePath();
        outlined(ctx, "#ffffff", 3);
      }
      ctx.restore();

      if (e.hp < e.maxHp) {
        const bw = R * 2;
        LST.draw.roundRect(ctx, -bw / 2, -R * 1.5 - 10, bw, 7, 3.5);
        outlined(ctx, "#ffffff", 2.5);
        const f = Math.max(0, e.hp / e.maxHp);
        if (f > 0.05) {
          LST.draw.roundRect(ctx, -bw / 2 + 1.5, -R * 1.5 - 8.5, (bw - 3) * f, 4, 2);
          ctx.fillStyle = "#3ddc84";
          ctx.fill();
        }
      }
      ctx.restore();
    },

    projectile(ctx, p) {
      // Cannonball stretched along its direction of travel
      const a = Math.atan2(p.vy, p.vx);
      ctx.save();
      ctx.translate(p.x, p.y);
      ctx.rotate(a);
      ctx.beginPath();
      ctx.ellipse(0, 0, 8, 5.5, 0, 0, Math.PI * 2);
      outlined(ctx, "#ffe14d", 2.5);
      ctx.beginPath();
      ctx.arc(1.5, -1.5, 1.8, 0, Math.PI * 2);
      ctx.fillStyle = "#ffffff";
      ctx.fill();
      ctx.restore();
    },

    particle(ctx, p) {
      const f = Math.max(0, p.life / p.maxLife);
      ctx.beginPath();
      ctx.arc(p.x, p.y, p.size * 1.3 * (0.4 + f * 0.8), 0, Math.PI * 2);
      outlined(ctx, p.color === "#00f0ff" ? "#7fd8ff" : p.color, 1.5);
    },

    text(ctx, t) {
      const f = t.life / t.maxLife;
      const bounce = 1 + Math.max(0, (f - 0.75) * 2); // pops big, then settles
      ctx.save();
      ctx.globalAlpha = Math.min(1, f * 3);
      ctx.translate(t.x, t.y);
      ctx.scale(bounce, bounce);
      if (t.kind === "coin") {
        ctx.beginPath();
        ctx.arc(-14, 0, 7, 0, Math.PI * 2);
        outlined(ctx, "#ffd23f", 2.5);
        ctx.beginPath();
        ctx.arc(-14, 0, 3, 0, Math.PI * 2);
        ctx.strokeStyle = "#e8a417";
        ctx.lineWidth = 1.5;
        ctx.stroke();
        textPop(ctx, t.text, 6, 0, "#fff3b0", 18);
      } else {
        textPop(ctx, t.text, 0, 0, "#ff6b6b", 18);
      }
      ctx.restore();
    },

    banner(ctx, text, alpha, r) {
      const size = Math.round(Math.min(56, r.width / 8));
      const pop = 1 + Math.max(0, alpha - 0.85) * 2;
      ctx.save();
      ctx.globalAlpha = alpha;
      ctx.translate(r.width / 2, r.height * 0.3);
      ctx.scale(pop, pop);
      ctx.rotate(-0.05);
      textPop(ctx, text, 0, 0, "#ffd23f", size);
      ctx.restore();
    },
  };
})();
