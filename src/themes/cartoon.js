// Chunky cartoon (the default look): thick ink outlines, bright flat colors,
// googly eyes, a tower with a face, and squash & stretch on everything that moves.
(function () {
  const INK = "#2b1d3a";
  const FONT = 'Fredoka, "Arial Rounded MT Bold", "Trebuchet MS", system-ui, sans-serif';
  const COLORS = {
    basic: { body: "#ff6fb5", shade: "#e04f98" },
    fast: { body: "#ffd23f", shade: "#e8b417" },
    tank: { body: "#ff9f43", shade: "#e07b1c" },
    boss: { body: "#ff4757", shade: "#d42a3a" },
  };

  // Small seeded random so the ground looks the same every frame.
  function rng(seed) {
    let s = seed >>> 0;
    return () => ((s = (s * 1664525 + 1013904223) >>> 0) / 4294967296);
  }

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

  // ---------- Ground (drawn once per screen size into a cached canvas) ----------
  const ground = { canvas: null, key: "" };

  function buildGround(r) {
    const margin = 16; // CSS px of overdraw so screen shake never shows an edge
    const w = r.width + margin * 2, h = r.height + margin * 2;
    const c = document.createElement("canvas");
    c.width = Math.ceil(w * r.dpr);
    c.height = Math.ceil(h * r.dpr);
    const g = c.getContext("2d");
    g.setTransform(r.dpr * r.scale, 0, 0, r.dpr * r.scale, (w / 2) * r.dpr, (h / 2) * r.dpr);
    const hw = w / 2 / r.scale, hh = h / 2 / r.scale;

    // Mowed-lawn checker
    const T = 90;
    for (let y = Math.floor(-hh / T) - 1; y * T < hh; y++) {
      for (let x = Math.floor(-hw / T) - 1; x * T < hw; x++) {
        g.fillStyle = (x + y) & 1 ? "#8fd468" : "#86cc5f";
        g.fillRect(x * T, y * T, T + 1, T + 1);
      }
    }

    const rand = rng(1337);
    const area = (hw * hh * 4) / 10000;
    // Grass tufts
    g.strokeStyle = "#6cba4e";
    g.lineWidth = 3;
    g.lineCap = "round";
    for (let i = 0; i < area * 5; i++) {
      const x = (rand() * 2 - 1) * hw, y = (rand() * 2 - 1) * hh;
      if (Math.hypot(x, y) < 85) continue;
      const k = 5 + rand() * 4;
      g.beginPath();
      g.moveTo(x - 5, y + 4); g.lineTo(x - 7, y - k * 0.6);
      g.moveTo(x, y + 4); g.lineTo(x, y - k);
      g.moveTo(x + 5, y + 4); g.lineTo(x + 7, y - k * 0.6);
      g.stroke();
    }
    // Pebbles
    for (let i = 0; i < area * 0.35; i++) {
      const x = (rand() * 2 - 1) * hw, y = (rand() * 2 - 1) * hh;
      if (Math.hypot(x, y) < 90) continue;
      g.beginPath();
      g.ellipse(x, y, 6 + rand() * 4, 4 + rand() * 3, rand() * 3, 0, Math.PI * 2);
      g.fillStyle = "#a8c98a";
      g.fill();
      g.lineWidth = 2.5;
      g.strokeStyle = "#6a9d4c";
      g.stroke();
    }
    // Flowers
    const petals = ["#ffffff", "#ffb3d9", "#fff176", "#b3e5ff"];
    for (let i = 0; i < area * 0.7; i++) {
      const x = (rand() * 2 - 1) * hw, y = (rand() * 2 - 1) * hh;
      if (Math.hypot(x, y) < 90) continue;
      const col = petals[Math.floor(rand() * petals.length)];
      g.fillStyle = col;
      g.strokeStyle = "#4f8f37";
      g.lineWidth = 1.5;
      for (let p = 0; p < 5; p++) {
        const a = (p / 5) * Math.PI * 2;
        g.beginPath();
        g.arc(x + Math.cos(a) * 4, y + Math.sin(a) * 4, 3.4, 0, Math.PI * 2);
        g.fill();
        g.stroke();
      }
      g.beginPath();
      g.arc(x, y, 2.6, 0, Math.PI * 2);
      g.fillStyle = "#ffa726";
      g.fill();
    }
    // Dirt patch the tower stands on
    g.beginPath();
    g.ellipse(0, 6, 72, 62, 0, 0, Math.PI * 2);
    g.fillStyle = "#e3c88f";
    g.fill();
    g.lineWidth = 4;
    g.strokeStyle = "#b99a5e";
    g.stroke();
    // Soft vignette keeps the edges calm and the middle readable
    g.setTransform(r.dpr, 0, 0, r.dpr, 0, 0);
    const vg = g.createRadialGradient(w / 2, h / 2, Math.min(w, h) * 0.35, w / 2, h / 2, Math.hypot(w, h) * 0.6);
    vg.addColorStop(0, "rgba(43,29,58,0)");
    vg.addColorStop(1, "rgba(43,29,58,0.22)");
    g.fillStyle = vg;
    g.fillRect(0, 0, w, h);
    ground.canvas = c;
    ground.margin = margin;
  }

  LST.themes.cartoon = {
    id: "cartoon",
    name: "Cartoon",
    label: "Chunky cartoon: thick outlines, flat colors, squash & stretch",

    background(ctx, r) {
      const key = [r.width, r.height, r.dpr, r.scale].join("x");
      if (ground.key !== key) {
        buildGround(r);
        ground.key = key;
      }
      const m = ground.margin / r.scale;
      ctx.drawImage(ground.canvas, -r.halfW - m, -r.halfH - m, r.halfW * 2 + m * 2, r.halfH * 2 + m * 2);
    },

    range(ctx, tower, r) {
      ctx.save();
      ctx.beginPath();
      ctx.arc(tower.x, tower.y, tower.range, 0, Math.PI * 2);
      ctx.fillStyle = "rgba(255, 255, 255, 0.13)";
      ctx.fill();
      ctx.setLineDash([16, 12]);
      ctx.lineDashOffset = -r.time * 10;
      ctx.lineWidth = 4;
      ctx.lineCap = "round";
      ctx.strokeStyle = "rgba(255, 255, 255, 0.75)";
      ctx.stroke();
      ctx.restore();
    },

    tower(ctx, t, r) {
      const R = t.radius * 1.35;
      const hit = t.hitFlash / 0.2;
      const low = t.hp / t.maxHp < 0.35;
      // Squash when hit, a little bounce when firing, gentle breathing otherwise.
      const breathe = Math.sin(r.time * 2.2) * 0.02;
      const sx = 1 + hit * 0.16 + t.recoil * 0.04 + breathe;
      const sy = 1 - hit * 0.13 - t.recoil * 0.04 - breathe;
      ctx.save();
      // Recoil: the whole tower gets shoved back a few units opposite the shot.
      const kick = t.recoil * t.recoil * 5;
      ctx.translate(t.x - Math.cos(t.angle) * kick, t.y - Math.sin(t.angle) * kick);

      ctx.beginPath();
      ctx.ellipse(4, 10, R * 1.15, R * 0.9, 0, 0, Math.PI * 2);
      ctx.fillStyle = "rgba(43, 29, 58, 0.25)";
      ctx.fill();

      // Cannon sits behind the body; it gets short and fat right after a shot.
      ctx.save();
      ctx.rotate(t.angle);
      const len = R + 20 - t.recoil * 9;
      const thick = 16 + t.recoil * 6;
      LST.draw.roundRect(ctx, 0, -thick / 2, len, thick, 7);
      outlined(ctx, "#5b6b8c", 4);
      LST.draw.roundRect(ctx, len - 11, -thick / 2 - 3.5, 13, thick + 7, 5);
      outlined(ctx, "#46536f", 4);
      ctx.restore();

      ctx.save();
      ctx.scale(sx, sy);
      for (let i = 0; i < 8; i++) {
        ctx.save();
        ctx.rotate((i / 8) * Math.PI * 2 + Math.PI / 8);
        LST.draw.roundRect(ctx, R - 7, -8, 13, 16, 4);
        outlined(ctx, "#b9c3dc", 4);
        ctx.restore();
      }
      ctx.beginPath();
      ctx.arc(0, 0, R, 0, Math.PI * 2);
      outlined(ctx, hit > 0 ? "#ff9a9a" : "#e6ecf8", 5);
      // highlight
      ctx.beginPath();
      ctx.arc(-R * 0.35, -R * 0.45, R * 0.22, 0, Math.PI * 2);
      ctx.fillStyle = "rgba(255,255,255,0.8)";
      ctx.fill();

      // ---- Face ----
      const look = t.angle;
      const ex = R * 0.34, ey = -R * 0.05, er = R * 0.21;
      const blink = r.time % 3.7 < 0.13;
      ctx.lineCap = "round";
      ctx.lineJoin = "round";
      for (const side of [-1, 1]) {
        const x = side * ex;
        if (hit > 0) {
          // > < squint
          ctx.beginPath();
          ctx.moveTo(x - side * er * 0.8, ey - er * 0.7);
          ctx.lineTo(x + side * er * 0.6, ey);
          ctx.lineTo(x - side * er * 0.8, ey + er * 0.7);
          ctx.lineWidth = 4;
          ctx.strokeStyle = INK;
          ctx.stroke();
        } else if (blink) {
          ctx.beginPath();
          ctx.moveTo(x - er * 0.8, ey);
          ctx.quadraticCurveTo(x, ey + er * 0.6, x + er * 0.8, ey);
          ctx.lineWidth = 4;
          ctx.strokeStyle = INK;
          ctx.stroke();
        } else {
          ctx.beginPath();
          ctx.ellipse(x, ey, er, er * 1.15, 0, 0, Math.PI * 2);
          outlined(ctx, "#ffffff", 3);
          ctx.beginPath();
          ctx.arc(x + Math.cos(look) * er * 0.38, ey + Math.sin(look) * er * 0.45, er * 0.55, 0, Math.PI * 2);
          ctx.fillStyle = INK;
          ctx.fill();
          ctx.beginPath();
          ctx.arc(x + Math.cos(look) * er * 0.38 - er * 0.18, ey + Math.sin(look) * er * 0.45 - er * 0.2, er * 0.18, 0, Math.PI * 2);
          ctx.fillStyle = "#ffffff";
          ctx.fill();
        }
        if (low) {
          // worried brows
          ctx.beginPath();
          ctx.moveTo(x - side * er * 0.9, ey - er * 1.75);
          ctx.lineTo(x + side * er * 0.8, ey - er * 1.35);
          ctx.lineWidth = 3.5;
          ctx.strokeStyle = INK;
          ctx.stroke();
        }
        // cheeks
        ctx.beginPath();
        ctx.ellipse(x + side * er * 0.7, ey + er * 1.45, er * 0.55, er * 0.32, 0, 0, Math.PI * 2);
        ctx.fillStyle = "rgba(255, 111, 181, 0.55)";
        ctx.fill();
      }
      // Mouth: "O" when it just fired, wobbly line when hurt, smile otherwise
      ctx.beginPath();
      if (t.recoil > 0.55) {
        ctx.ellipse(0, R * 0.42, R * 0.12, R * 0.15, 0, 0, Math.PI * 2);
        outlined(ctx, "#7a2840", 3);
      } else if (low || hit > 0) {
        ctx.moveTo(-R * 0.2, R * 0.48);
        ctx.quadraticCurveTo(-R * 0.1, R * 0.38, 0, R * 0.46);
        ctx.quadraticCurveTo(R * 0.1, R * 0.54, R * 0.2, R * 0.44);
        ctx.lineWidth = 3.5;
        ctx.strokeStyle = INK;
        ctx.stroke();
      } else {
        ctx.moveTo(-R * 0.2, R * 0.36);
        ctx.quadraticCurveTo(0, R * 0.58, R * 0.2, R * 0.36);
        ctx.lineWidth = 3.5;
        ctx.strokeStyle = INK;
        ctx.stroke();
      }
      if (low) {
        // sweat drop
        const d = (r.time * 1.5) % 1;
        ctx.beginPath();
        ctx.moveTo(R * 0.72, -R * 0.55 + d * 8);
        ctx.quadraticCurveTo(R * 0.92, -R * 0.2 + d * 8, R * 0.72, -R * 0.15 + d * 8);
        ctx.quadraticCurveTo(R * 0.52, -R * 0.2 + d * 8, R * 0.72, -R * 0.55 + d * 8);
        outlined(ctx, "#8fdcff", 2.5);
      }
      ctx.restore();
      ctx.restore();
    },

    enemy(ctx, e) {
      const c = COLORS[e.type];
      const look = Math.atan2(-e.y, -e.x); // toward the tower at 0,0
      const pop = Math.min(1, e.age / (e.type === "boss" ? 0.6 : 0.3)); // pop in with a bounce
      const grow = pop < 1 ? 0.5 + 0.8 * pop - 0.3 * pop * pop : 1;
      const freq = e.type === "fast" ? 18 : e.type === "basic" ? 10 : 6;
      const w = Math.sin(e.age * freq);
      const sx = (1 + 0.12 * w) * grow;
      const sy = (1 - 0.12 * w) * grow;
      const R = e.radius * 1.35;
      const flash = e.hitFlash > 0;
      const fill = flash ? "#ffffff" : c.body;

      ctx.save();
      ctx.translate(e.x, e.y);
      ctx.beginPath();
      ctx.ellipse(2, R * 0.85, R * 0.9, R * 0.35, 0, 0, Math.PI * 2);
      ctx.fillStyle = "rgba(43, 29, 58, 0.22)";
      ctx.fill();

      ctx.save();
      // Squash a bit harder on the frame it gets hit
      ctx.scale(sx * (flash ? 1.12 : 1), sy * (flash ? 0.88 : 1));
      ctx.lineJoin = "round";
      if (e.type === "basic") {
        ctx.beginPath();
        ctx.arc(0, 0, R, 0, Math.PI * 2);
        outlined(ctx, fill, 3.5);
        eyes(ctx, R * 0.38, R * 0.28, look, false);
      } else if (e.type === "fast") {
        ctx.save();
        ctx.rotate(look + Math.PI / 2);
        ctx.beginPath();
        ctx.moveTo(0, -R * 1.5);
        ctx.quadraticCurveTo(R * 1.2, R * 0.2, 0, R);
        ctx.quadraticCurveTo(-R * 1.2, R * 0.2, 0, -R * 1.5);
        outlined(ctx, fill, 3);
        ctx.restore();
        eyes(ctx, R * 0.35, R * 0.3, look, false);
      } else if (e.type === "tank") {
        LST.draw.roundRect(ctx, -R, -R, R * 2, R * 2, R * 0.45);
        outlined(ctx, fill, 4);
        LST.draw.roundRect(ctx, -R, -R, R * 2, R * 0.7, R * 0.4);
        outlined(ctx, flash ? "#ffffff" : c.shade, 3.5);
        ctx.save();
        ctx.translate(0, R * 0.25);
        eyes(ctx, R * 0.4, R * 0.22, look, true);
        ctx.restore();
      } else {
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
        eyes(ctx, R * 0.36, R * 0.22, look, true);
        ctx.beginPath();
        ctx.moveTo(-R * 0.45, R * 0.35);
        ctx.quadraticCurveTo(0, R * 0.7, R * 0.45, R * 0.35);
        ctx.closePath();
        outlined(ctx, "#ffffff", 3);
      }
      ctx.restore();

      if (e.hp < e.maxHp) {
        const bw = Math.max(26, R * 2);
        const by = -R * (e.type === "boss" ? 1.85 : 1.5) - 10;
        LST.draw.roundRect(ctx, -bw / 2, by, bw, 8, 4);
        outlined(ctx, "#ffffff", 2.5);
        const f = Math.max(0, e.hp / e.maxHp);
        if (f > 0.05) {
          LST.draw.roundRect(ctx, -bw / 2 + 1.5, by + 1.5, (bw - 3) * f, 5, 2.5);
          ctx.fillStyle = f < 0.35 ? "#ff4757" : "#3ddc84";
          ctx.fill();
        }
      }
      ctx.restore();
    },

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

    burst(ctx, b) {
      const f = 1 - b.life / b.maxLife; // 0 -> 1
      ctx.save();
      ctx.translate(b.x, b.y);
      ctx.rotate(b.rot);
      ctx.lineJoin = "round";
      if (b.kind === "hit") {
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
    bossBanner(ctx, t, r) {
      const total = 2.4;
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
      textPop(ctx, "BOSS!", 0, -size * 0.05, "#ff4757", size);
      ctx.restore();
      ctx.save();
      ctx.globalAlpha = outK * Math.min(1, Math.max(0, (age - 0.35) / 0.2));
      textPop(ctx, "Big Red is coming!", W / 2, H * 0.3 + bandH / 2 + 26, "#ffffff", Math.round(Math.min(26, W / 16)));
      ctx.restore();
    },
  };
})();
