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
    const F = LST.FxRenderer.FADE_STEPS;
    this.wSum = new Float32Array(F); this.wCnt = new Uint16Array(F);
    this.used = new Uint8Array(256 * F); // palette color x fade step
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
      const g = this.glow(T.color), gc = this.glow(T.critColor);
      for (let i = 0; i < list.length; i++) {
        const p = list[i];
        const R = (p.crit ? T.critGlowRadius : T.glowRadius) * (p.tint ? 1.25 : 1);
        ctx.drawImage(p.crit ? gc : p.tint ? this.glow(p.tint) : g, p.x - R, p.y - R, R * 2, R * 2);
      }
    }
    ctx.restore();
  }

  // Status rings on affected enemies (venom / frozen): only drawn while an effect is
  // active, so nothing animates on an idle lawn. Reduced motion: steady rings, no flicker.
  drawStatusRings(ctx, enemies, time, reduced, low) {
    const S = LST.StatusEffects;
    ctx.save();
    ctx.lineCap = "round";
    for (const e of enemies) {
      if (!e.status || e.dead) continue;
      const fz = S.get(e, "frozen"), ven = S.get(e, "venom"); // burn: drawn by BurnFlames (src/elements/looks)
      if (!fz && !ven) continue;
      const r = e.radius;
      if (fz) {
        ctx.globalAlpha = 0.38; ctx.fillStyle = "#bff3ff";
        ctx.beginPath(); ctx.arc(e.x, e.y, r * 1.08, 0, Math.PI * 2); ctx.fill();
        ctx.globalAlpha = 0.95; ctx.strokeStyle = "#e9fbff"; ctx.lineWidth = 3;
        ctx.stroke();
      }
      if (ven) {
        const n = ven.count;
        ctx.globalAlpha = 0.95; ctx.fillStyle = "#8be04a"; ctx.strokeStyle = "#2b3a12"; ctx.lineWidth = 1.5;
        for (let i = 0; i < n; i++) {
          const a = -Math.PI / 2 + (i - (n - 1) / 2) * 0.42;
          const px = e.x + Math.cos(a) * (r + 11), py = e.y + Math.sin(a) * (r + 11);
          ctx.beginPath(); ctx.arc(px, py, 3.6, 0, Math.PI * 2); ctx.fill(); if (!low) ctx.stroke();
        }
      }
    }
    ctx.restore();
  }

  // Chain Spark bolts: jagged lines between the hit enemy and each arc target, fading over ~0.2s.
  drawArcs(ctx, arcs, low) {
    const th = this.theme;
    ctx.save();
    ctx.lineCap = "round"; ctx.lineJoin = "round";
    for (const a of arcs) {
      const f = 1 - a.t / a.life;
      ctx.beginPath();
      let j = 0;
      for (let i = 1; i < a.pts.length; i++) {
        const [x0, y0] = a.pts[i - 1];
        let [x1, y1] = a.pts[i];
        let L = Math.hypot(x1 - x0, y1 - y0);
        if (L < 56) { // bunched targets: draw the hop at least 56px long so it never collapses to a dot
          const ux = L > 1 ? (x1 - x0) / L : Math.cos(i * 2.1), uy = L > 1 ? (y1 - y0) / L : Math.sin(i * 2.1);
          x1 = x0 + ux * 56; y1 = y0 + uy * 56; L = 56;
        }
        const nx = -(y1 - y0), ny = x1 - x0;
        // Bunched targets: bow short bolts outward (alternating sides) so each hop reads as its own arc.
        const bow = L < 90 ? (90 - L) * 0.55 * (i % 2 ? 1 : -1) : 0;
        ctx.moveTo(x0, y0);
        for (let k = 1; k < 4; k++) {
          const off = a.jag[j++] * 22 + bow * Math.sin(Math.PI * k / 4);
          ctx.lineTo(x0 + (x1 - x0) * k / 4 + nx / L * off, y0 + (y1 - y0) * k / 4 + ny / L * off);
        }
        ctx.lineTo(x1, y1);
      }
      ctx.globalAlpha = Math.min(1, 1.6 * f); ctx.strokeStyle = th.ink || "#2a2410"; ctx.lineWidth = 7.5; ctx.stroke(); // dark underlay: reads on white hit-flash
      ctx.globalAlpha = Math.min(1, 1.4 * f); ctx.strokeStyle = a.color || "#ffe14d"; ctx.lineWidth = 4.5; ctx.stroke();
      ctx.strokeStyle = "#ffffff"; ctx.lineWidth = 1.8; ctx.stroke();
      // Arc flash: a bright ring on every struck enemy for the first part of the bolt's life.
      if (f > 0.45) {
        ctx.globalAlpha = (f - 0.45) / 0.55; ctx.strokeStyle = "#ffffff"; ctx.lineWidth = 2.5;
        for (const [x, y] of a.pts) { ctx.beginPath(); ctx.arc(x, y, 10 + (1 - f) * 22, 0, Math.PI * 2); ctx.stroke(); }
      }
      if (!low) {
        ctx.globalCompositeOperation = th.blend; ctx.globalAlpha = 0.5 * f;
        const g = this.glow(a.color || "#ffe14d");
        for (const [x, y] of a.pts) ctx.drawImage(g, x - 24, y - 24, 48, 48);
        ctx.globalCompositeOperation = "source-over";
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

  // Particles in a pool. Pass 1 (blend): soft motes and glows. Pass 2 (normal): mote cores.
  // Pass 3: streaks, batched into a few paths (one per fade step for the ink outline, one
  // per color x fade step for the color), so a full burst is ~a dozen stroke calls, not 500.
  drawPool(ctx, pool, unitPx = 1, low = false) {
    const n = pool.count;
    this.drawn += n;
    if (!n) return;
    const th = this.theme, S = LST.FX_SHAPE, pal = pool.palette;
    let streaks = 0;
    ctx.save();
    ctx.globalCompositeOperation = th.blend;
    for (let i = 0; i < n; i++) {
      const sh = pool.shape[i];
      if (sh === S.STREAK) { streaks++; continue; }
      const f = pool.life[i] / pool.maxLife[i];
      const R = sh === S.SOFT ? pool.size[i] * (0.55 + 0.45 * f) : pool.size[i] * (1.2 - 0.2 * f);
      ctx.globalAlpha = (sh === S.SOFT ? Math.min(1, (1 - f) * 6) * Math.pow(f, 0.6) * 0.85 : f) * th.glow;
      ctx.drawImage(this.glow(pal[pool.color[i]]), pool.x[i] - R, pool.y[i] - R, R * 2, R * 2);
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
    if (streaks) this.drawStreaks(ctx, pool, unitPx, low);
    ctx.restore();
  }

  // Streak batches: fade step b (0 = fresh .. FADE-1 = nearly dead) sets alpha and width.
  drawStreaks(ctx, pool, unitPx, low) {
    const th = this.theme, S = LST.FX_SHAPE, pal = pool.palette, n = pool.count;
    const FADE = LST.FxRenderer.FADE_STEPS;
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

  // Impact pulses in one space: expanding ring (ink + color) and a soft bloom.
  // low quality: ring only, no bloom sprite.
  drawPulses(ctx, camera, space, frame, unitPx = 1, low = false) {
    const th = this.theme;
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
        ctx.drawImage(this.glow(p.color), p.x - B, p.y - B, B * 2, B * 2);
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

  // Screen layer: short soft flash centered on world impacts (skipped in reduced motion:
  // ImpactSync sets flash 0 there).
  drawFlashes(ctx, camera, r) {
    for (const p of camera.pulses) {
      if (!p.active || p.space !== "world" || p.flash <= 0) continue;
      const f = Math.min(1, p.t / p.life);
      const a = p.flash * Math.pow(1 - f, 2);
      if (a < 0.01) continue;
      const sx = r.width / 2 + p.x * r.scale, sy = r.height / 2 + p.y * r.scale;
      const R = Math.max(r.width, r.height) * 0.5;
      ctx.save();
      ctx.globalCompositeOperation = this.theme.bloomBlend;
      ctx.globalAlpha = Math.min(1, a);
      ctx.drawImage(this.glow("#fff3a0"), sx - R, sy - R, R * 2, R * 2);
      ctx.restore();
    }
  }
};
LST.FxRenderer.FADE_STEPS = 3;
