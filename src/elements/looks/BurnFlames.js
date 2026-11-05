// BurnFlames (Ember Rounds): chunky cartoon flame tongues licking up from the enemy's top and sides
// while it burns. Three nested shapes per tongue (red -> orange -> yellow) with a thick ink outline;
// each tongue flickers on its own phase (height + sway). Reduced motion: a still pose.
LST.BurnFlames = LST.LookRegistry.register("burn", class BurnFlames extends LST.StatusLook {
  static get status() { return "burn"; }
  static get kind() { return "flame"; }
  draw(ctx, e, reduced) {
    const C = this.cfg, R = LST.StatusLook.bodyR(e), K = LST.LookKit, t = reduced ? 0 : this.t;
    const top = e.type === "tank" ? -R * 0.95 : -R * 0.8;
    const all = [...C.tongues.map(([x, h, w, a], i) => ({ x: e.x + x * R * 0.9, y: e.y + top + Math.abs(x) * R * 0.15, h, w, a, i })),
                 ...C.sides.map(([s, y, h, w, a], i) => ({ x: e.x + s * R * 0.92, y: e.y + y * R, h, w, a, i: i + 7 }))];
    for (const f of all) {
      const ph = this.seed + f.i * 1.9;
      const k = reduced ? 1 : 1 + 0.13 * Math.sin(t * 11 + ph) + 0.06 * Math.sin(t * 23 + ph * 2); // flicker
      const sway = reduced ? 0 : 0.09 * Math.sin(t * 7 + ph);
      const h = f.h * R * k, w = f.w * R * (2 - k) ; // squash-stretch: taller = thinner
      K.tongue(ctx, f.x, f.y, w, h, f.a + sway); K.ink(ctx, "#ff4a1c", C.outline);
      K.tongue(ctx, f.x, f.y - h * 0.04, w * 0.66, h * 0.72, f.a + sway * 1.3); ctx.fillStyle = "#ff9a1f"; ctx.fill();
      K.tongue(ctx, f.x, f.y - h * 0.06, w * 0.36, h * 0.42, f.a + sway * 1.6); ctx.fillStyle = "#ffe95a"; ctx.fill();
    }
  }
});
