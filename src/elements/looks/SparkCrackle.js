// SparkCrackle (Chain Spark): a brief crackle of zig-zag sparks on each enemy a bolt hits.
// An event look: attached for `life` seconds by the FX layer on a Chain Spark hit, then removed.
LST.SparkCrackle = LST.LookRegistry.register("spark", class SparkCrackle extends LST.StatusLook {
  static get life() { return 0.22; }
  static get event() { return "chainSpark"; } // ELEMENT_HIT element id that triggers it
  // the enemies standing on the bolt's hit points
  static targets(ev, enemies) {
    const at = ev.points && ev.points.length ? ev.points : [[ev.x, ev.y]];
    return enemies.filter((en) => !en.dead && at.some((p) => Math.abs(p[0] - en.x) < 2 && Math.abs(p[1] - en.y) < 2));
  }
  draw(ctx, e, reduced) {
    const R = LST.StatusLook.bodyR(e), f = 1 - this.t / this.life;
    ctx.globalAlpha = Math.max(0, f); ctx.lineCap = "round"; ctx.lineJoin = "round";
    for (let i = 0; i < 4; i++) {
      const a = this.seed + i * (Math.PI / 2) + (reduced ? 0 : this.t * 4), r0 = R * 0.85, r1 = R * 1.45;
      const px = (r) => e.x + Math.cos(a) * r, py = (r) => e.y + Math.sin(a) * r, nx = -Math.sin(a) * R * 0.18, ny = Math.cos(a) * R * 0.18;
      ctx.beginPath(); ctx.moveTo(px(r0), py(r0)); ctx.lineTo(px((r0 + r1) / 2) + nx, py((r0 + r1) / 2) + ny); ctx.lineTo(px(r1), py(r1));
      ctx.strokeStyle = LST.LOOK_INK; ctx.lineWidth = 6; ctx.stroke();
      ctx.strokeStyle = "#ffe14d"; ctx.lineWidth = 3.2; ctx.stroke();
    }
  }
});
