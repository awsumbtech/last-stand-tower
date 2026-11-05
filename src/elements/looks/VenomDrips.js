// VenomDrips (Venom): green goo drips from the enemy's bottom edge and a bubble or two rising off it
// while poisoned; one drip per stack (max 3 drawn). Reduced motion: drips hang still, no bubbles.
LST.VenomDrips = LST.LookRegistry.register("venom", class VenomDrips extends LST.StatusLook {
  static get status() { return "venom"; }
  draw(ctx, e, reduced) {
    const R = LST.StatusLook.bodyR(e), K = LST.LookKit, p = LST.StatusEffects.get(e, "venom");
    const n = Math.min(3, p ? p.count : 1), t = this.t;
    for (let i = 0; i < n; i++) {
      const x = e.x + (i - (n - 1) / 2) * R * 0.6, y = e.y + R * 0.85;
      const len = R * (0.35 + 0.12 * (reduced ? 0.5 : (Math.sin(t * 3 + i * 2 + this.seed) + 1) / 2));
      ctx.beginPath(); ctx.moveTo(x - R * 0.13, y); ctx.quadraticCurveTo(x - R * 0.13, y + len * 0.7, x, y + len);
      ctx.quadraticCurveTo(x + R * 0.13, y + len * 0.7, x + R * 0.13, y); ctx.closePath(); K.ink(ctx, "#8be04a", 2.5);
    }
    if (reduced) return;
    for (let i = 0; i < 2; i++) { // bubbles rise and pop on a short cycle while the poison lasts
      const c = ((t * 0.9 + i * 0.5 + this.seed * 0.1) % 1), bx = e.x + (i ? 0.45 : -0.5) * R, by = e.y - R * (0.9 + c * 0.7);
      ctx.globalAlpha = 1 - c; ctx.beginPath(); ctx.arc(bx, by, R * (0.12 + 0.06 * c), 0, Math.PI * 2); K.ink(ctx, "#b6f27a", 2);
    }
  }
});
