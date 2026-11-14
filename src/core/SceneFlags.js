// SceneFlags: what the renderer and the effects director may show for the current run-flow
// state, so they never compare state names. Each GameState returns one of these fixed sets
// (GameState.sceneFlags); DemoScene (the styles.html art demo, which has no flow) uses PLAYING.
//   showsFinaleIntro  the finale intro dim and FINALE banner may show (playing, paused)
//   banner            which canvas banner shows: "wave" (wave / boss / phase banners),
//                     "celebrate" (WAVE CLEAR!), "victory" (VICTORY!) or null
//   lowHpPulse        the red low-HP vignette pulses (playing only)
//   towerAura         the tower's upgrade aura emits (playing, celebrate, victory)
LST.SceneFlags = class SceneFlags {
  constructor({ showsFinaleIntro = false, banner = null, lowHpPulse = false, towerAura = false } = {}) {
    this.showsFinaleIntro = showsFinaleIntro;
    this.banner = banner;
    this.lowHpPulse = lowHpPulse;
    this.towerAura = towerAura;
    Object.freeze(this);
  }
};
LST.SceneFlags.NONE = new LST.SceneFlags();
LST.SceneFlags.PLAYING = new LST.SceneFlags({ showsFinaleIntro: true, banner: "wave", lowHpPulse: true, towerAura: true });
LST.SceneFlags.PAUSED = new LST.SceneFlags({ showsFinaleIntro: true, banner: "wave" });
LST.SceneFlags.CELEBRATE = new LST.SceneFlags({ banner: "celebrate", towerAura: true });
LST.SceneFlags.VICTORY = new LST.SceneFlags({ banner: "victory", towerAura: true });
