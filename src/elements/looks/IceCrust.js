// IceCrust (Frostbite freeze): a see-through ice shell with a snow cap while the enemy is frozen.
// Art: assets/sprites/looks/IceCrust/IceCrust_a_snap.q.png (3 frames, 30 fps, once on attach), then
// IceCrust_a.q.png (one static frame, held until thaw); Game Art & Motion v0.1.1: a round crust,
// and the last snap frame equals the static frame, so the hand-off to the hold has no pop.
// Attached by LookLayer when "frozen" starts, removed the frame it ends. Reduced motion: static frame only.
LST.IceCrust = LST.LookRegistry.register("frozen", class IceCrust extends LST.StatusLook {
  static get status() { return "frozen"; }
  static get sheet() { return "IceCrust"; }
  pick(strips, reduced) {
    const snap = strips.snap;
    if (!reduced && snap && !snap.done(this.t)) return ["snap", snap.index(this.t)];
    return ["main", 0];
  }
});
