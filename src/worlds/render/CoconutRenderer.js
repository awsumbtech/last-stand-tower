// CoconutRenderer: Captain Crabclaw's coconuts, two layers.
//   ground  the CoconutWarning decal on the landing spot while it flies (frames spread over the
//           flight, sized to the coconut's hit zone), then the Coconut "splat" once after it lands
//   air     the Coconut "spin" loop on its arc (drawn raised by the arc height)
// Image frames only; nothing until each sheet has loaded.
LST.CoconutRenderer = class CoconutRenderer {
  constructor(library) {
    this.nut = new LST.SheetRenderer("Coconut", library);
    this.warn = new LST.SheetRenderer("CoconutWarning", library);
  }

  drawGround(ctx, c) {
    if (c.state === "flying") return this.warn.drawStrip(ctx, "warn", this.warn.frameFor("warn", c.progress), c.tx, c.ty, c.hitRadius);
    const t = c.t - c.flight;
    return this.nut.drawStrip(ctx, "splat", this.nut.frameFor("splat", t / c.splatLife), c.tx, c.ty, c.radius * 1.35);
  }

  drawAir(ctx, c) {
    if (c.state !== "flying") return false;
    return this.nut.drawStrip(ctx, "spin", this.nut.frameAt("spin", c.t), c.x, c.y - c.height, c.radius * 1.35);
  }
};
