// TextGlows: the glow behind popup text. A popup of kind k plays the fx.json effect
// "textGlow.<k>" if there is one (today: coin popups and crit numbers), fading with the popup.
// Drawn for FxRenderer (the batcher), which passes itself as `fx` for the effect manifest.
LST.TextGlows = class TextGlows {
  draw(fx, ctx, texts) {
    for (let i = 0; i < texts.length; i++) {
      const t = texts[i];
      fx.effects.draw("textGlow." + t.kind, ctx, { x: t.x, y: t.y, p: 1 - t.life / t.maxLife });
    }
  }
};
