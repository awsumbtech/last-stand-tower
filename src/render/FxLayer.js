// FxLayer: world effects over everything else. FxDirector's world effects (status looks, arcs,
// pulses, particles), impact bursts, confetti, popup glows and the popup numbers.
LST.FxLayer = class FxLayer extends LST.RenderLayer {
  draw(ctx, { r, scene, theme, fx }) {
    if (fx) fx.drawWorld(ctx, scene);
    if (theme.burst) for (const b of scene.bursts) theme.burst(ctx, b, r);
    if (scene.confetti) for (const c of scene.confetti) (theme.confetti || LST.draw.confetti)(ctx, c, r);
    if (fx) fx.drawTextGlows(ctx, scene);
    for (const t of scene.texts) theme.text(ctx, t, r);
  }
};
