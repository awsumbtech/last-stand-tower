// Cartoon theme: the lawn background (cached per screen size) and the range ring.
(function () {
  const K = LST.CartoonKit;
  const { rng } = K;

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

  // Theme methods (assembled into LST.themes.cartoon by index.js)
  Object.assign(K.methods, {
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
  });
})();
