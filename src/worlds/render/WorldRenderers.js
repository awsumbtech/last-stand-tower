// WorldRenderers: the one attach point between the Renderer (src/render.js) and the World 2 art.
//   background(world)     the backdrop object that owns a world's ground, or null (theme's lawn)
//   enemy(ctx, e, r, themeDraw)  true when a world renderer handled this enemy:
//       body renderers (crab, gull, Crabclaw) draw instead of the theme;
//       overlay renderers (Elite Big Red's shell) draw on top of the theme's own body.
//   groundHazards / airHazards   Captain Crabclaw's coconuts (under enemies / above the tower)
// Keyed by archetype id (PartEnemy.archetype) or enemy type. Backyard enemies have no entry,
// so the Backyard draws exactly as before.
LST.WorldRenderers = (function () {
  const lib = () => LST.world2Sheets;
  const bodies = {
    crab: new LST.HermitCrabRenderer(),
    gull: new LST.SeagullRenderer(),
    crabclaw: new LST.CrabclawRenderer(),
  };
  const overlays = { bigRedElite: new LST.EliteShellRenderer() };
  const backdrops = { BeachGround: new LST.BeachBackdrop() };
  const coconut = new LST.CoconutRenderer();
  return {
    bodies, overlays, backdrops, coconut, lib,
    background(world) { return world && world.art && world.art.background ? backdrops[world.art.background] || null : null; },
    enemy(ctx, e, r, themeDraw) {
      const key = e.archetype || e.type;
      const body = bodies[key];
      if (body) { body.draw(ctx, e, r); return true; }
      const over = overlays[key];
      if (over) { themeDraw(); over.draw(ctx, e, r); return true; }
      return false;
    },
    groundHazards(ctx, list) { for (const h of list) if (h.kind === "coconut") coconut.drawGround(ctx, h); },
    airHazards(ctx, list) { for (const h of list) if (h.kind === "coconut") coconut.drawAir(ctx, h); },
  };
})();
