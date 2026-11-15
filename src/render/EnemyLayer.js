// EnemyLayer: ground debris (particles), death animations, World 2 baked shadows, then every
// living enemy (a world renderer's image body when it has one, else the theme's).
LST.EnemyLayer = class EnemyLayer extends LST.RenderLayer {
  draw(ctx, { r, scene, theme, W }) {
    for (const p of scene.particles) theme.particle(ctx, p, r);
    if (theme.corpse && scene.corpses) for (const c of scene.corpses) theme.corpse(ctx, c, r);
    if (W) W.shadows(ctx, scene.enemies, r); // World 2 baked shadows (gull) under every enemy
    for (const e of scene.enemies) {
      if (e.corpse) continue; // a Corpse now owns its look
      const hud = theme.enemyHud ? () => theme.enemyHud(ctx, e, r) : null; // reuse the theme's HP bar
      if (!(W && W.enemy(ctx, e, r, () => theme.enemy(ctx, e, r), hud))) theme.enemy(ctx, e, r);
    }
  }
};
