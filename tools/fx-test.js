#!/usr/bin/env node
// FX manifest test (node, no browser): node tools/fx-test.js
// PR 10a: assets/fx/fx.json + FxManifest + SpriteEffect + EffectPlayer. PR 10b: particles, trails,
// the low-HP vignette, finale dim and screen flash are fx.json effects; presets, impacts and
// themes are fx.json data naming variants, never colours.
//   1. Files: one class per file, loaded by index.html in order, cached by sw.js.
//   2. fx.json: every effect the code asks for exists, every sheet it lists is a delivered art file
//      (JSON + PNG, sha256 = the delivery's), every impact has a ring / bloom and its settings,
//      every variant a particle, shot or glow can carry has its glow / mote / streak / trail entry,
//      no colour hex is left in presets / impacts / themes, and no test fixture is listed anywhere
//      the game loads.
//   3. SpriteEffect / FxManifest / EffectPlayer driven directly: loop and one-shot frames, fades,
//      level / progress values, grid rows, segment / stretch / fill fits, fixed frames, the caller's
//      blend, unknown ids, missing art.
//   4. sw.js: its manifest reader lists fx.json, every sheet JSON and every PNG, and nothing in
//      assets/fx is hand-listed in PRECACHE.
const fs = require("fs"), path = require("path"), vm = require("vm"), crypto = require("crypto");

class FxTest {
  constructor(root = path.join(__dirname, "..")) {
    this.root = root;
    this.passes = 0;
    this.fails = 0;
    this.FILES = ["src/fx/SpriteEffect.js", "src/fx/FxManifest.js", "src/fx/EffectPlayer.js"];
    this.ASKED = ["overdriveAura", "towerAura", "chainBolt", "chainArcFlash", "chainNodeGlow", "impactFlash", "textGlow.coin", "textGlow.crit", "lowHpVignette", "screenFlash", "finaleDim"];
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
    // Every PNG in assets/fx is listed in the delivery's PROVENANCE.json with the same sha256 (no unlisted art).
    const pngs = this.walkAll("assets/fx").filter((f) => f.endsWith(".png"));
    const unlisted = pngs.filter((f) => { const pv = prov[path.relative("assets/fx", f)]; return !pv || pv.sha256 !== crypto.createHash("sha256").update(fs.readFileSync(path.join(this.root, f))).digest("hex"); });
    this.ok(pngs.length && !unlisted.length, `art: every PNG in assets/fx (${pngs.length}) is in PROVENANCE.json with its sha256 (unlisted or changed: ${unlisted.join(", ") || "none"})`);
    const v2 = ["screen_burst/screen_burst.png", "glow/glow_pale.png", "glow/glow_yellow.png"];
    this.ok(v2.every((f) => prov[f] && prov[f].version === "v2") && data.effects.impactFlash.sheet === "screen_burst" && data.effects.screenFlash.sheet === "screen_burst" && data.effects["glow.pale"].sheet === "glow_pale" && data.effects["glow.yellow"].sheet === "glow_yellow",
      "art v2: screen_burst, glow_pale, glow_yellow are delivered v2 files; impactFlash and the X13 screenFlash play screen_burst (Decision 12); glow.pale / glow.yellow play glow_pale / glow_yellow");
    // v3 subtle redo (Brian, Nov 16 10:17 AM ET): these sheets must be the v3 files, and no superseded file ships.
    const v3 = ["chain_arc_flash", "chain_bolt", "overdrive_aura", ...["gold", "red", "blue", "green", "purple"].map((c) => "impact_ring_" + c), ...[0, 1, 2, 3, 4].map((t) => "tower_aura_t" + t)];
    const notV3 = v3.filter((id) => { const j = data.sheets[id], png = j && path.dirname(j) + "/" + JSON.parse(this.read("assets/fx/" + j)).image; return !png || !prov[png] || prov[png].version !== "v3"; });
    const superseded = pngs.filter((f) => { const pv = prov[path.relative("assets/fx", f)]; return pv && pv.version !== "v3" && Object.values(prov).some((q) => q && q.supersedes && String(q.supersedes.file || q.supersedes).startsWith(path.relative("assets/fx", f) + " ")); });
    this.ok(!notV3.length && !superseded.length, `art v3: ${v3.length} redone sheets play the v3 files (not v3: ${notV3.join(", ") || "none"}); no superseded file ships (${superseded.join(", ") || "none"})`);
    // PR 10b art (Game Art & Motion PR10b v1, section G rows 9-13): the delivered sheets at their
    // delivered sizes; a mote's frame is its variant's cell by the atlas's own names; streaks and
    // trails keep the head-at-right pivot; the vignettes and the dim fill the screen.
    const png = (f) => { const b = fs.readFileSync(path.join(this.root, "assets/fx", f)); return [b.readUInt32BE(16), b.readUInt32BE(20)]; };
    const B = { motes: ["motes", 256, 32, 8], vignette_red: ["vignette", 720, 1560, 1], vignette_dark: ["vignette", 720, 1560, 1] };
    const sheetsOf = (dir) => Object.keys(data.sheets).filter((id) => id.startsWith(dir + "_")).map((id) => id.slice(dir.length + 1));
    for (const v of sheetsOf("streak")) B["streak_" + v] = ["streak", 192, 16, 3]; for (const v of sheetsOf("trail")) B["trail_" + v] = ["trail", 128, 24, 1];
    // streak_lime v3 (Nov 23, painted from its own prompt with no reference) replaces v1 (too thin) and v2 (blocked:
    // a recolour of streak_pale); both hashes stay in its PROVENANCE entry's "supersedes" as history.
    const V10b = { streak_lime: "v3", vignette_red: "v2" };
    const lime = prov["streak/streak_lime.png"] || {}, sup = [].concat(lime.supersedes || []);
    const hist = { v1: "fb167b386a8188d5b3182b9bc4d0b6fb2cb84a0abd5b759dff221a94bed00acb", v2: "cfcc43bb90c814d685c6affa229e9282bed5b53a4cbe56a5d0402873541358c3" };
    this.ok(lime.version === "v3" && lime.sha256 === "da9e529bf0adadb192f34928d296249c1593943bbc0f18cc384f69b15d2731b2" && Object.entries(hist).every(([v, h]) => sup.some((q) => q.version === v && q.sha256 === h)),
      "art 10b: streak_lime ships v3 (da9e529b) and its PROVENANCE entry keeps v1 (fb167b38) and v2 (cfcc43bb) as history");
    // vignette_red v2 (Nov 23, a new painting from its own prompt) replaces v1, whose side middles were
    // nearly clear (0.01-0.02); v1's hash stays in its PROVENANCE entry's "supersedes" as history.
    const vig = prov["vignette/vignette_red.png"] || {}, vsup = [].concat(vig.supersedes || []);
    this.ok(vig.version === "v2" && vig.sha256 === "08b913350836434937d20ab521678a02d1b6293759f80fd1915125e99dde26c0" && vsup.some((q) => q.version === "v1" && q.sha256 === "92d2596fa5902101b2db76a0a22f77e77f3a7508d8e6b8ffb5f43e813b4a6b8e"),
      "art: vignette_red ships v2 (08b91335) and its PROVENANCE entry keeps v1 (92d2596f) as history");
    // The low-HP edge reaches the sides: mean alpha of a 24 px patch on the middle of the left and right
    // edges is at least 0.3 (v1: 0.017 / 0.010, so the edge sat only in the corners and top / bottom).
    const vf = path.join(this.root, "assets/fx/vignette/vignette_red.png"), vw = FxTest.pngSize(vf);
    const sideL = FxTest.patchAlpha(vf, 0, vw[1] >> 1), sideR = FxTest.patchAlpha(vf, vw[0] - 1, vw[1] >> 1);
    this.ok(sideL >= 0.3 && sideR >= 0.3, `art: vignette_red's side middles show the edge (24 px patch alpha left ${sideL.toFixed(3)}, right ${sideR.toFixed(3)} >= 0.3)`);
    // Every streak is its own painting, not another streak recoloured: for every pair of streak sheets the
    // alpha >= 50% masks (whole sheet) overlap with IoU < 0.9 (lime v2, a pale recolour, measured 0.983).
    // Two v1 pairs measure just over 0.9: separate paintings (each its own raw source, no reference image)
    // of the same short, fat teardrop prompt on a 16 px frame, alpha differing by 0.073 / 0.078 (lime v2 vs
    // pale: 0.017). They are listed with both files' sha256, so a changed file goes through the gate again.
    const SV = sheetsOf("streak"), sf = (v) => path.join(this.root, "assets/fx/streak/streak_" + v + ".png");
    const KNOWN = { "red/green": ["38dbd19a2f817a41b4c3f11467217dda3a9f1212dd3fb05c88794cd8a4219428", "49ac2d87473200d33f53a33d8fd4c158aa7d668b8760eea7c13e64382d8279ae", 0.909], "red/soot": ["38dbd19a2f817a41b4c3f11467217dda3a9f1212dd3fb05c88794cd8a4219428", "5191ea56d2c9b538df35eccf526e77d56b2374bffc023f764db5b34ea809b3a0", 0.904] }; // tracked debt: removal row docs/OO-MIGRATION.md#fu-streak-red-pins (repaint streak_red at the next streak art change, then delete both entries)
    const sha = (v) => crypto.createHash("sha256").update(fs.readFileSync(sf(v))).digest("hex"), pairs = [], over = [], known = [];
    for (let i = 0; i < SV.length; i++) for (let j = i + 1; j < SV.length; j++) {
      const k = SV[i] + "/" + SV[j], v = FxTest.maskIoU(sf(SV[i]), sf(SV[j])), K = KNOWN[k]; pairs.push(k);
      if (v < 0.9) continue;
      if (FxTest.pinMatches(K, sha(SV[i]), sha(SV[j]), v)) known.push(`${k} ${v.toFixed(3)}`); else over.push(`${k} ${v.toFixed(3)}`);
    }
    const onDisk = fs.readdirSync(path.join(this.root, "assets/fx/streak")).filter((f) => /^streak_.*\.png$/.test(f)).map((f) => f.slice(7, -4)).sort();
    this.ok(SV.length > 1 && String(onDisk) === String([...SV].sort()) && pairs.length === SV.length * (SV.length - 1) / 2 && !over.length, `art: every streak pair is two paintings, not a recolour (${SV.length} streak_* sheets in fx.json = the streak PNGs on disk; alpha >= 50% mask IoU < 0.9 for all ${pairs.length} pairs; at or over 0.9: ${over.join(", ") || "none"}; pinned v1 pairs: ${known.join(", ") || "none"})`);
    // The pins only hold for these exact files and scores: a changed sha256 or IoU no longer matches, so the gate fails again.
    const [ka, kb, kv] = KNOWN["red/green"], flip = (h) => (h[0] === "0" ? "1" : "0") + h.slice(1), pinCases = [[ka, kb, kv, true], [flip(ka), kb, kv, false], [ka, flip(kb), kv, false], [ka, kb, kv + 0.001, false], [ka, kb, 0.95, false]];
    const pinBad = pinCases.filter(([a, b, v, want]) => FxTest.pinMatches(KNOWN["red/green"], a, b, v) !== want).length;
    this.ok(!pinBad && !FxTest.pinMatches(undefined, ka, kb, kv), `art: a pinned streak pair stops matching when either sha256 or the IoU (3 decimals) changes (self-test, ${pinCases.length} cases + no pin; wrong: ${pinBad})`);
    const bad10b = Object.entries(B).filter(([id, [dir, w, h, n]]) => {
      const rel = data.sheets[id], j = rel && JSON.parse(this.read("assets/fx/" + rel)), f = j && dir + "/" + j.image, wh = f && png(f);
      return !j || rel !== dir + "/" + id + ".json" || !prov[f] || prov[f].version !== (V10b[id] || "v1") || j.version !== (V10b[id] || "v1") || wh[0] !== w || wh[1] !== h || j.count !== n || j.frameW * n !== w || j.frameH !== h
        || (dir === "streak" || dir === "trail") && !(j.pivot && j.pivot[0] === j.frameW && j.pivot[1] === j.frameH / 2);
    }).map(([id]) => id);
    const cells = JSON.parse(this.read("assets/fx/motes/motes.json")).cells || [];
    const moteBad = Object.entries(data.effects).filter(([k]) => k.startsWith("mote.")).filter(([k, e]) => e.sheet !== "motes" || e.frame !== cells.indexOf(k.slice(5)) || e.frame < 0).map(([k]) => k);
    const fills = ["lowHpVignette:vignette_red", "finaleDim:vignette_dark"].filter((x) => { const [k, sh] = x.split(":"); return data.effects[k].sheet !== sh || data.effects[k].fit !== "fill"; });
    this.ok(!bad10b.length && !moteBad.length && cells.length === 8 && !fills.length,
      `art 10b: ${Object.keys(B).length} delivered sheets (v1; streak_lime v3, vignette_red v2) at their delivered sizes with head-right pivots (bad: ${bad10b.join(", ") || "none"}); mote.<v> plays the motes cell named v (bad: ${moteBad.join(", ") || "none"}); lowHpVignette / finaleDim fill the screen with vignette_red / vignette_dark (bad: ${fills.join(", ") || "none"})`);
    // Venom bursts (main: pale lime #e4ffb8, lime #b4f06a, green #8be04a) play streak_lime twice and green once (Game Art streak_lime, Nov 16).
    const ven = data.impacts.elemVenom && data.impacts.elemVenom.colors;
    this.ok(String(ven) === "lime,lime,green" && data.effects["streak.lime"] && data.effects["streak.lime"].sheet === "streak_lime" && prov["streak/streak_lime.png"],
      `art 10b: the venom burst plays lime, lime, green (main's pale lime, lime, green) through streak.lime / streak_lime (got ${ven})`);
    // ParticleBatch's 3 fade steps pass p=(b+0.5)/3. Each sheet has fresh / mid / fade: none is dropped.
    const fm = new LST.FxManifest("assets/fx/fx.json"); fm.setData(data);
    for (const v of SV) {
      const id = "streak." + v, e = fm.effect(id), n = JSON.parse(this.read("assets/fx/" + data.sheets[data.effects[id].sheet])).count;
      const frames = [0, 1, 2].map((b) => e.frame({ count: n, loop: false }, {}, (b + 0.5) / 3));
      this.ok(n === 3 && frames.join() === "0,1,2", `streak frames: ${id} plays all 3 frames once (got ${frames})`);
    }
    const IMP = ["space", "burst", "colors", "radius", "bloomAlpha", "flash", "shake", "thump"];
    const imps = Object.entries(data.impacts), routes = Object.values(LST.FX_ROUTES).filter(Boolean);
    this.ok(imps.length >= 12 && imps.every(([, i]) => data.effects[i.ring] && data.effects[i.bloom] && IMP.every((k) => i[k] != null) && i.burst.count > 0) && routes.every((r) => data.impacts[r]),
      `fx.json: every impact (${imps.length}) names a ring and a bloom effect that exist and has its burst, colours, radius, bloom, flash, shake and thump; every FX_ROUTES route names one (${routes.length})`);
    // PR 10b: what a particle, shot or glow can carry is a variant name; each has its image entry.
    const P = data.presets, want = { streak: new Set(), mote: new Set(), glow: new Set(), trail: new Set() };
    for (const c of [...P.streakBurst.colors, ...imps.flatMap(([, i]) => i.colors)]) want.streak.add(c);
    for (const c of P.aura.colorsByTier.flat()) { want.mote.add(c); want.glow.add(c); }
    for (const c of [P.glow.critVariant, P.trail.glow, P.trail.critGlow, ...Object.values(P.trail.elementGlows)]) want.glow.add(c);
    const elemTrails = fs.readdirSync(path.join(this.root, "src/elements")).filter((f) => f.endsWith(".js")).map((f) => /\btrail: "(\w+)"/.exec(this.read("src/elements/" + f))).filter(Boolean).map((m) => m[1]);
    for (const t of [P.trail.variant, ...elemTrails, ...Object.keys(P.trail.elementGlows)]) want.trail.add(t);
    const missing = Object.entries(want).flatMap(([k, set]) => [...set].filter((v) => !data.effects[k + "." + v]).map((v) => k + "." + v));
    this.ok(elemTrails.length === 4 && !missing.length, `fx.json: every variant a particle, shot or glow can carry has its entry (${Object.entries(want).map(([k, v]) => v.size + " " + k).join(", ")}; element trails ${elemTrails.join(", ")}; missing: ${missing.join(", ") || "none"})`);
    const hex = /#[0-9a-f]{3,8}\b/i, hexIn = ["presets", "impacts", "themes"].filter((k) => hex.test(JSON.stringify(data[k])));
    this.ok(!hexIn.length && !("glowColors" in data) && !/#[0-9a-f]{6}/i.test(this.read("src/fx/FxPresets.js")) && !/LST\.(FX_PRESETS|FX_IMPACTS|FX_THEMES)\b/.test(this.walk("src").map((f) => this.read(f)).join("\n")),
      `fx.json: presets, impacts and themes name variants, never a colour hex (hex in: ${hexIn.join(", ") || "none"}); glowColors is gone; FX_PRESETS / FX_IMPACTS / FX_THEMES are gone from src/`);
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
    // PR 10b fits: stretch (height = size x base), fill (a rectangle), a fixed atlas frame, the caller's blend.
    m.setData({ sheets: m.data.sheets, effects: Object.assign({}, m.data.effects, { st: { sheet: "o", fit: "stretch", size: 1 }, fi: { sheet: "s", fit: "fill" }, at: { sheet: "s", frame: 3, blend: "screen" } }) });
    const st = draw("st", { x: 0, y: 0, x2: 40, y2: 0, base: 9, p: 0.5 }), fi = draw("fi", { x: 0, y: 0, w: 390, h: 844, t: 0.25 }), atl = draw("at", { x: 0, y: 0, t: 0.25, blend: "lighter" });
    this.ok(st.img[2] === 20 && st.img[8] === 40 && st.img[9] === 9 && st.img[7] === -4.5, `SpriteEffect: "stretch" fits the hop's length and sets the height to size x base (40 x 9 from a 10 x 20 frame)`);
    this.ok(fi.img[6] === 0 && fi.img[7] === 0 && fi.img[8] === 390 && fi.img[9] === 844, `SpriteEffect: "fill" stretches the frame over the caller's rectangle (the screen)`);
    this.ok(atl.img[2] === 30 && atl.log.some((l) => l[0] === "globalCompositeOperation=" && l[1] === "lighter") && draw("at", { x: 0, y: 0 }).log.some((l) => l[0] === "globalCompositeOperation=" && l[1] === "screen"), "SpriteEffect: \"frame\" draws a fixed atlas frame; the caller's blend (the FX theme) wins over the entry's");
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
      this.ok(!sb.__p.some((u) => u.startsWith("assets/fx/")) && /precacheManifests\(cache\)/.test(src) && /const VERSION = "v33"/.test(src), "sw.js: v33; nothing in assets/fx is hand-listed in PRECACHE; install runs precacheManifests after PRECACHE");
    });
  }

  walkAll(dir) {
    const out = [];
    for (const e of fs.readdirSync(path.join(this.root, dir), { withFileTypes: true })) {
      const rel = dir + "/" + e.name;
      if (e.isDirectory()) out.push(...this.walkAll(rel)); else out.push(rel);
    }
    return out;
  }

  walk(dir) {
    const out = [];
    for (const e of fs.readdirSync(path.join(this.root, dir), { withFileTypes: true })) {
      const rel = dir + "/" + e.name;
      if (e.isDirectory()) out.push(...this.walk(rel)); else if (rel.endsWith(".js")) out.push(rel);
    }
    return out;
  }

  // Every element's shot trail (src/elements/*.js `trail: "x"`) has presets.trail.elementGlows[x]
  // naming an existing glow effect, and a trail.x effect. A missing entry would otherwise draw the
  // id "glow.undefined" (nothing) without any error.
  checkElementGlows(data) {
    const dir = path.join(this.root, "src/elements"), T = (data.presets && data.presets.trail) || {}, G = T.elementGlows || {};
    const trails = [...new Set(fs.readdirSync(dir).filter((f) => f.endsWith(".js")).flatMap((f) => [...this.read("src/elements/" + f).matchAll(/\btrail:\s*"(\w+)"/g)].map((m) => m[1])))].sort();
    this.ok(trails.length >= 4, `elements: found the element shot trails (${trails.join(", ")})`);
    for (const t of trails) {
      this.ok(typeof G[t] === "string" && !!data.effects["glow." + G[t]], `elements: trail "${t}" has presets.trail.elementGlows.${t} naming a glow effect (${G[t] === undefined ? "missing: would draw glow.undefined" : "glow." + G[t]})`);
      this.ok(!!data.effects["trail." + t], `elements: trail "${t}" has a trail.${t} effect`);
    }
  }

  async run() {
    const LST = this.sandbox().LST;
    this.checkFiles();
    const data = this.checkManifest(LST);
    this.checkElementGlows(data);
    this.checkObjects(LST);
    await this.checkServiceWorker(data);
    console.log(this.fails ? `\n${this.fails} FAILED (${this.passes} passed)` : `\nALL PASS (${this.passes} passed)`);
    return this.fails ? 1 : 0;
  }
}

// IoU of two same-size PNGs' alpha >= 50% masks (whole sheet).
// A known streak pair is exempt only while both files' sha256 and the IoU (to 3 decimals) equal its pin.
FxTest.pinMatches = (K, shaA, shaB, v) => !!K && shaA === K[0] && shaB === K[1] && v.toFixed(3) === K[2].toFixed(3);
FxTest.maskIoU = (a, b) => {
  const P = require("./fx-art-scan.js").png, A = P(fs.readFileSync(a)), B = P(fs.readFileSync(b));
  if (A.w !== B.w || A.h !== B.h) return 0;
  let both = 0, any = 0;
  for (let i = 3; i < A.px.length; i += 4) { const x = A.px[i] >= 128, y = B.px[i] >= 128; if (x && y) both++; if (x || y) any++; }
  return any ? both / any : 0;
};

// [w, h] of a PNG.
FxTest.pngSize = (f) => { const b = fs.readFileSync(f); return [b.readUInt32BE(16), b.readUInt32BE(20)]; };

// Mean alpha (0..1) of the pixels within r px of (cx, cy), clipped to the image.
FxTest.patchAlpha = (f, cx, cy, r = 24) => {
  const A = require("./fx-art-scan.js").png(fs.readFileSync(f));
  let s = 0, n = 0;
  for (let y = Math.max(0, cy - r); y <= Math.min(A.h - 1, cy + r); y++) for (let x = Math.max(0, cx - r); x <= Math.min(A.w - 1, cx + r); x++) {
    if ((x - cx) * (x - cx) + (y - cy) * (y - cy) <= r * r) { s += A.px[(y * A.w + x) * 4 + 3]; n++; }
  }
  return n ? s / n / 255 : 0;
};

module.exports = FxTest;
if (require.main === module) new FxTest().run().then((c) => process.exit(c));
