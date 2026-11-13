// SparkCrackle (Chain Spark): sticker lightning bolts bursting off each enemy a bolt hits.
// Art: assets/sprites/looks/SparkCrackle/SparkCrackle_c.png (4 frames once over 0.22 s; Game Art & Motion v0.1.0).
// An event look: attached for `life` seconds by LookLayer on a Chain Spark hit, then removed.
// Reduced motion: the single peak frame (1) for its life, then gone.
LST.SparkCrackle = LST.LookRegistry.register("spark", class SparkCrackle extends LST.StatusLook {
  static get life() { return 0.22; }
  static get event() { return "chainSpark"; } // ELEMENT_HIT element id that triggers it
  static get sheet() { return "SparkCrackle"; }
  static get peakFrame() { return 1; }
  // the enemies standing on the bolt's hit points
  static targets(ev, enemies) {
    const at = ev.points && ev.points.length ? ev.points : [[ev.x, ev.y]];
    return enemies.filter((en) => !en.dead && at.some((p) => Math.abs(p[0] - en.x) < 2 && Math.abs(p[1] - en.y) < 2));
  }
  pick(strips, reduced) {
    if (this.t >= this.life) return null;
    return ["main", reduced ? SparkCrackle.peakFrame : strips.main.index(this.t)];
  }
});
