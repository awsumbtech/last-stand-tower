// HudCanvasLayer: screen-space canvas HUD. The finale intro dim, then one banner, picked by the
// scene's SceneFlags: WAVE CLEAR!, VICTORY!, or during a wave the FINALE / phase / BOSS / WAVE n
// banner.
LST.HudCanvasLayer = class HudCanvasLayer extends LST.RenderLayer {
  get space() { return "screen"; }
  draw(ctx, { r, scene, theme }) {
    const fin = scene.finale, flags = scene.sceneFlags; // SceneFlags (src/core/SceneFlags.js)
    if (fin && !fin.mole && !fin.won && flags.showsFinaleIntro) {
      // Finale intro: the lawn goes dark, then the banner slams in.
      const total = LST.CONFIG.finale.introTime;
      ctx.fillStyle = `rgba(30, 15, 40, ${0.45 * Math.min(1, (total - fin.intro) / 0.5)})`;
      ctx.fillRect(0, 0, r.width, r.height);
    }
    if (flags.banner === "celebrate") {
      theme.banner(ctx, "WAVE CLEAR!", Math.min(1, scene.celebrateTimer / 0.35), r);
    } else if (flags.banner === "victory") {
      theme.banner(ctx, "VICTORY!", Math.min(1, scene.victoryTimer / 0.35), r);
    } else if (flags.banner === "wave") {
      if (fin && !fin.mole && !fin.won && fin.intro < LST.CONFIG.finale.introTime - 0.4) {
        const t = Math.min(2.6, fin.intro);
        if (theme.bossBanner) theme.bossBanner(ctx, t, r, { total: 2.6, title: "FINALE!", sub: (scene.world && scene.world.copy.finaleSub) || "King Mole rises!", color: "#ffffff" });
        else theme.banner(ctx, "FINALE", Math.min(1, t), r);
      } else if (scene.phaseBanner) {
        const p = scene.phaseBanner;
        if (theme.bossBanner) theme.bossBanner(ctx, p.t, r, { total: p.max, title: p.text, sub: p.sub });
        else theme.banner(ctx, p.text, Math.min(1, p.t), r);
      } else if (scene.bossIntro > 0) {
        if (theme.bossBanner) theme.bossBanner(ctx, scene.bossIntro, r);
        else theme.banner(ctx, "BOSS", Math.min(1, scene.bossIntro), r);
      } else if (scene.waveIntro > 0) {
        theme.banner(ctx, `WAVE ${scene.wave}`, Math.min(1, scene.waveIntro), r);
      }
    }
  }
};
