// IceCrust (Frostbite freeze): a see-through ice shell with a snow cap while the enemy is frozen.
// Art: assets/sprites/looks/IceCrust/IceCrust_a_snap.png (3 frames, 30 fps, once on attach), then
// IceCrust_a.png (one static frame, held until thaw); Game Art & Motion v0.1.0. The last snap frame
// doesn't exactly match the static frame, so the cut goes straight to the static one.
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
