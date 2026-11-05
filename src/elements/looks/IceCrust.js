// IceCrust (Frostbite freeze): an ice crust over the enemy while it's frozen solid: a frosty cap with
// a white highlight, ice chunks on the corners, optionally a see-through shell or hanging icicles
// (LOOK_VARIANTS.ice). Ice doesn't move: the only motion is a short "snap" grow on attach.
LST.IceCrust = LST.LookRegistry.register("frozen", class IceCrust extends LST.StatusLook {
  static get status() { return "frozen"; }
  static get kind() { return "ice"; }
  draw(ctx, e, reduced) {
    const C = this.cfg, R = LST.StatusLook.bodyR(e), K = LST.LookKit;
    const s = reduced ? 1 : Math.min(1, 0.6 + this.t * 6); // snaps on in ~0.07s
    ctx.translate(e.x, e.y); ctx.scale(s, s);
    const box = e.type === "tank";
    if (C.shell) {
      ctx.globalAlpha = 0.55;
      if (box) LST.draw.roundRect(ctx, -R * 1.15, -R * 1.15, R * 2.3, R * 2.3, R * 0.55); else { ctx.beginPath(); ctx.arc(0, 0, R * 1.18, 0, Math.PI * 2); }
      ctx.fillStyle = "#bff3ff"; ctx.fill();
      ctx.globalAlpha = 1; ctx.lineWidth = 3; ctx.strokeStyle = LST.LOOK_INK; ctx.stroke();
      ctx.beginPath(); ctx.moveTo(-R * 0.75, -R * 0.2); ctx.lineTo(-R * 0.25, -R * 0.75); // glint
      ctx.lineWidth = 3.5; ctx.strokeStyle = "#ffffff"; ctx.lineCap = "round"; ctx.stroke();
    }
    if (C.crust) { // frosty cap over the top edge, wavy bottom
      const w = R * 1.05, y0 = -R * 1.02;
      ctx.beginPath(); ctx.moveTo(-w, y0 + R * 0.1);
      ctx.quadraticCurveTo(-w, y0 - R * 0.2, -w * 0.5, y0 - R * 0.2); ctx.lineTo(w * 0.5, y0 - R * 0.2);
      ctx.quadraticCurveTo(w, y0 - R * 0.2, w, y0 + R * 0.1);
      for (let i = 0; i <= 4; i++) { const x = w - (i * 2 * w) / 4; ctx.quadraticCurveTo(x + w * 0.12, y0 + R * 0.45, x, y0 + R * (i % 2 ? 0.18 : 0.32)); }
      ctx.closePath(); K.ink(ctx, "#e9fbff", 3);
      ctx.beginPath(); ctx.moveTo(-w * 0.55, y0 - R * 0.06); ctx.lineTo(w * 0.1, y0 - R * 0.06);
      ctx.lineWidth = 3; ctx.strokeStyle = "#ffffff"; ctx.lineCap = "round"; ctx.stroke();
    }
    const chunk = (x, y, r, a) => { ctx.save(); ctx.translate(x, y); ctx.rotate(a); ctx.beginPath();
      ctx.moveTo(0, -r); ctx.lineTo(r * 0.85, -r * 0.2); ctx.lineTo(r * 0.5, r * 0.8); ctx.lineTo(-r * 0.6, r * 0.7); ctx.lineTo(-r * 0.9, -r * 0.25); ctx.closePath();
      K.ink(ctx, "#9fe6ff", 2.5); ctx.beginPath(); ctx.moveTo(-r * 0.35, -r * 0.35); ctx.lineTo(r * 0.15, -r * 0.6); ctx.strokeStyle = "#fff"; ctx.lineWidth = 2; ctx.stroke(); ctx.restore(); };
    const spots = [[R * 0.95, -R * 0.55, 0.3], [-R * 0.98, R * 0.35, -0.4], [R * 0.7, R * 0.85, 0.9]];
    for (let i = 0; i < C.chunks; i++) chunk(spots[i][0], spots[i][1], R * 0.3, spots[i][2]);
    for (let i = 0; i < C.icicles; i++) { // hanging from the bottom edge
      const x = -R * 0.66 + (i * R * 1.32) / Math.max(1, C.icicles - 1), h = R * (i % 2 ? 0.42 : 0.62);
      ctx.beginPath(); ctx.moveTo(x - R * 0.14, R * 0.92); ctx.lineTo(x + R * 0.14, R * 0.92); ctx.lineTo(x, R * 0.92 + h); ctx.closePath();
      K.ink(ctx, "#cdf6ff", 2.5);
    }
  }
});
