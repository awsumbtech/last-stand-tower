// FxRenderer: draws effects. Theme-aware through LST.FX_THEMES (blend mode, glow strength,
// ink outlines), so cartoon stays chunky and readable while neon gets real additive glow.
// Glows are cached radial-gradient sprites (one small canvas per color, made once), so a
// frame of effects is plain drawImage / stroke calls with no allocation.

LST.FxRenderer = class FxRenderer {
  constructor(doc) {
    this.doc = doc;
    this.glows = new Map(); // CSS color -> canvas
    this.theme = LST.FX_THEMES.cartoon;
    this.frame = 0;
    this.drawn = 0; // particles drawn last frame (QA)
  }

  setTheme(themeId) { this.theme = LST.FX_THEMES[themeId] || LST.FX_THEMES.cartoon; }

  glow(color) {
    let c = this.glows.get(color);
    if (c) return c;
    const S = 64;
    c = this.doc.createElement("canvas");
    c.width = c.height = S;
    const g = c.getContext("2d");
    const [r, gg, b] = LST.FxRenderer.rgb(color);
    const grad = g.createRadialGradient(S / 2, S / 2, 0, S / 2, S / 2, S / 2);
    grad.addColorStop(0, "rgba(255,255,255,1)");
    grad.addColorStop(0.18, `rgba(${r},${gg},${b},0.9)`);
    grad.addColorStop(0.5, `rgba(${r},${gg},${b},0.32)`);
    grad.addColorStop(1, `rgba(${r},${gg},${b},0)`);
    g.fillStyle = grad;
    g.fillRect(0, 0, S, S);
    this.glows.set(color, c);
    return c;
  }

  static rgb(hex) {
    const h = hex.replace("#", "");
    const n = parseInt(h.length === 3 ? h.split("").map((x) => x + x).join("") : h, 16);
    return [(n >> 16) & 255, (n >> 8) & 255, n & 255];
  }

  // ---------- World layer (inside the renderer's world transform) ----------

  // Soft glow on the ground under an upgraded tower.
  drawUnder(ctx, tower, aura, time) {
    if (!tower || aura.power <= 0) return;
    const P = aura.preset, k = aura.intensity, th = this.theme;
    const a = (P.groundGlow[0] + (P.groundGlow[1] - P.groundGlow[0]) * k) * th.glow * (0.9 + 0.1 * Math.sin(time * 2.4));
    if (a <= 0.01) return;
    const colors = P.colorsByTier[Math.min(P.colorsByTier.length - 1, aura.tier)];
    const R = tower.radius * (2.1 + 1.3 * k);
    ctx.save();
    ctx.globalCompositeOperation = th.blend;
    ctx.globalAlpha = Math.min(1, a);
    ctx.drawImage(this.glow(colors[colors.length > 2 ? 1 : 0]), tower.x - R, tower.y - R, R * 2, R * 2);
    ctx.restore();
  }

  // Comet tails (two strokes for all projectiles) + additive glow per projectile.
  drawProjectiles(ctx, list, low) {
    if (!list.length) return;
    const T = LST.FX_PRESETS.trail, th = this.theme;
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
    ctx.globalAlpha = 0.4 * th.trailAlpha;
    ctx.strokeStyle = T.color;
    ctx.lineWidth = T.width;
    ctx.stroke();
    ctx.globalAlpha = th.trailAlpha;
    ctx.strokeStyle = "#ffffff";
    ctx.lineWidth = T.core;
    ctx.stroke();
    if (!low) {
      ctx.globalCompositeOperation = th.blend;
      ctx.globalAlpha = Math.min(1, T.glowAlpha * th.glow);
      const g = this.glow(T.color), gc = this.glow(T.critColor);
      for (let i = 0; i < list.length; i++) {
        const p = list[i];
        const R = p.crit ? T.critGlowRadius : T.glowRadius;
        ctx.drawImage(p.crit ? gc : g, p.x - R, p.y - R, R * 2, R * 2);
      }
    }
    ctx.restore();
  }

  // Glow behind bright pickups: coin popups and crit numbers.
  drawTextGlows(ctx, texts) {
    if (!texts.length) return;
    const G = LST.FX_PRESETS.glow, th = this.theme;
    let started = false;
    for (let i = 0; i < texts.length; i++) {
      const t = texts[i];
      if (t.kind !== "coin" && t.kind !== "crit") continue;
      if (!started) { ctx.save(); ctx.globalCompositeOperation = th.blend; started = true; }
      const f = Math.min(1, (t.life / t.maxLife) * 3);
      const coin = t.kind === "coin";
      const R = coin ? G.coinRadius : G.critTextRadius;
      ctx.globalAlpha = (coin ? G.coinAlpha : G.critTextAlpha) * th.glow * f;
      ctx.drawImage(this.glow(coin ? "#ffd23f" : "#ffb347"), t.x + (coin ? -13 : 0) - R, t.y - R, R * 2, R * 2);
    }
    if (started) ctx.restore();
  }

  // Particles in a pool. Pass 1 (blend): soft motes and glows. Pass 2 (normal): mote cores
  // and streaks (ink-outlined in the cartoon style so they read on the lawn).
  drawPool(ctx, pool, unitPx = 1) {
    const n = pool.count;
    this.drawn += n;
    if (!n) return;
    const th = this.theme, S = LST.FX_SHAPE, pal = pool.palette;
    ctx.save();
    ctx.globalCompositeOperation = th.blend;
    for (let i = 0; i < n; i++) {
      const sh = pool.shape[i];
      if (sh === S.STREAK) continue;
      const f = pool.life[i] / pool.maxLife[i];
      const R = sh === S.SOFT ? pool.size[i] * (0.55 + 0.45 * f) : pool.size[i] * (1.2 - 0.2 * f);
      ctx.globalAlpha = (sh === S.SOFT ? Math.min(1, (1 - f) * 6) * Math.pow(f, 0.6) * 0.85 : f) * th.glow;
      ctx.drawImage(this.glow(pal[pool.color[i]]), pool.x[i] - R, pool.y[i] - R, R * 2, R * 2);
    }
    ctx.globalCompositeOperation = "source-over";
    ctx.lineCap = th.square ? "butt" : "round";
    for (let i = 0; i < n; i++) {
      const sh = pool.shape[i];
      const f = pool.life[i] / pool.maxLife[i];
      if (sh === S.SOFT) {
        const r = Math.max(0.9 * unitPx, pool.size[i] * 0.16);
        ctx.globalAlpha = Math.min(1, (1 - f) * 6) * Math.pow(f, 0.6) * 0.9;
        ctx.fillStyle = "#fffdf2";
        if (th.square) ctx.fillRect(pool.x[i] - r, pool.y[i] - r, r * 2, r * 2);
        else { ctx.beginPath(); ctx.arc(pool.x[i], pool.y[i], r, 0, Math.PI * 2); ctx.fill(); }
      } else if (sh === S.STREAK) {
        const vx = pool.vx[i], vy = pool.vy[i];
        const sp = Math.hypot(vx, vy) || 1;
        const len = Math.max(pool.minLen[i], sp * pool.stretch[i]);
        const x0 = pool.x[i] - (vx / sp) * len, y0 = pool.y[i] - (vy / sp) * len;
        const w = pool.size[i] * (0.6 + 0.4 * f);
        ctx.globalAlpha = Math.min(1, f * 1.8);
        ctx.beginPath();
        ctx.moveTo(x0, y0);
        ctx.lineTo(pool.x[i], pool.y[i]);
        if (th.inkStreaks) { ctx.strokeStyle = th.ink; ctx.lineWidth = w + 2.6 * unitPx; ctx.stroke(); }
        ctx.strokeStyle = pal[pool.color[i]];
        ctx.lineWidth = w;
        ctx.stroke();
      }
    }
    ctx.restore();
  }

  // Impact pulses in one space: expanding ring (ink + color) and a soft bloom.
  drawPulses(ctx, camera, space, frame, unitPx = 1) {
    const th = this.theme;
    const W = LST.FX_PRESETS.ring.width * unitPx;
    for (const p of camera.pulses) {
      if (!p.active || p.space !== space) continue;
      LST.ImpactSync.stampDraw(p, frame);
      const f = Math.min(1, p.t / p.life);
      const e = 1 - Math.pow(1 - f, 3);
      const R = p.ring * (0.12 + 0.88 * e);
      ctx.save();
      if (p.bloom > 0) {
        const B = p.ring * (0.5 + 0.5 * e);
        ctx.globalCompositeOperation = th.bloomBlend;
        ctx.globalAlpha = Math.min(1, p.bloom * th.glow * Math.pow(1 - f, 1.6));
        ctx.drawImage(this.glow(p.color), p.x - B, p.y - B, B * 2, B * 2);
        ctx.globalCompositeOperation = "source-over";
      }
      ctx.globalAlpha = Math.pow(1 - f, 1.2);
      ctx.beginPath();
      ctx.arc(p.x, p.y, R, 0, Math.PI * 2);
      if (th.ink) { ctx.lineWidth = W * (1 - f) + 4 * unitPx; ctx.strokeStyle = th.ink; ctx.stroke(); }
      ctx.lineWidth = W * (1 - f) + 1.5 * unitPx;
      ctx.strokeStyle = "#fffbe6";
      ctx.stroke();
      ctx.restore();
    }
  }

  // Screen layer: short soft flash centered on world impacts (skipped in reduced motion:
  // ImpactSync sets flash 0 there).
  drawFlashes(ctx, camera, r) {
    for (const p of camera.pulses) {
      if (!p.active || p.space !== "world" || p.flash <= 0) continue;
      const f = Math.min(1, p.t / p.life);
      const a = p.flash * Math.pow(1 - f, 2);
      if (a < 0.01) continue;
      const sx = r.width / 2 + p.x * r.scale, sy = r.height / 2 + p.y * r.scale;
      const R = Math.max(r.width, r.height) * 0.85;
      ctx.save();
      ctx.globalCompositeOperation = this.theme.bloomBlend;
      ctx.globalAlpha = Math.min(1, a);
      ctx.drawImage(this.glow("#fff3a0"), sx - R, sy - R, R * 2, R * 2);
      ctx.restore();
    }
  }
};
