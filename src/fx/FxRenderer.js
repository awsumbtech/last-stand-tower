// FxRenderer: the effects batcher. It keeps the theme (LST.FX_THEMES: blend mode, glow strength,
// ink outlines) and the effect manifest (FxManifest: assets/fx/fx.json and its art), counts
// drawn particles for QA, and hands each kind of effect to its own drawer (src/fx/draw/*.js):
// TowerGroundGlow, ProjectileTrails, ChainArcs, TextGlows, ParticleBatch, ImpactPulses,
// ImpactFlashes. FxDirector calls the same methods as before.
LST.FxRenderer = class FxRenderer {
  constructor(doc, effects = LST.fxManifest) {
    this.doc = doc;
    this.effects = effects;
    this.theme = LST.FX_THEMES.cartoon;
    this.frame = 0;
    this.drawn = 0; // particles drawn last frame (QA)
    this.under = new LST.TowerGroundGlow();
    this.trails = new LST.ProjectileTrails();
    this.arcs = new LST.ChainArcs();
    this.textGlows = new LST.TextGlows();
    this.particles = new LST.ParticleBatch();
    this.pulses = new LST.ImpactPulses();
    this.flashes = new LST.ImpactFlashes();
  }

  setTheme(themeId) { this.theme = LST.FX_THEMES[themeId] || LST.FX_THEMES.cartoon; }
  // The glow image fx.json names for a preset colour (null until loaded / if unnamed). Used by
  // the drawers PR 10b converts (ParticleBatch, ProjectileTrails).
  glow(color) { return this.effects ? this.effects.glow(color) : null; }

  // World layer (inside the renderer's world transform)
  drawUnder(ctx, tower, aura, time) { this.under.draw(this, ctx, tower, aura, time); }
  drawProjectiles(ctx, list, low) { this.trails.draw(this, ctx, list, low); }
  drawArcs(ctx, arcs, low) { this.arcs.draw(this, ctx, arcs, low); }
  drawTextGlows(ctx, texts) { this.textGlows.draw(this, ctx, texts); }
  drawPool(ctx, pool, unitPx = 1, low = false) { this.drawn += pool.count; this.particles.draw(this, ctx, pool, unitPx, low); }
  drawPulses(ctx, camera, space, frame, unitPx = 1, low = false) { this.pulses.draw(this, ctx, camera, space, frame, unitPx, low); }
  // Screen layer
  drawFlashes(ctx, camera, r) { this.flashes.draw(this, ctx, camera, r); }
};
