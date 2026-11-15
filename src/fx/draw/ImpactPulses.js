// ImpactPulses: impact pulses in one space: an expanding ring (ink + color) and a soft bloom; low quality draws the ring only.
// Drawn for FxRenderer (the batcher), which passes itself as `fx` for the theme and glow sprites.
LST.ImpactPulses = class ImpactPulses {
  // Impact pulses in one space: expanding ring (ink + color) and a soft bloom.
  // low quality: ring only, no bloom sprite.
  draw(fx, ctx, camera, space, frame, unitPx = 1, low = false) {
    const th = fx.theme;
    const W = LST.FX_PRESETS.ring.width * unitPx;
    for (const p of camera.pulses) {
      if (!p.active || p.space !== space) continue;
      LST.ImpactSync.stampDraw(p, frame);
      const f = Math.min(1, p.t / p.life);
      const e = 1 - Math.pow(1 - f, 3);
      const R = p.ring * (0.12 + 0.88 * e);
      ctx.save();
      if (p.bloom > 0 && !low) {
        const B = p.ring * (0.35 + 0.35 * e); // kept modest: big blended blits are the costly part on phones
        ctx.globalCompositeOperation = th.bloomBlend;
        ctx.globalAlpha = Math.min(1, p.bloom * th.glow * Math.pow(1 - f, 1.6));
        ctx.drawImage(fx.glow(p.color), p.x - B, p.y - B, B * 2, B * 2);
        ctx.globalCompositeOperation = "source-over";
      }
      ctx.globalAlpha = Math.pow(1 - f, 1.2);
      ctx.beginPath();
      ctx.arc(p.x, p.y, R, 0, Math.PI * 2);
      if (th.ink) { ctx.globalAlpha *= 0.7; ctx.lineWidth = W * (1 - f) + 5 * unitPx; ctx.strokeStyle = th.ink; ctx.stroke(); ctx.globalAlpha /= 0.7; }
      ctx.lineWidth = W * (1 - f) + 3 * unitPx;
      ctx.strokeStyle = p.color;
      ctx.stroke();
      ctx.restore();
    }
  }
};
