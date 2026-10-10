// Neon vector: dark space, glowing outlines, additive sparks. The default look.
LST.themes.neon = {
  id: "neon",
  name: "Neon",
  label: "Clean neon vector: glowing outlines on a dark grid",

  background(ctx, r) {
    const hw = r.halfW, hh = r.halfH;
    // Soft vignette: slightly lighter in the middle.
    const g = ctx.createRadialGradient(0, 0, 0, 0, 0, Math.hypot(hw, hh));
    g.addColorStop(0, "#0d0d22");
    g.addColorStop(1, "#05050c");
    ctx.fillStyle = g;
    ctx.fillRect(-hw, -hh, hw * 2, hh * 2);

    const step = 50;
    const w = Math.ceil(hw / step) * step;
    const h = Math.ceil(hh / step) * step;
    ctx.strokeStyle = "rgba(0, 240, 255, 0.05)";
    ctx.lineWidth = 1;
    ctx.beginPath();
    for (let x = -w; x <= w; x += step) { ctx.moveTo(x, -h); ctx.lineTo(x, h); }
    for (let y = -h; y <= h; y += step) { ctx.moveTo(-w, y); ctx.lineTo(w, y); }
    ctx.stroke();
  },

  range(ctx, tower, r) {
    ctx.save();
    ctx.beginPath();
    ctx.arc(tower.x, tower.y, tower.range, 0, Math.PI * 2);
    ctx.fillStyle = "rgba(0, 240, 255, 0.035)";
    ctx.fill();
    ctx.setLineDash([8, 10]);
    ctx.lineDashOffset = -r.time * 12;
    ctx.strokeStyle = "rgba(0, 240, 255, 0.35)";
    ctx.lineWidth = 1.5;
    ctx.stroke();
    ctx.restore();
  },

  tower(ctx, t, r) {
    const color = t.hitFlash > 0 ? "#ff4d6d" : "#00f0ff";
    ctx.save();
    ctx.translate(t.x, t.y);
    ctx.shadowColor = color;
    ctx.shadowBlur = 20;
    ctx.strokeStyle = color;
    ctx.lineWidth = 3;

    // Base: a slowly rotating hexagon with an inner ring.
    ctx.save();
    ctx.rotate(r.time * 0.3);
    LST.draw.polygon(ctx, 6, t.radius);
    ctx.fillStyle = "rgba(0, 240, 255, 0.12)";
    ctx.fill();
    ctx.stroke();
    ctx.lineWidth = 1;
    ctx.globalAlpha = 0.5;
    LST.draw.polygon(ctx, 6, t.radius * 0.7, Math.PI / 2);
    ctx.stroke();
    ctx.restore();

    // Barrel points at the current target and kicks back when firing.
    ctx.rotate(t.angle);
    ctx.fillStyle = color;
    ctx.fillRect(-t.recoil * 4, -4, t.radius + 10 - t.recoil * 4, 8);
    ctx.beginPath();
    ctx.arc(0, 0, t.radius * (0.45 + t.recoil * 0.05), 0, Math.PI * 2);
    ctx.fill();
    ctx.restore();
  },

  enemy(ctx, e) {
    const color = e.hitFlash > 0 ? "#ffffff" : e.color;
    ctx.save();
    ctx.globalAlpha = Math.min(1, e.age / 0.4); // fade in after spawning
    ctx.translate(e.x, e.y);
    ctx.shadowColor = e.color;
    ctx.shadowBlur = 12;
    ctx.strokeStyle = color;
    ctx.fillStyle = color + "33";
    ctx.lineWidth = 2.5;
    ctx.save();
    ctx.rotate(e.spin);
    if (e.shape === "circle") {
      ctx.beginPath();
      ctx.arc(0, 0, e.radius, 0, Math.PI * 2);
    } else if (e.shape === "triangle") {
      LST.draw.polygon(ctx, 3, e.radius * 1.2);
    } else if (e.shape === "square") {
      LST.draw.polygon(ctx, 4, e.radius * 1.2);
    } else {
      LST.draw.polygon(ctx, 6, e.radius);
    }
    ctx.fill();
    ctx.stroke();
    // Bright core
    ctx.fillStyle = color;
    ctx.beginPath();
    ctx.arc(0, 0, e.radius * 0.22, 0, Math.PI * 2);
    ctx.fill();
    ctx.restore();

    if (e.hp < e.maxHp) {
      ctx.shadowBlur = 0;
      const w = e.radius * 2;
      ctx.fillStyle = "rgba(255,255,255,0.15)";
      ctx.fillRect(-w / 2, -e.radius - 9, w, 3);
      ctx.fillStyle = e.color;
      ctx.fillRect(-w / 2, -e.radius - 9, w * Math.max(0, e.hp / e.maxHp), 3);
    }
    ctx.restore();
  },

  projectile(ctx, p) {
    ctx.save();
    // Short light trail
    ctx.strokeStyle = "rgba(0, 240, 255, 0.5)";
    ctx.lineWidth = 3;
    ctx.lineCap = "round";
    ctx.beginPath();
    ctx.moveTo(p.x - p.vx * 0.03, p.y - p.vy * 0.03);
    ctx.lineTo(p.x, p.y);
    ctx.stroke();
    ctx.shadowColor = "#00f0ff";
    ctx.shadowBlur = 10;
    ctx.fillStyle = "#c8fbff";
    ctx.beginPath();
    ctx.arc(p.x, p.y, p.radius, 0, Math.PI * 2);
    ctx.fill();
    ctx.restore();
  },

  particle(ctx, p) {
    ctx.globalAlpha = Math.max(0, p.life / p.maxLife);
    ctx.fillStyle = p.color;
    ctx.fillRect(p.x - p.size / 2, p.y - p.size / 2, p.size, p.size);
    ctx.globalAlpha = 1;
  },

  text(ctx, t) {
    ctx.globalAlpha = Math.max(0, t.life / t.maxLife);
    ctx.fillStyle = t.color;
    ctx.shadowColor = t.color;
    ctx.shadowBlur = 6;
    ctx.font = "bold 14px system-ui, sans-serif";
    ctx.textAlign = "center";
    ctx.fillText(t.text, t.x, t.y);
    ctx.shadowBlur = 0;
    ctx.globalAlpha = 1;
  },

  banner(ctx, text, alpha, r) {
    ctx.save();
    ctx.globalAlpha = alpha;
    ctx.fillStyle = "#00f0ff";
    ctx.shadowColor = "#00f0ff";
    ctx.shadowBlur = 16;
    ctx.font = `bold ${Math.round(Math.min(48, r.width / 10))}px system-ui, sans-serif`;
    ctx.textAlign = "center";
    ctx.fillText(text, r.width / 2, r.height * 0.3);
    ctx.restore();
  },
};
