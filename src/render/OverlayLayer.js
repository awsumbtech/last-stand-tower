// OverlayLayer: screen-space feedback shared by every theme, then FxDirector's screen flashes.
// The red low-HP vignette (pulsing while SceneFlags.lowHpPulse) and the hit flash; reduced
// motion skips the flash. Moved as-is out of render.js: the vignette and flash images are
// planned in PR 2 (LowHpVignette, ScreenFlash; Decisions 9 and 12).
LST.OverlayLayer = class OverlayLayer extends LST.RenderLayer {
  get space() { return "screen"; }
  draw(ctx, { r, scene, fx, reduced }) {
    const low = scene.lowHpActive && scene.sceneFlags.lowHpPulse ? 0.22 + 0.1 * Math.sin(r.time * 6) : 0;
    const v = Math.max(scene.vignette || 0, low);
    if (v > 0.01) {
      const w = r.width, h = r.height;
      const g = ctx.createRadialGradient(w / 2, h / 2, Math.min(w, h) * 0.3, w / 2, h / 2, Math.hypot(w, h) * 0.55);
      g.addColorStop(0, "rgba(255, 40, 70, 0)");
      g.addColorStop(1, `rgba(255, 40, 70, ${Math.min(0.75, v * 0.75)})`);
      ctx.fillStyle = g;
      ctx.fillRect(0, 0, w, h);
    }
    if (scene.flash > 0.01 && !reduced) { // softer when FX add their own bloom
      ctx.fillStyle = `rgba(255, 255, 255, ${scene.flash * (r.fx ? 0.28 : 0.55)})`;
      ctx.fillRect(0, 0, r.width, r.height);
    }
    if (fx) fx.drawScreen(ctx, r);
  }
};
