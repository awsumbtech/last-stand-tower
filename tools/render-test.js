#!/usr/bin/env node
// Render test (node, no browser): node tools/render-test.js
// PR 8b split render.js into a RenderPipeline of ordered layers and FxRenderer into one drawer
// per effect. The oracle is the real old code, loaded with `git show` (nothing copied):
//   1. Renderer.draw at 24349b8 (the last render.js before the pipeline) and at 738409a (the last
//      render.js that compared state strings) draw exactly the same calls, in the same order, as
//      the new pipeline, for every run-flow state and every scene case (finale intro, phase /
//      boss / wave banners, low HP, flash, Overdrive, hazards, corpses, World 2 bodies, no FX,
//      reduced motion, a pixel theme, a theme without its optional parts).
//   2. PR 10b: ProjectileTrails and ParticleBatch draw only fx.json effects by variant (trail.<v>,
//      glow.<v>, mote.<v>, streak.<v>) with the old sizes, lengths, angles and opacity curves, for
//      every FX theme and both quality levels, and nothing at all until the art is in. In 1 the
//      low-HP vignette, white flash and finale dim are the fx.json effects lowHpVignette,
//      screenFlash and finaleDim, at the old strengths.
//   3. PR 10a: the converted drawers (OverdriveRing, TowerGroundGlow, ChainArcs, TextGlows,
//      ImpactPulses, ImpactFlashes) draw only fx.json effects: drawImage of the sheet the entry
//      names, at the placement its settings give, with no shape, gradient or colour calls, and
//      nothing at all until the art is in. The old Overdrive arc is the one difference in 1.
//   4. The layers are in the required order, one class per file, and render.js / FxRenderer only
//      hand off.
const fs = require("fs"), path = require("path"), vm = require("vm"), childProcess = require("child_process");
const DrawRecorder = require("./draw-recorder.js");

class RenderTest {
  constructor(root = path.join(__dirname, "..")) {
    this.root = root;
    this.passes = 0;
    this.fails = 0;
    this.ORDER_REV = "24349b8"; // render.js / FxRenderer.js before PR 8b
    this.STATE_REV = "738409a"; // render.js before PR 8 (state-string checks)
    this.IDS = ["menu", "playing", "paused", "celebrate", "upgrade", "gotcha", "gameover", "workshop", "victory", "cleared"];
    this.LAYERS = ["BackdropLayer", "EnemyLayer", "TowerLayer", "FxLayer", "HudCanvasLayer", "OverlayLayer"];
    this.RENDER_FILES = ["render/RenderLayer.js", "render/OverdriveRing.js", "render/BackdropLayer.js", "render/EnemyLayer.js", "render/TowerLayer.js", "render/FxLayer.js", "render/HudCanvasLayer.js", "render/OverlayLayer.js", "render/RenderPipeline.js", "render.js"];
    this.FX_FILES = ["fx/SpriteEffect.js", "fx/FxManifest.js", "fx/EffectPlayer.js", "fx/draw/TowerGroundGlow.js", "fx/draw/ProjectileTrails.js", "fx/draw/ChainArcs.js", "fx/draw/TextGlows.js", "fx/draw/ParticleBatch.js", "fx/draw/ImpactPulses.js", "fx/draw/ImpactFlashes.js", "fx/FxRenderer.js"];
  }

  ok(c, m) { if (c) this.passes++; else { this.fails++; console.log("FAIL " + m); } }
  read(rel) { return fs.readFileSync(path.join(this.root, rel), "utf8"); }
  show(rev, file) {
    try { return childProcess.execFileSync("git", ["show", rev + ":" + file], { cwd: this.root, encoding: "utf8", stdio: ["ignore", "pipe", "pipe"] }); }
    catch (e) { console.log(`FAIL oracle: git show ${rev}:${file} failed (needs full git history, e.g. actions/checkout fetch-depth: 0)`); process.exit(1); }
  }

  // Math with a seeded random (the shake jitter), reset per frame so both runs see the same numbers.
  seededMath(seed) {
    const M = Object.create(Math); let a = seed >>> 0;
    M.random = () => { a = (a + 0x6d2b79f5) >>> 0; let t = a; t = Math.imul(t ^ (t >>> 15), t | 1); t ^= t + Math.imul(t ^ (t >>> 7), t | 61); return ((t ^ (t >>> 14)) >>> 0) / 4294967296; };
    return M;
  }

  // A sandbox with config, SceneFlags and the given sources (name -> code).
  sandbox(sources, rec) {
    const sb = { console, Math: this.seededMath(1), window: { devicePixelRatio: 2, innerWidth: 390, innerHeight: 844 } };
    sb.document = { createElement: () => ({ name: "lowCanvas", width: 0, height: 0, getContext: () => rec.ctx("low") }) };
    vm.createContext(sb);
    sb.window.LST = undefined; vm.runInContext("var window = this.window; window.LST = {}; var LST = window.LST;", sb);
    vm.runInContext(this.read("src/config.js"), sb, { filename: "config.js" });
    vm.runInContext(this.read("src/core/SceneFlags.js"), sb, { filename: "SceneFlags.js" });
    for (const [name, code] of sources) vm.runInContext(code, sb, { filename: name });
    return sb;
  }

  // ---------- 1. Renderer.draw: old vs new ----------

  theme(rec, opts) {
    const m = { init: null, background: null, range: null, tower: null, enemy: null, projectile: null, particle: null, text: null, banner: null };
    if (!opts.minimal) Object.assign(m, { burst: null, bossBanner: null, corpse: null, confetti: null, enemyHud: null });
    if (opts.pixel) m.pixelSize = () => 3;
    return rec.stub("theme", m, { id: "cartoon" });
  }

  worldRenderers(rec, opts) {
    const backdrop = rec.stub("backdrop", { draw: null });
    return rec.stub("W", {
      background: () => (opts.backdrop ? backdrop : null), groundHazards: null, airHazards: null, shadows: null,
      // World 2 bodies: enemy "e1" is drawn by the world renderer (with its theme HUD), the rest by the theme.
      enemy: (ctx, e, r, themeDraw, hud) => { if (e.name !== "e1") return false; themeDraw(); if (hud) hud(); return true; },
    });
  }

  scene(id, c) {
    const fin = c.finale ? { intro: c.finale, mole: null, won: false } : null;
    return {
      name: "scene", state: id, sceneFlags: this.stateFlags[id], world: { name: "world", copy: { finaleSub: "Crabclaw!" } },
      tower: { name: "tower", x: 0, y: 0, radius: 26, overdrive: c.overdrive ? 2 : 0 },
      enemies: [{ name: "e0" }, { name: "e1" }, { name: "e2", corpse: {} }], particles: [{ name: "p0" }], corpses: c.corpses ? [{ name: "c0" }] : [],
      projectiles: [{ name: "s0" }], hazards: c.hazards ? [{ name: "h0" }] : [], bursts: [{ name: "b0" }], confetti: [{ name: "f0" }], texts: [{ name: "t0" }],
      finale: fin, phaseBanner: c.phase ? { text: "PHASE 2", sub: "x", t: 1.2, max: 2.2 } : null, bossIntro: c.boss ? 1.5 : 0, waveIntro: c.wave ? 1.2 : 0, wave: 7,
      lowHpActive: !!c.lowHp, vignette: c.vignette || 0, flash: c.flash || 0, shake: c.shake || 0, celebrateTimer: 0.2, victoryTimer: 0.1,
    };
  }

  // The real GameState classes' SceneFlags, loaded once.
  loadStateFlags() {
    const sb = { console, Math }; sb.window = sb; vm.createContext(sb);
    for (const f of ["config.js", "core/SceneFlags.js", "core/GameState.js", "core/GameStateMachine.js"]) vm.runInContext(this.read("src/" + f), sb, { filename: f });
    for (const f of fs.readdirSync(path.join(this.root, "src/core/states"))) vm.runInContext(this.read("src/core/states/" + f), sb, { filename: f });
    const M = new sb.LST.GameStateMachine();
    this.stateFlags = {};
    for (const id of this.IDS) { M.set(id); this.stateFlags[id] = M.current.sceneFlags; }
  }

  // One frame of a given render.js version; returns the recorded calls.
  drawFrame(sources, id, c) {
    const rec = new DrawRecorder(), sb = this.sandbox(sources, rec), LST = sb.LST;
    LST.WorldRenderers = c.noW ? undefined : this.worldRenderers(rec, c);
    const canvas = { name: "canvas", clientWidth: 390, clientHeight: 844, width: 0, height: 0, getContext: () => rec.ctx("ctx") };
    const r = new LST.Renderer(canvas, this.theme(rec, c));
    r.resize();
    LST.draw.confetti = rec.stub("draw", { confetti: null }).confetti;
    const effects = { name: "effects", draw: (id, ctx, at) => { rec.log.push(`effects.draw(${JSON.stringify(id)},${rec.fmt(ctx)},${JSON.stringify(at)})`); return true; } };
    LST.fxManifest = effects; // the screen layers ask it when there is no FxDirector (PR 10b)
    r.fx = c.noFx ? null : rec.stub("fx", { drawUnder: null, drawProjectiles: null, drawWorld: null, drawTextGlows: null, drawScreen: null }, { name: "fx", reducedMotion: !!c.reduced, shake: 0.3, effects });
    const scene = this.scene(id, c);
    rec.log.length = 0;
    sb.Math.random = this.seededMath(7).random;
    r.draw(scene, 1 / 60);
    return rec.log;
  }

  // PR 10a: the Overdrive pulse is the fx.json effect "overdriveAura" now. The old frames drew it
  // as save, beginPath, arc, fillStyle, fill, restore; the new ones ask the effects for it. Both
  // become one OVERDRIVE marker so everything else is still compared call for call.
  normOverdrive(log, old) {
    const out = [], hits = [];
    for (let i = 0; i < log.length; i++) {
      if (old && log[i] === 'ctx.fillStyle="rgba(255, 159, 67, 0.35)"' && /^ctx\.arc\(0,0,/.test(log[i - 1]) && log[i - 2] === "ctx.beginPath()" && log[i - 3] === "ctx.save()" && log[i + 1] === "ctx.fill()" && log[i + 2] === "ctx.restore()") {
        out.length -= 3; hits.push(log[i - 1]); out.push("OVERDRIVE"); i += 2; continue;
      }
      if (!old && log[i].startsWith('effects.draw("overdriveAura",')) { hits.push(log[i]); out.push("OVERDRIVE"); continue; }
      out.push(log[i]);
    }
    return { out, hits };
  }

  // PR 10b: the low-HP vignette, the white flash and the finale dim are fx.json effects now
  // ("lowHpVignette", "screenFlash", "finaleDim"). The old frames drew a radial gradient + fillRect,
  // a white fillRect and a dark fillRect; both become VIGNETTE(v) / FLASH(a) / DIM(k) markers with
  // the strength each one had (old gradient edge = 0.75 v, old dim = 0.45 k), so everything else is
  // still compared call for call and the strengths must match.
  normScreen(log, old) {
    const out = [], hits = [], r9 = (v) => Math.round(v * 1e9) / 1e9, full = (a) => a.x === 0 && a.y === 0 && a.w === 390 && a.h === 844;
    for (let i = 0; i < log.length; i++) {
      const l = log[i];
      if (old) {
        let m;
        if (/^ctx\.createRadialGradient\(195,422,117,195,422,/.test(l) && (m = /^ctx\.(grad\d+)\.addColorStop\(1,rgba\(255, 40, 70, ([\d.e-]+)\)\)$/.exec(log[i + 2])) && log[i + 3] === `ctx.fillStyle=<ctx.${m[1]}>` && log[i + 4] === "ctx.fillRect(0,0,390,844)") {
          out.push(`VIGNETTE(${r9(Number(m[2]) / 0.75)})`); hits.push("v"); i += 4; continue;
        }
        if ((m = /^ctx\.fillStyle="rgba\(255, 255, 255, ([\d.e-]+)\)"$/.exec(l)) && log[i + 1] === "ctx.fillRect(0,0,390,844)") { out.push(`FLASH(${r9(Number(m[1]))})`); hits.push("f"); i++; continue; }
        if ((m = /^ctx\.fillStyle="rgba\(30, 15, 40, ([\d.e-]+)\)"$/.exec(l)) && log[i + 1] === "ctx.fillRect(0,0,390,844)") { out.push(`DIM(${r9(Number(m[1]) / 0.45)})`); hits.push("d"); i++; continue; }
      } else {
        const m = /^effects\.draw\("(lowHpVignette|screenFlash|finaleDim)",<ctx>,(\{.*\})\)$/.exec(l);
        if (m) {
          const a = JSON.parse(m[2]);
          if (m[1] === "lowHpVignette" && full(a)) { out.push(`VIGNETTE(${r9(a.alpha)})`); hits.push("v"); continue; }
          if (m[1] === "screenFlash" && a.x === 195 && a.y === 422 && a.base === 844) { out.push(`FLASH(${r9(a.alpha)})`); hits.push("f"); continue; }
          if (m[1] === "finaleDim" && full(a)) { out.push(`DIM(${r9(a.alpha)})`); hits.push("d"); continue; }
        }
      }
      out.push(l);
    }
    return { out, hits };
  }

  checkRenderer() {
    this.loadStateFlags();
    const cur = this.RENDER_FILES.map((f) => [f, this.read("src/" + f)]);
    const oldOrder = [["render.js@" + this.ORDER_REV, this.show(this.ORDER_REV, "src/render.js")]];
    const oldState = [["render.js@" + this.STATE_REV, this.show(this.STATE_REV, "src/render.js")]];
    const CASES = {
      plain: {}, wave: { wave: true }, boss: { boss: true, wave: true }, phase: { phase: true, boss: true }, finaleDim: { finale: 2.9 }, finaleBanner: { finale: 1.0, phase: true },
      lowHp: { lowHp: true, vignette: 0.4, flash: 0.5 }, overdrive: { overdrive: true, hazards: true, corpses: true, shake: 0.6 }, backdrop: { backdrop: true, hazards: true },
      noFx: { noFx: true, flash: 0.5, lowHp: true }, reduced: { reduced: true, flash: 0.5, shake: 1 }, pixel: { pixel: true, wave: true }, minimal: { minimal: true, boss: true, phase: true, finale: 1.0 }, noW: { noW: true },
    };
    let n = 0, same24 = 0, same73 = 0, firstBad = null, odCases = 0, odOk = 0, screenHits = 0, screenSame = 0;
    for (const id of this.IDS) for (const [cn, c] of Object.entries(CASES)) {
      n++;
      const raw = this.drawFrame(cur, id, c), now = this.normOverdrive(raw, false);
      const o24 = this.normOverdrive(this.drawFrame(oldOrder, id, c), true), o73 = this.normOverdrive(this.drawFrame(oldState, id, c), true);
      const sNow = this.normScreen(now.out, false), s24 = this.normScreen(o24.out, true), s73 = this.normScreen(o73.out, true);
      now.out = sNow.out; o24.out = s24.out; o73.out = s73.out; screenHits += s24.hits.length;
      if (s24.hits.join() === sNow.hits.join()) screenSame += s24.hits.length;
      const a = JSON.stringify(now.out) === JSON.stringify(o24.out);
      const b = JSON.stringify(now.out) === JSON.stringify(o73.out);
      if (a) same24++; if (b) same73++;
      if ((!a || !b) && !firstBad) firstBad = `${id}/${cn}`;
      if (id === "playing" && cn === "lowHp") this.sampleCalls = raw.length;
      if (o24.hits.length) {
        odCases++;
        const at = now.hits.length === 1 ? JSON.parse(now.hits[0].slice(now.hits[0].indexOf(",{") + 1, -1)) : null;
        if (o24.hits.length === 1 && at && at.x === 0 && at.y === 0 && at.base === 26 && typeof at.t === "number") odOk++;
      }
    }
    this.ok(same24 === n, `render: the RenderPipeline draws exactly what render.js@${this.ORDER_REV} drew, call for call, in all ${n} state x scene cases, except the Overdrive pulse and the PR 10b screen effects (${same24}/${n}${firstBad ? ", first diff " + firstBad : ""})`);
    this.ok(screenHits > 30 && screenSame === screenHits, `render 10b: where render.js@${this.ORDER_REV} drew the vignette gradient, the white flash or the finale dim fill, the pipeline plays "lowHpVignette" / "screenFlash" / "finaleDim" once, over the screen (the flash centred, long side), at the same strength, in the same place in the layer order, with or without FX (${screenSame}/${screenHits})`);
    this.ok(odCases > 0 && odOk === odCases, `render: where render.js@${this.ORDER_REV} filled the Overdrive arc, the pipeline asks the effects for "overdriveAura" once, on the tower (x 0, y 0, base = radius 26), in the same place in the layer order (${odOk}/${odCases} cases)`);
    this.ok(same73 === n, `render: SceneFlags pick the same finale dim, banner and low-HP pulse as the state-string checks of render.js@${this.STATE_REV}, in all ${n} cases (${same73}/${n})`);
    this.ok(this.sampleCalls > 20, `render: the recorder sees the frame (${this.sampleCalls} calls in playing/lowHp)`);
  }

  // ---------- 2. FxRenderer: old vs new (unconverted drawers) ----------

  fxSandbox(sources, rec) {
    const sb = { console, Math, window: {} };
    vm.createContext(sb);
    vm.runInContext("var window = this.window; window.LST = {}; var LST = window.LST;", sb);
    for (const f of ["config.js", "fx/FxPresets.js", "fx/ParticlePool.js", "fx/ImpactSync.js", "sprites/SheetAnimation.js"]) vm.runInContext(this.read("src/" + f), sb, { filename: f });
    for (const [name, code] of sources) vm.runInContext(code, sb, { filename: name });
    return sb;
  }

  pool(LST, n) {
    const p = { name: "pool", count: n, palette: ["gold", "pale", "amber"] };
    for (const k of ["x", "y", "vx", "vy", "life", "maxLife", "size", "shape", "color", "minLen", "stretch"]) p[k] = [];
    const S = LST.FX_SHAPE;
    for (let i = 0; i < n; i++) {
      p.x.push(i * 7 - 20); p.y.push(i * 3); p.vx.push(i % 3 ? 40 : 0); p.vy.push(-30 + i); p.maxLife.push(1); p.life.push(((i * 37) % 100) / 100 + 0.01);
      p.size.push(2 + (i % 4)); p.shape.push([S.STREAK, S.SOFT, S.GLOW][i % 3]); p.color.push(((i / 3) | 0) % 3); p.minLen.push(4); p.stretch.push(0.05);
    }
    return p;
  }

  // PR 10b: ProjectileTrails and ParticleBatch play fx.json effects by variant, with the real
  // fx.json (stub art per sheet, or none), the old opacity / size maths, and nothing else.
  particleCalls(withArt, low, themeId) {
    const rec = new DrawRecorder(), sb = this.fxSandbox(this.FX_FILES.map((f) => [f, this.read("src/" + f)]), rec), LST = sb.LST;
    const { m } = this.fxManifest(LST, withArt), fx = new LST.FxRenderer({}, m), ctx = rec.ctx("ctx"), out = {};
    fx.setTheme(themeId);
    const mark = (k, fn) => { const i = rec.log.length; fn(); out[k] = rec.log.slice(i); };
    const shots = [{ x: 10, y: 5, vx: 300, vy: 40 }, { x: -4, y: 9, vx: 0, vy: 0 }, { x: 30, y: -8, vx: -200, vy: 100, crit: true }, { x: 1, y: 2, vx: 900, vy: 900, trail: "frost" }, { x: 3, y: 2, vx: 80, vy: -90, trail: "ember" }];
    mark("trails", () => fx.drawProjectiles(ctx, shots, low));
    const pool = this.pool(LST, 17);
    mark("pool", () => fx.drawPool(ctx, pool, 1.5, low));
    return { out, fx, pool, shots };
  }

  checkParticles() {
    const near = (a, b) => Math.abs(a - b) < 1e-6, R = RenderTest.img, S = { STREAK: 0, SOFT: 1, GLOW: 2 };
    const ALLOWED = /^ctx\.(save|restore|translate|rotate|drawImage)\(|^ctx\.(globalAlpha|globalCompositeOperation)=/;
    const data = JSON.parse(this.read("assets/fx/fx.json")), T = data.presets.trail, ink = data.presets.streakBurst.inkWidth;
    for (const th of ["cartoon", "neon", "pixel", "unknown"]) for (const low of [false, true]) {
      const { out, fx, pool, shots } = this.particleCalls(true, low, th), all = [...out.trails, ...out.pool], theme = data.themes[th] || data.themes.cartoon;
      this.ok(all.length > 40 && all.every((l) => ALLOWED.test(l)), `fx 10b (${th}, low=${low}): ProjectileTrails and ParticleBatch only save / restore, translate / rotate, set opacity / blend and drawImage (${all.length} calls; no stroke, path, arc, fill or colour)`);
      // Trails: one stretched trail.<variant> per moving shot, head on the shot, length min(48, speed x 0.05) (x 1.15 for element shots), height 9.
      const tr = out.trails.map(R).filter(Boolean), trails = tr.filter((d) => d.img.startsWith("trail_")), glows = tr.filter((d) => d.img.startsWith("glow_"));
      const moving = shots.filter((p) => p.vx || p.vy), lens = moving.map((p) => Math.min(T.maxLength, Math.hypot(p.vx, p.vy) * T.stretch) * (p.trail ? T.elementLength : 1));
      this.ok(JSON.stringify(trails.map((d) => d.img)) === JSON.stringify(["trail_base", "trail_base", "trail_frost", "trail_ember"]) && trails.every((d, i) => near(d.dw, lens[i]) && near(d.dh, T.height)),
        `fx 10b (${th}, low=${low}): every moving shot plays trail.<its element trail, else base> stretched behind it (lengths ${lens.map((l) => l.toFixed(1)).join(", ")}, height ${T.height}); a still shot has none`);
      // Batched draws undo their own rotate (no per-draw save / restore): rotations come in (a, -a) pairs.
      const allRots = out.trails.filter((l) => l.startsWith("ctx.rotate(")).map((l) => Number(l.slice(11, -1)));
      const rots = allRots.filter((_, k) => k % 2 === 0).slice(0, 4), undone = allRots.length % 2 === 0 && allRots.every((r, k) => k % 2 === 0 || r === -allRots[k - 1]);
      this.ok(rots.length === 4 && undone && moving.every((p, i) => near(rots[i], Math.atan2(p.vy, p.vx))), `fx 10b (${th}, low=${low}): each trail is rotated to its shot's velocity, and each rotate is undone exactly`);
      const saves = all.filter((l) => l === "ctx.save()").length, restores = all.filter((l) => l === "ctx.restore()").length;
      this.ok(saves === restores && saves <= 2, `fx 10b (${th}, low=${low}): no per-particle save / restore (one balanced pair per drawer pass: ${saves} / ${restores})`);
      const tA = out.trails.filter((l) => l.startsWith("ctx.globalAlpha=")).map((l) => Number(l.slice(16)));
      this.ok(tA.slice(0, 4).every((a) => near(a, Math.min(1, theme.trailAlpha))), `fx 10b (${th}, low=${low}): trails at the theme's trail opacity (${theme.trailAlpha})`);
      const wantG = low ? [] : ["glow_gold", "glow_gold", "glow_amber", "glow_cyan", "glow_orange"], wantR = [T.glowRadius, T.glowRadius, T.critGlowRadius, T.glowRadius * T.elementGlowMul, T.glowRadius * T.elementGlowMul];
      this.ok(JSON.stringify(glows.map((d) => d.img)) === JSON.stringify(wantG) && glows.every((d, i) => near(d.dw, 2 * wantR[i])) && (low || out.trails.includes(`ctx.globalCompositeOperation=${JSON.stringify(theme.blend)}`)),
        `fx 10b (${th}, low=${low}): shot glows ${low ? "are skipped in low quality" : "play glow.gold / amber (crit) / the element's glow at the old radii, in the theme blend"}`);
      // Pool: glow under motes and crit glows (pass 1), mote cores (pass 2), then streaks with the fade step's frame.
      const pd = out.pool.map(R).filter(Boolean), pal = pool.palette, n = pool.count;
      const idx = (sh) => [...Array(n).keys()].filter((i) => pool.shape[i] === sh);
      const soft = idx(S.SOFT), glow = idx(S.GLOW), streak = idx(S.STREAK);
      const glowOrder = [...Array(n).keys()].filter((i) => pool.shape[i] !== S.STREAK);
      const wantPool = [...glowOrder.map((i) => "glow_" + pal[pool.color[i]]), ...soft.map(() => "motes"), ...streak.map((i) => "streak_" + pal[pool.color[i]])];
      this.ok(JSON.stringify(pd.map((d) => d.img)) === JSON.stringify(wantPool), `fx 10b (${th}, low=${low}): a pool draws glow.<variant> under ${glowOrder.length} motes / crit glows, then ${soft.length} mote.<variant> cores, then ${streak.length} streak.<variant>`);
      const mR = (i) => Math.max(1.2 * 1.5, pool.size[i] * 0.24) * data.effects["mote." + pal[pool.color[i]]].size;
      const motes = pd.filter((d) => d.img === "motes");
      this.ok(motes.every((d, k) => near(d.dw, 2 * mR(soft[k]))), `fx 10b (${th}, low=${low}): mote cores at the old core radius (max(1.2 px, 0.24 x size)) x the entry's size`);
      const streaks = pd.filter((d) => d.img.startsWith("streak_")), step = (i) => Math.min(2, ((1 - pool.life[i] / pool.maxLife[i]) * 3) | 0);
      this.ok(streaks.length === streak.length && streaks.every((d, k) => { const i = streak[k], sp = Math.hypot(pool.vx[i], pool.vy[i]) || 1; const U = (data.effects["streak." + pal[pool.color[i]]].fade || {}).until || 1; return d.sx === Math.min(3, Math.floor(((step(i) + 0.5) / 3 / U) * 4)) * 64 && near(d.dh, pool.size[i] + ink * 1.5) && near(d.dw, Math.max(pool.minLen[i], sp * pool.stretch[i])); }),
        `fx 10b (${th}, low=${low}): streaks play the frame of their fade step (fresh / mid / fade: progress (step + 0.5) / 3 / fade.until through the strip, fx.json holds the longer frames; the stub strip has 4 frames), stretched to the old length (max(minLen, speed x stretch)), height = width + the old ink edge (${ink} px x unit)`);
      const pA = out.pool.filter((l) => l.startsWith("ctx.globalAlpha=")).map((l) => Number(l.slice(16)));
      const wantA = [...glowOrder.map((i) => { const f = pool.life[i] / pool.maxLife[i]; return (pool.shape[i] === S.SOFT ? Math.min(1, (1 - f) * 6) * Math.pow(f, 0.6) * 0.85 : f) * theme.glow; }),
        ...soft.map((i) => { const f = pool.life[i] / pool.maxLife[i]; return Math.min(1, (1 - f) * 6) * Math.pow(f, 0.5) * 0.95; }), ...streak.map((i) => Math.min(1, (1 - (step(i) + 0.5) / 3) * 1.8))].map((a) => Math.min(1, a)).filter((a) => a >= 0.01);
      this.ok(pA.length === wantA.length && pA.every((a, i) => near(a, wantA[i])), `fx 10b (${th}, low=${low}): every particle keeps the old opacity curve (${pA.length} draws)`);
      this.ok(fx.drawn === n, `fx 10b: the batcher still counts drawn particles for QA (${fx.drawn})`);
    }
    { // P3: no per-particle allocation. Every draw from a drawer reuses its one args object, and ids are cached strings.
      const { fx, pool, shots } = this.particleCalls(true, false, "cartoon"), E = fx.effects, seen = [], draw = E.draw.bind(E);
      E.draw = (id, ctx, at) => { seen.push([id, at]); return draw(id, ctx, at); };
      const c = new DrawRecorder().ctx("c"); fx.drawProjectiles(c, shots, false); fx.drawPool(c, pool, 1.5, false);
      const ats = new Set(seen.map(([, at]) => at)), ids = typeof E.variantId === "function" && seen.every(([id]) => id === E.variantId(...id.split(".")));
      this.ok(seen.length > 20 && ats.size === 2 && ids, `fx 10b: trails and particles reuse one args object per drawer and cached ids (${seen.length} draws, ${ats.size} args objects)`);
    }
    const none = this.particleCalls(false, false, "cartoon"), drawn = [...none.out.trails, ...none.out.pool];
    const real = drawn.filter((l) => l !== "ctx.save()" && l !== "ctx.restore()");
    this.ok(real.length === 0 && drawn.filter((l) => l === "ctx.save()").length === drawn.filter((l) => l === "ctx.restore()").length, `fx 10b: with no art loaded, trails and particles draw nothing at all (no fallback; ${real.length} calls besides the drawers' balanced save / restore)`);
  }

  // ---------- 3. PR 10a: the converted drawers play fx.json effects ----------

  // The real assets/fx/fx.json, with every sheet it lists installed as a stub image named after
  // the sheet (frames 64 x 64, centre anchor, refBodyR 32; strips main, r0, r1, r2), or with none.
  fxManifest(LST, withArt) {
    const m = new LST.FxManifest("assets/fx/fx.json"), data = JSON.parse(this.read("assets/fx/fx.json"));
    m.setData(data);
    if (withArt) for (const id of new Set([...Object.keys(data.sheets), ...Object.values(data.effects).flatMap((e) => [].concat(e.sheet))])) {
      const strip = (img) => ({ image: img, frame: { w: 64, h: 64 }, count: 4, fps: 8, loop: false });
      m.install(id, { strips: { main: strip("m.png"), r0: strip("a.png"), r1: strip("b.png"), r2: strip("c.png") }, anchor: { x: 32, y: 32 }, refBodyR: 32 },
        { main: { name: id }, r0: { name: id + "#r0" }, r1: { name: id + "#r1" }, r2: { name: id + "#r2" } });
    }
    return { m, data };
  }

  convertedCalls(withArt, low) {
    const rec = new DrawRecorder(), sb = this.fxSandbox(this.FX_FILES.map((f) => [f, this.read("src/" + f)]), rec), LST = sb.LST;
    vm.runInContext(this.read("src/render/OverdriveRing.js"), sb, { filename: "OverdriveRing.js" });
    const { m } = this.fxManifest(LST, withArt), fx = new LST.FxRenderer({}, m), ctx = rec.ctx("ctx"), out = {};
    const mark = (k, fn) => { const i = rec.log.length; fn(); out[k] = rec.log.slice(i); };
    const aura = { power: 1, intensity: 0.6, tier: 1 };
    const camera = { pulses: [{ active: true, space: "world", t: 0.1, life: 0.5, ring: 60, bloom: 0.8, color: "#ffaa00", impact: "bossKill", x: 3, y: 4, flash: 0.6, drawnFrame: -1 }, { active: true, space: "screen", t: 0.2, life: 0.4, ring: 30, bloom: 0, color: "#ffffff", impact: "elemFrost", x: 0, y: 0, flash: 0, drawnFrame: -1 }, { active: true, space: "world", t: 0.1, life: 0.5, ring: 40, bloom: 0.5, impact: "noSuchImpact", x: 0, y: 0, flash: 0, drawnFrame: -1 }, { active: false, space: "world" }] };
    mark("overdrive", () => new LST.OverdriveRing().draw(ctx, { x: 0, y: 0, radius: 26, overdrive: 2 }, 1.3, fx.effects));
    mark("under", () => fx.drawUnder(ctx, { x: 0, y: 0, radius: 26 }, aura, 1.3));
    mark("arcs", () => fx.drawArcs(ctx, [{ t: 0.05, life: 0.2, color: "#88ddff", pts: [[0, 0], [20, 10], [140, 60]], jag: [0.3, -0.2, 0.5, -0.4, 0.1, 0.2] }, { t: 0.15, life: 0.2, pts: [[5, 5], [5, 5]], jag: [0.1, 0.1, 0.1] }], low));
    mark("texts", () => fx.drawTextGlows(ctx, [{ kind: "coin", x: 1, y: 2, life: 0.4, maxLife: 1 }, { kind: "hit", x: 0, y: 0, life: 1, maxLife: 1 }, { kind: "crit", x: 5, y: 6, life: 0.9, maxLife: 1 }]));
    mark("pulses", () => { fx.drawPulses(ctx, camera, "world", 12, 1, low); fx.drawPulses(ctx, camera, "screen", 12, 2, low); });
    mark("flashes", () => fx.drawFlashes(ctx, camera, { width: 390, height: 844, scale: 1.4 }));
    out.stamps = camera.pulses.slice(0, 3).map((p) => p.drawnFrame);
    return out;
  }

  // drawImage(<img>,sx,sy,sw,sh,dx,dy,dw,dh) -> { img, sx, dx, dy, dw, dh }
  static img(l) {
    const m = /^ctx\.drawImage\(<([^>]+)>,(.*)\)$/.exec(l);
    if (!m) return null;
    const [sx, , , , dx, dy, dw, dh] = m[2].split(",").map(Number);
    return { img: m[1], sx, dx, dy, dw, dh };
  }

  checkConverted() {
    const near = (a, b) => Math.abs(a - b) < 1e-6, R = RenderTest.img;
    const BANNED = /^ctx\.(arc|arcTo|ellipse|rect|fill|stroke|fillRect|strokeRect|lineTo|moveTo|beginPath|createRadialGradient|createLinearGradient|createConicGradient|createPattern|getImageData|putImageData)\(|^ctx\.(fillStyle|strokeStyle|shadowColor|shadowBlur|filter|lineWidth)=/;
    for (const low of [false, true]) {
      const c = this.convertedCalls(true, low), all = Object.entries(c).filter(([k]) => k !== "stamps").map(([, v]) => v).flat();
      const imgs = (k) => c[k].map(R).filter(Boolean);
      this.ok(all.length > 30 && !all.some((l) => BANNED.test(l)), `fx 10a (low=${low}): the converted drawers make no shape, path, gradient, colour or filter call (${all.length} calls; only save / restore, globalAlpha, globalCompositeOperation, translate / rotate and drawImage)`);
      this.ok(all.every((l) => /^ctx\.(save|restore|translate|rotate|drawImage)\(|^ctx\.(globalAlpha|globalCompositeOperation)=/.test(l)), `fx 10a (low=${low}): every call is one of save, restore, translate, rotate, drawImage, globalAlpha, globalCompositeOperation`);
      const blends = all.filter((l) => l.startsWith("ctx.globalCompositeOperation=")).map((l) => JSON.parse(l.slice(29)));
      this.ok(blends.every((b) => ["source-over", "screen", "lighter"].includes(b)), `fx 10a (low=${low}): blends are only source-over / screen / lighter (no tinting composite ops): ${[...new Set(blends)].join(", ")}`);
      // overdrive: the overdrive_aura sheet centred on the tower, R = size 2.25 x radius 26
      const od = imgs("overdrive");
      this.ok(od.length === 1 && od[0].img === "overdrive_aura" && near(od[0].dw, 2 * 2.25 * 26) && near(od[0].dx, -2.25 * 26) && near(od[0].dy, -2.25 * 26), `fx 10a: OverdriveRing plays "overdriveAura": overdrive_aura centred on the tower, sized by its radius (${JSON.stringify(od[0])})`);
      // tower aura: tier 1 sheet, R = 26 x (2.22 + 1.38 x 0.6), alpha (0.08 + 0.47 x 0.6) x (0.9 + 0.1 sin(1.3 x 2.4))
      const un = imgs("under"), R1 = 26 * (2.22 + 1.38 * 0.6), a1 = (0.08 + 0.47 * 0.6) * (0.9 + 0.1 * Math.sin(1.3 * 2.4));
      const aUnder = c.under.find((l) => l.startsWith("ctx.globalAlpha="));
      this.ok(un.length === 1 && un[0].img === "tower_aura_t1" && near(un[0].dw, 2 * R1) && near(un[0].dx, -R1) && aUnder && near(Number(aUnder.slice(16)), a1) && c.under.includes('ctx.globalCompositeOperation="screen"'),
        `fx 10a: TowerGroundGlow plays "towerAura": the tier-1 sheet, size and strength from fx.json by tower power, screen blend (R ${R1.toFixed(2)}, alpha ${a1.toFixed(4)})`);
      // arcs: bolts are stretched chain_bolt strips along each hop (min 56 px), flashes for the first 55% of life, node glows only in high quality
      const ar = imgs("arcs"), bolts = ar.filter((d) => d.img.startsWith("chain_bolt#")), flashes = ar.filter((d) => d.img === "chain_arc_flash"), nodes = ar.filter((d) => d.img === "chain_node_glow");
      const rot = c.arcs.filter((l) => l.startsWith("ctx.rotate("));
      this.ok(bolts.length === 3 && near(bolts[0].dw, Math.hypot(20, 10) < 56 ? 56 : Math.hypot(20, 10)) && near(bolts[1].dw, Math.hypot(120, 50)) && near(bolts[2].dw, 56) && rot.length === 3 && near(Number(rot[0].slice(11, -1)), Math.atan2(10, 20)),
        `fx 10a: ChainArcs stretches a chain_bolt variant along every hop (lengths ${bolts.map((b) => b.dw.toFixed(1)).join(", ")}; bunched hops at least 56 px), rotated to the hop`);
      this.ok(new Set(bolts.map((b) => b.img)).size >= 2 && bolts.every((b) => /#r[012]$/.test(b.img)), `fx 10a: bolt variant rows are picked from the bolt's own jag (${bolts.map((b) => b.img.slice(-2)).join(" ")})`);
      this.ok(flashes.length === 3 && nodes.length === (low ? 0 : 5), `fx 10a: arc flashes on the 3 points of the young bolt only (first 55% of life); node glows on all 5 points ${low ? "skipped in low quality" : "in high quality"} (${flashes.length} / ${nodes.length})`);
      // text glows: coin -> glow_gold at x - 13, crit -> glow_amber, hit -> nothing
      const tx = imgs("texts");
      this.ok(tx.length === 2 && tx[0].img === "glow_gold" && near(tx[0].dx, 1 - 13 - 22) && near(tx[0].dw, 44) && tx[1].img === "glow_amber" && near(tx[1].dw, 60), `fx 10a: TextGlows plays "textGlow.<kind>": coin -> glow_gold (offset -13), crit -> glow_amber, hit -> none (no kind branch in code)`);
      // pulses: bossKill -> pale bloom + gold ring (world), elemFrost -> blue ring (screen), unknown impact -> nothing (still stamped)
      const pu = imgs("pulses").map((d) => d.img);
      this.ok(JSON.stringify(pu) === JSON.stringify(low ? ["impact_ring_gold", "impact_ring_blue"] : ["glow_pale", "impact_ring_gold", "impact_ring_blue"]) && c.stamps.join() === "12,12,12",
        `fx 10a: ImpactPulses plays the ring / bloom fx.json "impacts" names per impact (bossKill -> glow_pale bloom + impact_ring_gold, elemFrost -> impact_ring_blue; blooms skip low quality; an unlisted impact draws nothing) and still stamps the first drawn frame (${pu.join(", ")})`);
      // flashes: screen_burst (Decision 12) centred on the impact in screen px, R = 0.5 x 844, alpha 0.6 x (1 - 0.2)^2
      const fl = imgs("flashes"), aFl = c.flashes.find((l) => l.startsWith("ctx.globalAlpha="));
      this.ok(fl.length === 1 && fl[0].img === "screen_burst" && near(fl[0].dx, 195 + 3 * 1.4 - 422) && near(fl[0].dw, 844) && aFl && near(Number(aFl.slice(16)), 0.6 * 0.64), `fx 10a: ImpactFlashes plays "impactFlash" (screen_burst, centred on the impact in screen px, fading with the pulse)`);
    }
    const none = this.convertedCalls(false, false), drawnNone = Object.entries(none).filter(([k]) => k !== "stamps").map(([, v]) => v).flat();
    this.ok(drawnNone.length === 0 && none.stamps.join() === "12,12,12", `fx 10a: with no art loaded the converted drawers draw nothing at all (no fallback), and pulses are still stamped (${drawnNone.length} calls)`);
  }

  // ---------- 4. structure ----------

  checkStructure() {
    const sb = this.sandbox(this.RENDER_FILES.map((f) => [f, this.read("src/" + f)]), new DrawRecorder()), LST = sb.LST;
    const P = new LST.RenderPipeline();
    this.ok(P.layers.map((l) => l.constructor.name).join() === this.LAYERS.join(), "pipeline: layers in order " + this.LAYERS.join(" > "));
    this.ok(P.layers.every((l) => l instanceof LST.RenderLayer) && P.layers.map((l) => l.space).join() === "world,world,world,world,screen,screen", "pipeline: four world layers, then two screen layers");
    { let threw = false; try { new LST.RenderPipeline([new LST.HudCanvasLayer(), new LST.EnemyLayer()]); } catch (e) { threw = true; } this.ok(threw, "pipeline: refuses a world layer after a screen layer"); }
    const r = this.read("src/render.js"), drawSrc = r.slice(r.indexOf("  draw(scene, dt) {"), r.indexOf("// Small drawing helpers"));
    this.ok(/this\.pipeline\.draw\(this, ctx, scene\)/.test(drawSrc) && !/theme\.(enemy|tower|banner|background)\(|scene\.(enemies|texts)|drawOverlays|fx\.draw/.test(drawSrc), "render.js: Renderer.draw only sets up the canvas and runs the pipeline");
    const fxr = this.read("src/fx/FxRenderer.js");
    this.ok(!/ctx\.(arc|stroke|drawImage|lineTo)|createRadialGradient/.test(fxr), "FxRenderer: a thin batcher (no drawing code of its own)");
    for (const f of [...this.RENDER_FILES.filter((f) => f !== "render.js"), ...this.FX_FILES]) {
      const src = this.read("src/" + f), classes = [...src.matchAll(/\bclass (\w+)(?: extends [\w.]+)? \{/g)].map((c) => c[1]);
      this.ok(classes.length === 1 && classes[0] === path.basename(f, ".js") && !/^(function |const \w+ = (\(|function))/m.test(src), `files: ${f} holds one class, ${classes[0]}, and no loose function`);
    }
    const html = this.read("index.html"), sw = this.read("sw.js"), styles = this.read("styles.html");
    const scripts = [...html.matchAll(/<script src="([^"]+)"/g)].map((m) => m[1]);
    this.ok(this.RENDER_FILES.every((f) => scripts.includes("src/" + f) && sw.includes(`"src/${f}"`) && styles.includes(`src="src/${f}"`)), "files: the pipeline files are loaded by index.html and styles.html and cached by sw.js");
    this.ok(this.FX_FILES.every((f) => scripts.includes("src/" + f) && sw.includes(`"src/${f}"`)) && scripts.indexOf("src/fx/draw/ParticleBatch.js") < scripts.indexOf("src/fx/FxRenderer.js"), "files: the FX drawers load before FxRenderer and are cached by sw.js");
    this.ok(scripts.indexOf("src/render/RenderPipeline.js") < scripts.indexOf("src/render.js") && scripts.indexOf("src/render/RenderLayer.js") < scripts.indexOf("src/render/BackdropLayer.js"), "files: RenderLayer, the layers and RenderPipeline load before render.js");
  }

  run() {
    this.checkRenderer();
    this.checkParticles();
    this.checkConverted();
    this.checkStructure();
    console.log(this.fails ? `\n${this.fails} FAILED (${this.passes} passed)` : `\nALL PASS (${this.passes} passed)`);
    return this.fails ? 1 : 0;
  }
}

module.exports = RenderTest;
if (require.main === module) process.exit(new RenderTest().run());
