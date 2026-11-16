// ImpactPulses: impact pulses in one space. fx.json "impacts" names each impact's ring and bloom
// effects; the ring plays over the pulse's life at the impact's ring radius, the bloom under it
// at the impact's bloom strength (bloom entries skip low quality). Stamps the first drawn frame
// for ImpactSync's audio / visual sync report.
// Drawn for FxRenderer (the batcher), which passes itself as `fx` for the effect manifest.
LST.ImpactPulses = class ImpactPulses {
  draw(fx, ctx, camera, space, frame, unitPx = 1, low = false) {
    for (const p of camera.pulses) {
      if (!p.active || p.space !== space) continue;
      LST.ImpactSync.stampDraw(p, frame);
      const look = fx.effects.impact(p.impact);
      if (!look) continue;
      const at = { x: p.x, y: p.y, base: p.ring, p: p.t / p.life, low };
      if (look.bloom && p.bloom > 0) fx.effects.draw(look.bloom, ctx, Object.assign({}, at, { alpha: p.bloom }));
      if (look.ring) fx.effects.draw(look.ring, ctx, at);
    }
  }
};
