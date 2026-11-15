// TextGlows: the glow behind coin popups and crit numbers.
// Drawn for FxRenderer (the batcher), which passes itself as `fx` for the theme and glow sprites.
LST.TextGlows = class TextGlows {
  // Glow behind bright pickups: coin popups and crit numbers.
  draw(fx, ctx, texts) {
    if (!texts.length) return;
    const G = LST.FX_PRESETS.glow, th = fx.theme;
    let started = false;
    for (let i = 0; i < texts.length; i++) {
      const t = texts[i];
      if (t.kind !== "coin" && t.kind !== "crit") continue;
      if (!started) { ctx.save(); ctx.globalCompositeOperation = th.blend; started = true; }
      const f = Math.min(1, (t.life / t.maxLife) * 3);
      const coin = t.kind === "coin";
      const R = coin ? G.coinRadius : G.critTextRadius;
      ctx.globalAlpha = (coin ? G.coinAlpha : G.critTextAlpha) * th.glow * f;
      ctx.drawImage(fx.glow(coin ? "#ffd23f" : "#ffb347"), t.x + (coin ? -13 : 0) - R, t.y - R, R * 2, R * 2);
    }
    if (started) ctx.restore();
  }
};
