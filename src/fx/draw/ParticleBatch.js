// ParticleBatch: draws a particle pool in three batched passes. Pass 1 (blend): soft motes and
// glows. Pass 2 (normal): mote cores. Pass 3: streaks, one path per fade step for the ink
// outline and one per color x fade step, so a full burst is about a dozen stroke calls.
// Drawn for FxRenderer (the batcher), which passes itself as `fx` for the theme and glow images
// (fx.json glowColors; PR 10b turns motes and streaks into fx.json entries).
LST.ParticleBatch = class ParticleBatch {
  constructor() {
    const F = LST.ParticleBatch.FADE_STEPS;
    this.wSum = new Float32Array(F); this.wCnt = new Uint16Array(F);
    this.used = new Uint8Array(256 * F); // palette color x fade step
  }

  // Particles in a pool. Pass 1 (blend): soft motes and glows. Pass 2 (normal): mote cores.
  // Pass 3: streaks, batched into a few paths (one per fade step for the ink outline, one
  // per color x fade step for the color), so a full burst is ~a dozen stroke calls, not 500.
  draw(fx, ctx, pool, unitPx = 1, low = false) {
    const n = pool.count;
    if (!n) return;
    const th = fx.theme, S = LST.FX_SHAPE, pal = pool.palette;
    let streaks = 0;
    ctx.save();
    ctx.globalCompositeOperation = th.blend;
    for (let i = 0; i < n; i++) {
      const sh = pool.shape[i];
      if (sh === S.STREAK) { streaks++; continue; }
      const g = fx.glow(pal[pool.color[i]]);
      if (!g) continue; // no glow art for this colour (or not loaded yet): draw nothing
      const f = pool.life[i] / pool.maxLife[i];
      const R = sh === S.SOFT ? pool.size[i] * (0.55 + 0.45 * f) : pool.size[i] * (1.2 - 0.2 * f);
      ctx.globalAlpha = (sh === S.SOFT ? Math.min(1, (1 - f) * 6) * Math.pow(f, 0.6) * 0.85 : f) * th.glow;
      ctx.drawImage(g, pool.x[i] - R, pool.y[i] - R, R * 2, R * 2);
    }
    ctx.globalCompositeOperation = "source-over";
    for (let i = 0; i < n; i++) {
      if (pool.shape[i] !== S.SOFT) continue;
      const f = pool.life[i] / pool.maxLife[i];
      // Colored mote with a white center: reads on the lawn and over the white tower.
      const r = Math.max(1.2 * unitPx, pool.size[i] * 0.24);
      ctx.globalAlpha = Math.min(1, (1 - f) * 6) * Math.pow(f, 0.5) * 0.95;
      for (let k = 0; k < 2; k++) {
        const rr = k ? r * 0.5 : r;
        ctx.fillStyle = k ? "#fffdf2" : pal[pool.color[i]];
        if (th.square) ctx.fillRect(pool.x[i] - rr, pool.y[i] - rr, rr * 2, rr * 2);
        else { ctx.beginPath(); ctx.arc(pool.x[i], pool.y[i], rr, 0, Math.PI * 2); ctx.fill(); }
      }
    }
    if (streaks) this.drawStreaks(fx, ctx, pool, unitPx, low);
    ctx.restore();
  }

  // Streak batches: fade step b (0 = fresh .. FADE-1 = nearly dead) sets alpha and width.
  drawStreaks(fx, ctx, pool, unitPx, low) {
    const th = fx.theme, S = LST.FX_SHAPE, pal = pool.palette, n = pool.count;
    const FADE = LST.ParticleBatch.FADE_STEPS;
    ctx.lineCap = th.square ? "butt" : "round";
    const nc = pal.length;
    // Mean streak width per fade step (sizes vary a little; one width per batch).
    const wSum = this.wSum, wCnt = this.wCnt, used = this.used;
    for (let b = 0; b < FADE; b++) { wSum[b] = 0; wCnt[b] = 0; }
    for (let c = 0; c < nc * FADE; c++) used[c] = 0;
    for (let i = 0; i < n; i++) {
      if (pool.shape[i] !== S.STREAK) continue;
      const b = this.fadeStep(pool, i, FADE);
      wSum[b] += pool.size[i]; wCnt[b]++;
      used[pool.color[i] * FADE + b] = 1;
    }
    const ink = th.inkStreaks && !low;
    for (let b = 0; b < FADE; b++) {
      if (!wCnt[b]) continue;
      const f = 1 - (b + 0.5) / FADE;
      const w = (wSum[b] / wCnt[b]) * (0.6 + 0.4 * f);
      ctx.globalAlpha = Math.min(1, f * 1.8);
      if (ink) {
        ctx.beginPath();
        for (let i = 0; i < n; i++) if (pool.shape[i] === S.STREAK && this.fadeStep(pool, i, FADE) === b) this.streakPath(ctx, pool, i);
        ctx.strokeStyle = th.ink; ctx.lineWidth = w + 2.6 * unitPx; ctx.stroke();
      }
      for (let c = 0; c < nc; c++) {
        if (!used[c * FADE + b]) continue;
        ctx.beginPath();
        for (let i = 0; i < n; i++) if (pool.shape[i] === S.STREAK && pool.color[i] === c && this.fadeStep(pool, i, FADE) === b) this.streakPath(ctx, pool, i);
        ctx.strokeStyle = pal[c]; ctx.lineWidth = w; ctx.stroke();
      }
    }
  }

  fadeStep(pool, i, FADE) { return Math.min(FADE - 1, ((1 - pool.life[i] / pool.maxLife[i]) * FADE) | 0); }

  streakPath(ctx, pool, i) {
    const vx = pool.vx[i], vy = pool.vy[i];
    const sp = Math.hypot(vx, vy) || 1;
    const len = Math.max(pool.minLen[i], sp * pool.stretch[i]);
    ctx.moveTo(pool.x[i] - (vx / sp) * len, pool.y[i] - (vy / sp) * len);
    ctx.lineTo(pool.x[i], pool.y[i]);
  }
};
LST.ParticleBatch.FADE_STEPS = 3;
