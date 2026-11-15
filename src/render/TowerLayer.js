// TowerLayer: the tower's shots (FX trails, then the theme's projectiles), the tower itself,
// and airborne hazards (coconuts in flight) over it.
LST.TowerLayer = class TowerLayer extends LST.RenderLayer {
  draw(ctx, { r, scene, theme, fx, W }) {
    if (fx) fx.drawProjectiles(ctx, scene);
    for (const p of scene.projectiles) theme.projectile(ctx, p, r);
    theme.tower(ctx, scene.tower, r);
    if (W && scene.hazards && scene.hazards.length) W.airHazards(ctx, scene.hazards, r);
  }
};
