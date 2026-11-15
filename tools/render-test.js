#!/usr/bin/env node
// Render test (node, no browser): node tools/render-test.js
// PR 8b split render.js into a RenderPipeline of ordered layers and FxRenderer into one drawer
// per effect. The oracle is the real old code, loaded with `git show` (nothing copied):
//   1. Renderer.draw at 24349b8 (the last render.js before the pipeline) and at 738409a (the last
//      render.js that compared state strings) draw exactly the same calls, in the same order, as
//      the new pipeline, for every run-flow state and every scene case (finale intro, phase /
//      boss / wave banners, low HP, flash, Overdrive, hazards, corpses, World 2 bodies, no FX,
//      reduced motion, a pixel theme, a theme without its optional parts).
//   2. FxRenderer at 24349b8 and the new batcher + drawers draw the same calls for every method,
//      every FX theme and both quality levels.
//   3. The layers are in the required order, one class per file, and render.js / FxRenderer only
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
    this.FX_FILES = ["fx/draw/GlowSprites.js", "fx/draw/TowerGroundGlow.js", "fx/draw/ProjectileTrails.js", "fx/draw/ChainArcs.js", "fx/draw/TextGlows.js", "fx/draw/ParticleBatch.js", "fx/draw/ImpactPulses.js", "fx/draw/ImpactFlashes.js", "fx/FxRenderer.js"];
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
    r.fx = c.noFx ? null : rec.stub("fx", { drawUnder: null, drawProjectiles: null, drawWorld: null, drawTextGlows: null, drawScreen: null }, { name: "fx", reducedMotion: !!c.reduced, shake: 0.3 });
    const scene = this.scene(id, c);
    rec.log.length = 0;
    sb.Math.random = this.seededMath(7).random;
    r.draw(scene, 1 / 60);
    return rec.log;
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
    let n = 0, same24 = 0, same73 = 0, firstBad = null;
    for (const id of this.IDS) for (const [cn, c] of Object.entries(CASES)) {
      n++;
      const now = this.drawFrame(cur, id, c);
      const a = JSON.stringify(now) === JSON.stringify(this.drawFrame(oldOrder, id, c));
      const b = JSON.stringify(now) === JSON.stringify(this.drawFrame(oldState, id, c));
      if (a) same24++; if (b) same73++;
      if ((!a || !b) && !firstBad) firstBad = `${id}/${cn}`;
      if (id === "playing" && cn === "lowHp") this.sampleCalls = now.length;
    }
    this.ok(same24 === n, `render: the RenderPipeline draws exactly what render.js@${this.ORDER_REV} drew, call for call, in all ${n} state x scene cases (${same24}/${n}${firstBad ? ", first diff " + firstBad : ""})`);
    this.ok(same73 === n, `render: SceneFlags pick the same finale dim, banner and low-HP pulse as the state-string checks of render.js@${this.STATE_REV}, in all ${n} cases (${same73}/${n})`);
    this.ok(this.sampleCalls > 30, `render: the recorder sees the frame (${this.sampleCalls} calls in playing/lowHp)`);
  }

  // ---------- 2. FxRenderer: old vs new ----------

  fxSandbox(sources, rec) {
    const sb = { console, Math, window: {} };
    vm.createContext(sb);
    vm.runInContext("var window = this.window; window.LST = {}; var LST = window.LST;", sb);
    for (const f of ["fx/FxPresets.js", "fx/ParticlePool.js", "fx/ImpactSync.js"]) vm.runInContext(this.read("src/" + f), sb, { filename: f });
    for (const [name, code] of sources) vm.runInContext(code, sb, { filename: name });
    return sb;
  }

  pool(LST, n) {
    const p = { name: "pool", count: n, palette: ["#ff0000", "#00ff00", "#3355ff"] };
    for (const k of ["x", "y", "vx", "vy", "life", "maxLife", "size", "shape", "color", "minLen", "stretch"]) p[k] = [];
    const S = LST.FX_SHAPE;
    for (let i = 0; i < n; i++) {
      p.x.push(i * 7 - 20); p.y.push(i * 3); p.vx.push(i % 3 ? 40 : 0); p.vy.push(-30 + i); p.maxLife.push(1); p.life.push(((i * 37) % 100) / 100 + 0.01);
      p.size.push(2 + (i % 4)); p.shape.push([S.STREAK, S.SOFT, S.GLOW][i % 3]); p.color.push(i % 3); p.minLen.push(4); p.stretch.push(0.05);
    }
    return p;
  }

  fxCalls(sources, themeId, low) {
    const rec = new DrawRecorder(), sb = this.fxSandbox(sources, rec), LST = sb.LST;
    const doc = { createElement: () => ({ name: "glowCanvas", width: 0, height: 0, getContext: () => rec.ctx("glow") }) };
    const fx = new LST.FxRenderer(doc), ctx = rec.ctx("ctx");
    fx.setTheme(themeId);
    const aura = { power: 1, intensity: 0.6, tier: 1, preset: { groundGlow: [0.2, 0.6], colorsByTier: [["#ffcc00"], ["#ff8800", "#ffee00", "#ffffff"]] } };
    fx.drawUnder(ctx, { x: 0, y: 0, radius: 26 }, aura, 1.3);
    fx.drawProjectiles(ctx, [{ x: 10, y: 5, vx: 300, vy: 40 }, { x: -4, y: 9, vx: 0, vy: 0 }, { x: 30, y: -8, vx: -200, vy: 100, crit: true }, { x: 1, y: 2, vx: 90, vy: 90, tint: "#66ccff" }, { x: 3, y: 2, vx: 80, vy: -90, tint: "#ff6633" }], low);
    fx.drawArcs(ctx, [{ t: 0.05, life: 0.2, color: "#88ddff", pts: [[0, 0], [20, 10], [140, 60]], jag: [0.3, -0.2, 0.5, -0.4, 0.1, 0.2] }, { t: 0.15, life: 0.2, pts: [[5, 5], [5, 5]], jag: [0.1, 0.1, 0.1] }], low);
    fx.drawTextGlows(ctx, [{ kind: "coin", x: 1, y: 2, life: 0.4, maxLife: 1 }, { kind: "hit", x: 0, y: 0, life: 1, maxLife: 1 }, { kind: "crit", x: 5, y: 6, life: 0.9, maxLife: 1 }]);
    fx.drawPool(ctx, this.pool(LST, 17), 1.5, low);
    const camera = { pulses: [{ active: true, space: "world", t: 0.1, life: 0.5, ring: 60, bloom: 0.8, color: "#ffaa00", x: 3, y: 4, flash: 0.6, drawnFrame: -1 }, { active: true, space: "screen", t: 0.2, life: 0.4, ring: 30, bloom: 0, color: "#ffffff", x: 0, y: 0, flash: 0, drawnFrame: -1 }, { active: false, space: "world" }] };
    fx.drawPulses(ctx, camera, "world", 12, 1, low);
    fx.drawPulses(ctx, camera, "screen", 12, 2, low);
    fx.drawFlashes(ctx, camera, { width: 390, height: 844, scale: 1.4 });
    rec.log.push("drawn=" + fx.drawn, "stamp=" + camera.pulses[0].drawnFrame + "," + camera.pulses[1].drawnFrame);
    return rec.log;
  }

  checkFxRenderer() {
    const cur = this.FX_FILES.map((f) => [f, this.read("src/" + f)]);
    const old = [["FxRenderer.js@" + this.ORDER_REV, this.show(this.ORDER_REV, "src/fx/FxRenderer.js")]];
    let n = 0, same = 0, calls = 0;
    for (const th of ["cartoon", "neon", "pixel", "unknown"]) for (const low of [false, true]) {
      n++; const a = this.fxCalls(cur, th, low), b = this.fxCalls(old, th, low); calls += a.length;
      if (JSON.stringify(a) === JSON.stringify(b)) same++; else this.ok(false, `fx: ${th}/low=${low} differs from FxRenderer.js@${this.ORDER_REV}`);
    }
    this.ok(same === n && calls > 500, `fx: FxRenderer + drawers draw exactly what FxRenderer.js@${this.ORDER_REV} drew, for every method, FX theme and quality (${same}/${n}, ${calls} calls)`);
  }

  // ---------- 3. structure ----------

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
    this.checkFxRenderer();
    this.checkStructure();
    console.log(this.fails ? `\n${this.fails} FAILED (${this.passes} passed)` : `\nALL PASS (${this.passes} passed)`);
    return this.fails ? 1 : 0;
  }
}

module.exports = RenderTest;
if (require.main === module) process.exit(new RenderTest().run());
