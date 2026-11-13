// BurnFlames (Ember Rounds): a cartoon flame crown on the enemy while it burns.
// Art: assets/sprites/looks/BurnFlames/BurnFlames_a.q.png (6 frames, 10 fps loop; Game Art & Motion v0.1.1, stray pixel removed).
// Attached by LookLayer when "burn" starts, removed the frame it ends. Reduced motion: frame 0 held.
LST.BurnFlames = LST.LookRegistry.register("burn", class BurnFlames extends LST.StatusLook {
  static get status() { return "burn"; }
  static get sheet() { return "BurnFlames"; }
});
