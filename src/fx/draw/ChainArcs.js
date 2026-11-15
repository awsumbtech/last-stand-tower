// ChainArcs: Chain Spark bolts between the hit enemy and each arc target, with arc flashes.
// Drawn for FxRenderer (the batcher), which passes itself as `fx` for the theme and glow sprites.
LST.ChainArcs = class ChainArcs {
  // Chain Spark bolts: jagged lines between the hit enemy and each arc target, fading over ~0.2s.
  draw(fx, ctx, arcs, low) {
    const th = fx.theme;
    ctx.save();
    ctx.lineCap = "round"; ctx.lineJoin = "round";
    for (const a of arcs) {
      const f = 1 - a.t / a.life;
      ctx.beginPath();
      let j = 0;
      for (let i = 1; i < a.pts.length; i++) {
        const [x0, y0] = a.pts[i - 1];
        let [x1, y1] = a.pts[i];
        let L = Math.hypot(x1 - x0, y1 - y0);
        if (L < 56) { // bunched targets: draw the hop at least 56px long so it never collapses to a dot
          const ux = L > 1 ? (x1 - x0) / L : Math.cos(i * 2.1), uy = L > 1 ? (y1 - y0) / L : Math.sin(i * 2.1);
          x1 = x0 + ux * 56; y1 = y0 + uy * 56; L = 56;
        }
        const nx = -(y1 - y0), ny = x1 - x0;
        // Bunched targets: bow short bolts outward (alternating sides) so each hop reads as its own arc.
        const bow = L < 90 ? (90 - L) * 0.55 * (i % 2 ? 1 : -1) : 0;
        ctx.moveTo(x0, y0);
        for (let k = 1; k < 4; k++) {
          const off = a.jag[j++] * 22 + bow * Math.sin(Math.PI * k / 4);
          ctx.lineTo(x0 + (x1 - x0) * k / 4 + nx / L * off, y0 + (y1 - y0) * k / 4 + ny / L * off);
        }
        ctx.lineTo(x1, y1);
      }
      ctx.globalAlpha = Math.min(1, 1.6 * f); ctx.strokeStyle = th.ink || "#2a2410"; ctx.lineWidth = 7.5; ctx.stroke(); // dark underlay: reads on white hit-flash
      ctx.globalAlpha = Math.min(1, 1.4 * f); ctx.strokeStyle = a.color || "#ffe14d"; ctx.lineWidth = 4.5; ctx.stroke();
      ctx.strokeStyle = "#ffffff"; ctx.lineWidth = 1.8; ctx.stroke();
      // Arc flash: a bright ring on every struck enemy for the first part of the bolt's life.
      if (f > 0.45) {
        ctx.globalAlpha = (f - 0.45) / 0.55; ctx.strokeStyle = "#ffffff"; ctx.lineWidth = 2.5;
        for (const [x, y] of a.pts) { ctx.beginPath(); ctx.arc(x, y, 10 + (1 - f) * 22, 0, Math.PI * 2); ctx.stroke(); }
      }
      if (!low) {
        ctx.globalCompositeOperation = th.blend; ctx.globalAlpha = 0.5 * f;
        const g = fx.glow(a.color || "#ffe14d");
        for (const [x, y] of a.pts) ctx.drawImage(g, x - 24, y - 24, 48, 48);
        ctx.globalCompositeOperation = "source-over";
      }
    }
    ctx.restore();
  }
};
