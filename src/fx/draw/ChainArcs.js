// ChainArcs: Chain Spark bolts. Each hop between the hit enemy and an arc target plays the
// fx.json effect "chainBolt" stretched along it (a jagged variant picked by the bolt's own
// random jag), and every struck point plays "chainArcFlash" and "chainNodeGlow". It only places
// them; looks, sizes and fades are the manifest entries and their art.
// Drawn for FxRenderer (the batcher), which passes itself as `fx` for the effect manifest.
LST.ChainArcs = class ChainArcs {
  draw(fx, ctx, arcs, low) {
    const E = fx.effects;
    for (const a of arcs) {
      const p = a.t / a.life;
      for (let i = 1; i < a.pts.length; i++) {
        const [x, y] = a.pts[i - 1], [x2, y2] = a.pts[i];
        E.draw("chainBolt", ctx, { x, y, x2, y2, p, index: i, pick: (a.jag[(i - 1) * 3] || 0) + 0.5, low });
      }
      for (const [x, y] of a.pts) {
        E.draw("chainArcFlash", ctx, { x, y, p, low });
        E.draw("chainNodeGlow", ctx, { x, y, p, low });
      }
    }
  }
};
