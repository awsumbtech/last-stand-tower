// OverlayLayer: screen-space feedback shared by every theme, then FxDirector's screen flashes.
// The red low-HP vignette (pulsing while SceneFlags.lowHpPulse) and the hit flash, as fx.json
// image effects (PR 10b): "lowHpVignette" (vignette_red over the screen, Decision 9) and
// "screenFlash" (the amber screen_burst, Decision 12; reduced motion skips it). Only their
// opacity is set here; nothing draws until the art is in.
LST.OverlayLayer = class OverlayLayer extends LST.RenderLayer {
  get space() { return "screen"; }
  draw(ctx, { r, scene, fx, reduced }) {
    const low = scene.lowHpActive && scene.sceneFlags.lowHpPulse ? 0.22 + 0.1 * Math.sin(r.time * 6) : 0;
    const v = Math.max(scene.vignette || 0, low), effects = (fx && fx.effects) || LST.fxManifest;
    if (v > 0.01 && effects) effects.draw("lowHpVignette", ctx, { x: 0, y: 0, w: r.width, h: r.height, alpha: Math.min(1, v) });
    if (scene.flash > 0.01 && !reduced && effects) { // softer when FX add their own bloom
      effects.draw("screenFlash", ctx, { x: r.width / 2, y: r.height / 2, base: Math.max(r.width, r.height), alpha: scene.flash * (r.fx ? 0.28 : 0.55) });
    }
    if (fx) fx.drawScreen(ctx, r);
  }
};
