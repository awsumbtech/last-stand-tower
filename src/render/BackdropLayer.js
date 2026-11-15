// BackdropLayer: the ground. The world's own backdrop (World 2) or the theme background, the
// range ring, ground hazards (coconut shadows), the FX ground glow under the tower and the
// Overdrive ring.
LST.BackdropLayer = class BackdropLayer extends LST.RenderLayer {
  constructor() { super(); this.overdrive = new LST.OverdriveRing(); }
  draw(ctx, { r, scene, theme, fx, W }) {
    const backdrop = W ? W.background(scene.world) : null;
    if (backdrop) backdrop.draw(ctx, r, scene); else theme.background(ctx, r, scene);
    theme.range(ctx, scene.tower, r);
    if (W && scene.hazards && scene.hazards.length) W.groundHazards(ctx, scene.hazards, r);
    if (fx) fx.drawUnder(ctx, scene, r);
    this.overdrive.draw(ctx, scene.tower, r.time);
  }
};
