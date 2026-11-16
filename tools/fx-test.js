#!/usr/bin/env node
// FX manifest test (node, no browser): node tools/fx-test.js
// PR 10a: assets/fx/fx.json + FxManifest + SpriteEffect + EffectPlayer.
//   1. Files: one class per file, loaded by index.html in order, cached by sw.js.
//   2. fx.json: every effect the code asks for exists, every sheet it lists is a delivered art file
//      (JSON + PNG, sha256 = the delivery's), every impact has a ring / bloom, every preset colour
//      that reaches a glow has a glow image, and no test fixture is listed anywhere the game loads.
//   3. SpriteEffect / FxManifest / EffectPlayer driven directly: loop and one-shot frames, fades,
//      level / progress values, grid rows, segment stretch, unknown ids, missing art.
//   4. sw.js: its manifest reader lists fx.json, every sheet JSON and every PNG, and nothing in
//      assets/fx is hand-listed in PRECACHE.
const fs = require("fs"), path = require("path"), vm = require("vm"), crypto = require("crypto");

class FxTest {
  constructor(root = path.join(__dirname, "..")) {
    this.root = root;
    this.passes = 0;
    this.fails = 0;
    this.FILES = ["src/fx/SpriteEffect.js", "src/fx/FxManifest.js", "src/fx/EffectPlayer.js"];
    this.ASKED = ["overdriveAura", "towerAura", "chainBolt", "chainArcFlash", "chainNodeGlow", "impactFlash", "textGlow.coin", "textGlow.crit"];
  }

  ok(c, m) { if (c) this.passes++; else { this.fails++; console.log("FAIL " + m); } }
  read(rel) { return fs.readFileSync(path.join(this.root, rel), "utf8"); }
  exists(rel) { return fs.existsSync(path.join(this.root, rel)); }

  sandbox() {
    const sb = { console, Math, window: {} };
    vm.createContext(sb);
    vm.runInContext("var window = this.window; window.LST = {}; var LST = window.LST;", sb);
    for (const f of ["src/config.js", "src/fx/FxPresets.js", "src/sprites/SheetAnimation.js", ...this.FILES]) vm.runInContext(this.read(f), sb, { filename: f });
    return sb;
  }

  // A recording 2D context.
  ctx() {
    const log = [];
    return { log, ctx: new Proxy({}, { get: (t, k) => (...a) => log.push([k, ...a]), set: (t, k, v) => { log.push([k + "=", v]); return true; } }) };
  }

  checkFiles() {
    const html = this.read("index.html"), sw = this.read("sw.js"), scripts = [...html.matchAll(/<script src="([^"]+)"/g)].map((m) => m[1]);
    for (const f of this.FILES) {
      const src = this.read(f), classes = [...src.matchAll(/\bclass (\w+)/g)].map((c) => c[1]);
      this.ok(classes.length === 1 && classes[0] === path.basename(f, ".js") && !/^(function |const \w+ = (\(|function))/m.test(src), `files: ${f} holds one class and no loose function`);
      this.ok(scripts.includes(f) && sw.includes(`"${f}"`), `files: ${f} is loaded by index.html and cached by sw.js`);
    }
    const at = (f) => scripts.indexOf(f);
    this.ok(at("src/sprites/SpriteAtlas.js") < at("src/fx/FxManifest.js") && at("src/sprites/SheetAnimation.js") < at("src/fx/SpriteEffect.js") && at("src/fx/SpriteEffect.js") < at("src/fx/FxManifest.js") && at("src/fx/FxManifest.js") < at("src/fx/EffectPlayer.js") && at("src/fx/EffectPlayer.js") < at("src/fx/FxRenderer.js") && at("src/fx/FxRenderer.js") < at("src/fx/FxDirector.js"),
      "files: SheetAnimation, SpriteAtlas > SpriteEffect > FxManifest > EffectPlayer > FxRenderer > FxDirector load order");
    this.ok(!scripts.some((s) => /GlowSprites/.test(s)) && !this.exists("src/fx/draw/GlowSprites.js"), "files: GlowSprites is deleted and not loaded");
  }

  checkManifest(LST) {
    const data = JSON.parse(this.read("assets/fx/fx.json"));
    this.ok(this.ASKED.every((id) => data.effects[id]), `fx.json: every effect id the code asks for exists (${this.ASKED.join(", ")})`);
    const sheetIds = new Set(Object.values(data.effects).flatMap((e) => [].concat(e.sheet)));
    this.ok([...sheetIds].every((s) => data.sheets[s]), `fx.json: every effect's sheet is listed (${sheetIds.size} sheets used)`);
    let files = 0, shaOk = 0;
    const prov = this.exists("assets/fx/PROVENANCE.json") ? JSON.parse(this.read("assets/fx/PROVENANCE.json")) : {};
    for (const [id, rel] of Object.entries(data.sheets)) {
      const jp = "assets/fx/" + rel;
      if (!this.exists(jp)) { this.ok(false, `art: ${jp} (sheet ${id}) is missing`); continue; }
      const j = JSON.parse(this.read(jp)), png = path.dirname(jp) + "/" + j.image;
      files += 2;
      if (!this.exists(png)) { this.ok(false, `art: ${png} is missing`); continue; }
      const sha = crypto.createHash("sha256").update(fs.readFileSync(path.join(this.root, png))).digest("hex");
      const pv = prov[path.relative("assets/fx", png)];
      if (sha === j.sha256 && (!pv || !pv.sha256 || pv.sha256 === sha)) shaOk++; else this.ok(false, `art: ${png} sha256 ${sha.slice(0, 12)} != delivery ${String(j.sha256).slice(0, 12)}`);
    }
    this.ok(files === Object.keys(data.sheets).length * 2 && shaOk === Object.keys(data.sheets).length, `art: every sheet fx.json lists is a delivered JSON + PNG, byte-identical to the Game Art & Motion delivery (sha256; ${shaOk}/${Object.keys(data.sheets).length} sheets, ${files} files)`);
    this.ok(Object.keys(LST.FX_IMPACTS).every((n) => data.impacts[n] && data.effects[data.impacts[n].ring] && data.effects[data.impacts[n].bloom]), `fx.json: every impact (${Object.keys(LST.FX_IMPACTS).length}) names a ring and a bloom effect that exist`);
    // Colours that reach a glow image today (ParticleBatch glows / motes, ProjectileTrails glows).
    const P = LST.FX_PRESETS, elems = fs.readdirSync(path.join(this.root, "src/elements")).filter((f) => f.endsWith(".js")).map((f) => /color: "(#[0-9a-f]{6})"/i.exec(this.read("src/elements/" + f))).filter(Boolean).map((m) => m[1]);
    const colors = [...new Set([P.trail.color, P.trail.critColor, P.glow.critColor, ...P.aura.colorsByTier.flat(), ...elems].map((c) => c.toLowerCase()))];
    const missing = colors.filter((c) => !data.glowColors[c] || !data.sheets[data.glowColors[c]]);
    this.ok(!missing.length, `fx.json: every preset / element colour that reaches a glow (${colors.length}) has a glow image (missing: ${missing.join(", ") || "none"})`);
    const loaded = ["index.html", "sw.js", "assets/fx/fx.json", ...this.walk("src")].filter((f) => /fixtures\//.test(this.read(f)));
    this.ok(!loaded.length && !fs.readdirSync(path.join(this.root, "assets/fx")).some((f) => /fixture|acceptance/i.test(f)), "fixtures: no test fixture is listed by index.html, sw.js, fx.json or src/, or sits in assets/fx (" + (loaded.join(", ") || "none") + ")");
    return data;
  }

  checkObjects(LST) {
    const m = new LST.FxManifest("assets/fx/fx.json");
    m.setData({ sheets: { s: "s.json", o: "o.json", g: "g.json" }, effects: {
      loop: { sheet: "s", size: 2 }, shot: { sheet: "o", fade: { power: 2 } }, lvl: { sheet: "s", size: { from: 1, to: 3, by: "level" }, alpha: { from: 0.2, to: 0.6, by: "level" } },
      grid: { sheet: "g", strip: ["r0", "r1"], fit: "segment", size: 2, minLength: 50 }, low: { sheet: "s", skipLow: true }, early: { sheet: "o", fade: { until: 0.5 } }, gone: { sheet: "nope" },
    } });
    const flat = { frameW: 10, frameH: 20, count: 4, fps: 10, loop: true, anchor: [5, 10], image: "s.png" };
    m.install("s", flat, { main: { name: "S" } });
    m.install("o", Object.assign({}, flat, { loop: false }), { main: { name: "O" } });
    m.install("g", { frameW: 30, frameH: 8, count: 6, cols: 3, rows: 2, fps: 24, loop: false, anchor: [0, 4], image: "g.png" }, { r0: { name: "G" }, r1: { name: "G" } });
    const draw = (id, at) => { const c = this.ctx(); const r = m.draw(id, c.ctx, at); return { r, img: c.log.find((l) => l[0] === "drawImage"), log: c.log }; };
    const a = draw("loop", { x: 0, y: 0, base: 5, t: 0.25 }), b = draw("loop", { x: 0, y: 0, base: 5, t: 0.45 });
    this.ok(a.r && a.img[2] === 20 && b.img[2] === 0 && a.img[8] === 20 && a.img[6] === -10, `SpriteEffect: a loop sheet plays frames by fps and wraps (t 0.25 -> frame 2, t 0.45 -> frame 0); R = size x base drawn as half the frame (width ${a.img[8]})`);
    const s0 = draw("shot", { x: 0, y: 0, p: 0.1 }), s1 = draw("shot", { x: 0, y: 0, p: 0.8 });
    const al = (d) => d.log.find((l) => l[0] === "globalAlpha=")[1];
    this.ok(s0.img[2] === 0 && s1.img[2] === 30 && Math.abs(al(s0) - 0.81) < 1e-9 && draw("shot", { x: 0, y: 0, p: 0.95 }).r === false, `SpriteEffect: one-shot frames follow progress and fade (1-p)^power; nearly faded draws nothing`);
    const l0 = draw("lvl", { x: 0, y: 0, base: 1, level: 0.5 });
    this.ok(l0.img[8] === 4 && Math.abs(al(l0) - 0.4) < 1e-9, "SpriteEffect: by: level values lerp size and alpha by the caller's level");
    const g = draw("grid", { x: 1, y: 2, x2: 11, y2: 2, p: 0.5, pick: 0.7 });
    this.ok(g.img[2] === 30 && g.img[3] === 8 && g.img[4] === 30 && g.img[8] === 50 && g.img[9] === 16 && g.log.some((l) => l[0] === "translate" && l[1] === 1 && l[2] === 2), "SpriteEffect: grid sheets give one strip per row (pick 0.7 -> row r1, sy 8); segment fit stretches to at least minLength and scales height by size");
    this.ok(draw("low", { x: 0, y: 0, low: true }).r === false && draw("low", { x: 0, y: 0 }).r === true, "SpriteEffect: skipLow entries draw nothing in low quality");
    this.ok(draw("early", { x: 0, y: 0, p: 0.6 }).r === false && draw("early", { x: 0, y: 0, p: 0.2 }).img[2] === 10, "SpriteEffect: fade.until ends the effect early and spreads its frames over that part of life");
    this.ok(draw("gone", { x: 0, y: 0 }).r === false && draw("noSuchId", { x: 0, y: 0 }).r === false && draw("gone", { x: 0, y: 0 }).log.length === 0, "FxManifest: an unknown id or a sheet that is not in draws nothing and touches no canvas state");
    const p = new LST.EffectPlayer(m);
    this.ok(p.play("noSuchId", 0, 0) === null && p.play("shot", 3, 4) && p.list[0].life === 0.4, "EffectPlayer: plays any listed id by name (life = the sheet's one-shot length, 4 frames / 10 fps), refuses unknown ids");
    p.update(0.2); const c = this.ctx(); p.draw(c.ctx, false);
    const img = c.log.find((l) => l[0] === "drawImage");
    p.update(0.25);
    this.ok(img && img[2] === 20 && p.list.length === 0, "EffectPlayer: draws the frame for its age and drops it when its life ends");
    this.ok(JSON.stringify(m.triggers()) === "[]" && (m.setData({ effects: { x: { sheet: "s", on: "CRIT" } } }), JSON.stringify(m.triggers()) === '[["x","CRIT"]]'), "FxManifest: entries with \"on\" are event triggers");
  }

  checkServiceWorker(data) {
    const src = this.read("sw.js"), sb = { self: { addEventListener: () => {}, registration: {} }, caches: {}, console, URL, Request: class {}, fetch: () => {} };
    vm.createContext(sb);
    vm.runInContext(src + "\n;this.__mf = manifestFiles; this.__m = MANIFESTS; this.__p = PRECACHE;", sb);
    const fetchJson = async (u) => JSON.parse(this.read(u));
    return sb.__mf("assets/fx/fx.json", fetchJson).then((files) => {
      const want = new Set(["assets/fx/fx.json"]);
      for (const rel of Object.values(data.sheets)) { const j = "assets/fx/" + rel; want.add(j); want.add(path.dirname(j) + "/" + JSON.parse(this.read(j)).image); }
      this.ok(sb.__m.includes("assets/fx/fx.json") && files.length === want.size && files.every((f) => want.has(f) && this.exists(f)), `sw.js: the install step reads fx.json and precaches it, every sheet JSON and every PNG it names (${files.length} files, all present)`);
      this.ok(!sb.__p.some((u) => u.startsWith("assets/fx/")) && /precacheManifests\(cache\)/.test(src) && /const VERSION = "v30"/.test(src), "sw.js: v30; nothing in assets/fx is hand-listed in PRECACHE; install runs precacheManifests after PRECACHE");
    });
  }

  walk(dir) {
    const out = [];
    for (const e of fs.readdirSync(path.join(this.root, dir), { withFileTypes: true })) {
      const rel = dir + "/" + e.name;
      if (e.isDirectory()) out.push(...this.walk(rel)); else if (rel.endsWith(".js")) out.push(rel);
    }
    return out;
  }

  async run() {
    const LST = this.sandbox().LST;
    this.checkFiles();
    const data = this.checkManifest(LST);
    this.checkObjects(LST);
    await this.checkServiceWorker(data);
    console.log(this.fails ? `\n${this.fails} FAILED (${this.passes} passed)` : `\nALL PASS (${this.passes} passed)`);
    return this.fails ? 1 : 0;
  }
}

module.exports = FxTest;
if (require.main === module) new FxTest().run().then((c) => process.exit(c));
