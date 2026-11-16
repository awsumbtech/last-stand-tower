// ProjectileTrails: comet tails for every projectile (one batched path), elemental tails, and a glow per shot.
// Drawn for FxRenderer (the batcher), which passes itself as `fx` for the theme and glow images
// (fx.json glowColors; PR 10b turns the trails into fx.json entries).
LST.ProjectileTrails = class ProjectileTrails {
  // Comet tails (two strokes for all projectiles) + additive glow per projectile.
  draw(fx, ctx, list, low) {
    if (!list.length) return;
    const T = LST.FX_PRESETS.trail, th = fx.theme;
    ctx.save();
    ctx.lineCap = "round";
    ctx.beginPath();
    for (let i = 0; i < list.length; i++) {
      const p = list[i];
      const sp = Math.hypot(p.vx, p.vy);
      if (!sp) continue;
      const len = Math.min(T.maxLength, sp * T.stretch);
      ctx.moveTo(p.x - (p.vx / sp) * len, p.y - (p.vy / sp) * len);
      ctx.lineTo(p.x, p.y);
    }
    ctx.globalAlpha = 0.6 * th.trailAlpha;
    ctx.strokeStyle = T.color;
    ctx.lineWidth = T.width;
    ctx.stroke();
    ctx.globalAlpha = th.trailAlpha;
    ctx.strokeStyle = "#ffffff";
    ctx.lineWidth = T.core;
    ctx.stroke();
    // Elemental shots: a colored tail over the plain one (one path per color, usually 1-4).
    let tints = null;
    for (const p of list) if (p.tint) (tints || (tints = {}))[p.tint] = true;
    if (tints) for (const color in tints) {
      ctx.beginPath();
      for (const p of list) {
        if (p.tint !== color) continue;
        const sp = Math.hypot(p.vx, p.vy);
        if (!sp) continue;
        const len = Math.min(T.maxLength, sp * T.stretch) * 1.15;
        ctx.moveTo(p.x - (p.vx / sp) * len, p.y - (p.vy / sp) * len);
        ctx.lineTo(p.x, p.y);
      }
      ctx.globalAlpha = 0.85 * th.trailAlpha;
      ctx.strokeStyle = color;
      ctx.lineWidth = T.width * 0.8;
      ctx.stroke();
    }
    if (!low) {
      ctx.globalCompositeOperation = th.blend;
      ctx.globalAlpha = Math.min(1, T.glowAlpha * th.glow);
      const g = fx.glow(T.color), gc = fx.glow(T.critColor);
      for (let i = 0; i < list.length; i++) {
        const p = list[i];
        const R = (p.crit ? T.critGlowRadius : T.glowRadius) * (p.tint ? 1.25 : 1);
        const img = p.crit ? gc : p.tint ? fx.glow(p.tint) : g;
        if (img) ctx.drawImage(img, p.x - R, p.y - R, R * 2, R * 2); // no glow art for it (or not loaded yet): none
      }
    }
    ctx.restore();
  }
};
