// RenderPipeline: draws one canvas frame as an ordered list of RenderLayer objects:
//   BackdropLayer, EnemyLayer, TowerLayer, FxLayer   (world space)
//   HudCanvasLayer, OverlayLayer                     (screen space)
// The world layers run inside one world transform (origin at the screen center, scaled, with
// screen shake, snapped to art pixels for pixel themes); the screen layers run after it.
LST.RenderPipeline = class RenderPipeline {
  constructor(layers) {
    this.layers = layers || [new LST.BackdropLayer(), new LST.EnemyLayer(), new LST.TowerLayer(), new LST.FxLayer(), new LST.HudCanvasLayer(), new LST.OverlayLayer()];
    const first = this.layers.findIndex((l) => l.space === "screen");
    if (first >= 0 && this.layers.slice(first).some((l) => l.space !== "screen")) throw new Error("RenderPipeline: world layers must come before screen layers");
  }

  draw(r, ctx, scene) {
    // Effects (src/fx) are optional: r.fx is an FxDirector or null (styles.html demo).
    const fx = r.fx, ps = r.ps;
    const frame = { r, scene, theme: r.theme, fx, W: LST.WorldRenderers || null, reduced: fx ? fx.reducedMotion : false };
    let inWorld = false;
    for (const layer of this.layers) {
      if (layer.space === "world" && !inWorld) { this.beginWorld(ctx, frame, ps); inWorld = true; }
      if (layer.space === "screen" && inWorld) { ctx.restore(); inWorld = false; }
      layer.draw(ctx, frame);
    }
    if (inWorld) ctx.restore();
  }

  // World transform: origin at the center, plus screen shake.
  beginWorld(ctx, { r, scene, fx, reduced }, ps) {
    const snap = (v) => (ps ? Math.round(v / ps) * ps : v);
    const shakeAmt = reduced ? 0 : Math.max(scene.shake || 0, fx ? fx.shake : 0);
    const shake = shakeAmt > 0 ? shakeAmt * 8 : 0;
    ctx.save();
    ctx.translate(
      snap(r.width / 2 + (Math.random() - 0.5) * shake),
      snap(r.height / 2 + (Math.random() - 0.5) * shake)
    );
    ctx.scale(r.scale, r.scale);
  }
};
