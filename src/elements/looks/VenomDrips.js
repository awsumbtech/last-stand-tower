// VenomDrips (Venom): green goo dripping off the enemy's bottom edge while it's poisoned.
// Art: assets/sprites/looks/VenomDrips/VenomDrips_a.png (4 frames, 8 fps loop; Game Art & Motion v0.1.0).
// Attached by LookLayer when "venom" starts, removed the frame it ends. Reduced motion: frame 0 held.
LST.VenomDrips = LST.LookRegistry.register("venom", class VenomDrips extends LST.StatusLook {
  static get status() { return "venom"; }
  static get sheet() { return "VenomDrips"; }
});
