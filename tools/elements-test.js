#!/usr/bin/env node
// Elemental cards test (node, no browser): node tools/elements-test.js
//   1. No dead cards: every element does damage (or, for Frostbite, freezes) against every
//      enemy type and both bosses (basic, fast, tank, boss, mole).
//   2. Boss freeze cooldown: a boss freezes at most bossFreeze seconds, then not again for
//      bossCooldown seconds, however fast it's hit.
//   3. Shatter only applies when both Ember Rounds and Frostbite are owned.
// Byte-identity of runs without elements is checked by tools/sim-ab.sh (seeded A/B vs main).
const fs = require("fs"), path = require("path"), vm = require("vm");
const ROOT = path.join(__dirname, "..");
const FILES = JSON.parse(fs.readFileSync(path.join(__dirname, "sim.js"), "utf8").match(/const FILES = (\[[^\]]*\])/)[1]);

function mulberry32(a) { return () => { a |= 0; a = (a + 0x6d2b79f5) | 0; let t = Math.imul(a ^ (a >>> 15), 1 | a); t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t; return ((t ^ (t >>> 14)) >>> 0) / 4294967296; }; }
function load(seed = 1) {
  const M = Object.create(Math); M.random = mulberry32(seed);
  const store = {};
  const sb = { Math: M, console, localStorage: { getItem: (k) => (k in store ? store[k] : null), setItem: (k, v) => { store[k] = String(v); } } };
  sb.window = sb; vm.createContext(sb);
  for (const f of FILES) vm.runInContext(fs.readFileSync(path.join(ROOT, "src", f), "utf8"), sb, { filename: f });
  const LST = sb.LST;
  LST.UI = class { show() {} updateHud() {} renderShop() {} };
  LST.audio = { play() {}, startMusic() {}, stopMusic() {}, duckMusic() {}, setTension() {} };
  LST.haptics = { buzz() {} };
  const game = new LST.Game({ halfW: 310, halfH: 650 });
  game.reset();
  return { LST, game };
}
const MULT = { hp: 1, speed: 1, damage: 1, coins: 1 };
function makeEnemy(LST, type, x, y) {
  const e = type === "mole" ? new LST.KingMole(MULT) : new LST.Enemy(type, x, y, MULT);
  if (type === "mole") { e.mode = "up"; e.untargetable = false; e.timer = 1e9; e.x = x; e.y = y; }
  e.maxHp = e.hp = 1e9; // never dies during the test
  return e;
}
function shot(LST, game, target, elements, damage = 10) {
  const p = new LST.Projectile(0, 0, target, damage, 500, false);
  p.elements = elements;
  game.tower.elements = elements;
  p.strike(target, game);
}

let fails = 0;
const ok = (cond, msg) => { console.log((cond ? "PASS " : "FAIL ") + msg); if (!cond) fails++; };
const TYPES = ["basic", "fast", "tank", "boss", "mole"];
const ELEMENTS = ["ember", "frostbite", "chainSpark", "venom"];

// 1. No dead cards
for (const id of ELEMENTS) {
  for (const type of TYPES) {
    const { LST, game } = load(7);
    const e = makeEnemy(LST, type, 0, -200), n = makeEnemy(LST, type, 40, -200);
    game.enemies.push(e, n);
    const hp0 = e.hp + n.hp;
    let froze = 0;
    for (let i = 0; i < 120; i++) {
      shot(LST, game, e, { [id]: 1 });
      if (e.stun > 0) froze++;
      for (let k = 0; k < 6; k++) LST.StatusEffects.tickAll(game, 1 / 60);
      e.stun = 0; // let it thaw between hits (the enemy's own update would)
    }
    const dealt = (game.elementDamage || {})[id] || 0;
    const effect = id === "frostbite" ? ((game.elementFreezes || {})[type] || 0) : dealt;
    ok(effect > 0, `${id} vs ${type}: ${id === "frostbite" ? effect + " freezes" : dealt.toFixed(1) + " element damage"}`);
  }
}

// 2. Boss freeze cooldown
for (const type of ["boss", "mole", "tank"]) {
  const { LST, game } = load(3);
  const fb = LST.ElementRegistry.byId("frostbite");
  const e = makeEnemy(LST, type, 0, -200); game.enemies.push(e);
  const freezes = []; let t = 0, maxStun = 0;
  for (let i = 0; i < 600; i++) { // 10 s of hits at 60/s
    const before = (game.elementFreezes || {})[type] || 0;
    shot(LST, game, e, { frostbite: 1 });
    if (((game.elementFreezes || {})[type] || 0) > before) { freezes.push(t); maxStun = Math.max(maxStun, e.stun); }
    LST.StatusEffects.tickAll(game, 1 / 60); e.stun = Math.max(0, e.stun - 1 / 60); t += 1 / 60;
  }
  const gaps = freezes.slice(1).map((x, i) => x - freezes[i]);
  if (type === "tank") ok(freezes.length > 20 && maxStun > 0.5, `tank (not a boss) freezes often: ${freezes.length} in 10s, ${maxStun.toFixed(2)}s each`);
  else ok(freezes.length >= 2 && freezes.length <= 3 && gaps.every((g) => g >= fb.stats.bossCooldown - 1e-6) && maxStun <= fb.stats.bossFreeze + 1e-9,
    `${type} freeze cooldown: ${freezes.length} freezes in 10s, gaps ${gaps.map((g) => g.toFixed(2)).join(",")}s, max ${maxStun.toFixed(2)}s`);
}

// 3. Shatter only with both
for (const [label, els, want] of [["Ember + Frostbite", { ember: 1, frostbite: 1 }, true], ["Ember only", { ember: 1 }, false],
  ["Frostbite only", { frostbite: 1 }, false], ["Ember + Venom + Spark", { ember: 1, venom: 1, chainSpark: 1 }, false]]) {
  const { LST, game } = load(5);
  const e = makeEnemy(LST, "tank", 0, -200); game.enemies.push(e);
  // Force both conditions so only ownership decides.
  LST.StatusEffects.add(e, new LST.Frozen(100), game);
  LST.StatusEffects.add(e, new LST.Burn(100, 1), game);
  const hp0 = e.hp;
  shot(LST, game, e, els, 10);
  const hits = (game.pairHits || {}).shatter || 0;
  const direct = hp0 - e.hp;
  ok(want ? hits === 1 && Math.abs(direct - 10 * (1 + LST.ElementRegistry.pairs.find((p) => p.id === "shatter").bonus)) < 1e-6 : hits === 0 && Math.abs(direct - 10) < 1e-6,
    `Shatter with ${label}: ${hits ? "on" : "off"}, hit dealt ${direct.toFixed(2)} (base 10)`);
}
{ // not frozen -> no bonus even with both
  const { LST, game } = load(5);
  const e = makeEnemy(LST, "tank", 0, -200); game.enemies.push(e);
  LST.StatusEffects.add(e, new LST.Burn(100, 1), game);
  const hp0 = e.hp; shot(LST, game, e, { ember: 1, frostbite: 1 }, 10);
  ok(!((game.pairHits || {}).shatter) && Math.abs(hp0 - e.hp - 10) < 1e-6, "Shatter needs the enemy frozen AND burning (burning only: no bonus)");
}

// Every element card has a Workshop cost, a "How it works" back, and stays out of the starter deck.
{
  const { LST } = load(1);
  for (const id of ELEMENTS) {
    const c = LST.CARDS.find((x) => x.id === id);
    ok(c && c.unlockCost > 0 && c.details({ elements: null }).length > 40 && !LST.meta.isUnlocked(id), `${id} card: Workshop-locked (${c.unlockCost} Gears), has details`);
  }
}

// Card text is built from the stats: the front desc and the back text carry the stats' numbers,
// the front has no other numbers, and a retune (changed stats) changes the text with it.
{
  const pct = (x) => `${Math.round(x * 100)}%`, sec = (x) => `${x.toFixed(2).replace(/0$/, "")}s`;
  const R = (LST) => LST.ElementRegistry;
  const expect = {
    ember: (S, L) => ({ front: [`${S.time}s`], back: [`${S.time}s`, pct(S.dpsShare[0]), pct(S.bossShare)] }),
    frostbite: (S, L) => ({ front: [L.ordinal(S.every)], back: [L.ordinal(S.every), sec(S.freeze[0]), `${S.bossFreeze}s`, `${S.bossCooldown}s`] }),
    chainSpark: (S, L) => ({ front: [pct(S.chance), `${S.jumps[0]} more`], back: [pct(S.chance), `${S.jumps[0]} nearest`, `${S.radius}`, pct(S.share)] }),
    venom: (S, L) => ({ front: [`${S.maxStacks}`], back: [`${S.maxStacks}`, pct(S.stackShare[0]), `${S.time}s`, pct(S.stackShare[0] * S.maxStacks)] }),
  };
  const nums = (t) => (t.match(/\d+(\.\d+)?/g) || []);
  const check = (LST, tag) => {
    for (const id of ELEMENTS) {
      const el = R(LST).byId(id), c = LST.CARDS.find((x) => x.id === id), want = expect[id](el.stats, LST);
      const front = c.desc, back = c.details({ elements: null });
      const miss = [...want.front.filter((w) => !front.includes(w)), ...want.back.filter((w) => !back.includes(w))];
      const allowed = want.front.join(" ");
      const stray = nums(front).filter((n) => !nums(allowed).includes(n));
      ok(!miss.length && !stray.length, `${tag} ${id} card text matches stats (front "${front}")${miss.length ? " missing " + miss : ""}${stray.length ? " stray " + stray : ""}`);
    }
    const sh = R(LST).pairs.find((p) => p.id === "shatter");
    for (const id of sh.needs) {
      const back = LST.CARDS.find((x) => x.id === id).details({ elements: null });
      ok(back.includes(`+${pct(sh.bonus)}`) && sh.desc().includes(`+${pct(sh.bonus)}`), `${tag} Shatter text on ${id} back shows +${pct(sh.bonus)}`);
    }
  };
  const { LST } = load(1);
  check(LST, "current:");
  // Retune every number and check the text follows (guards against hard-coded copy).
  const st = (id) => R(LST).byId(id).stats;
  Object.assign(st("ember"), { time: 5, dpsShare: [0.61, 0.2], bossShare: 0.27 });
  Object.assign(st("frostbite"), { every: 2, freeze: [0.45, 0.1], bossFreeze: 0.3, bossCooldown: 6 });
  Object.assign(st("chainSpark"), { chance: 0.17, jumps: [3, 1], share: 0.55, radius: 144 });
  Object.assign(st("venom"), { time: 6, stackShare: [0.21, 0.1], maxStacks: 7 });
  R(LST).pairs.find((p) => p.id === "shatter").bonus = 0.42;
  check(LST, "retuned:");
  ok(["1st", "2nd", "3rd", "4th", "11th", "12th", "13th", "21st", "22nd", "23rd"].join() === [1, 2, 3, 4, 11, 12, 13, 21, 22, 23].map(LST.ordinal).join(), "ordinal helper: 1st 2nd 3rd 4th 11th 12th 13th 21st 22nd 23rd");
}

// ---------- Status looks (src/elements/looks): one image-art object per status, attached only while active ----------
{
  const { LST } = load(1);
  const sb = { LST, Math, console };
  vm.createContext(sb);
  const LOOK_FILES = ["StatusLook", "LookRegistry", "LookLayer", "BurnFlames", "IceCrust", "VenomDrips", "SparkCrackle", "ChillFrost"];
  vm.runInContext(fs.readFileSync(path.join(ROOT, "src/sprites/SheetAnimation.js"), "utf8"), sb, { filename: "SheetAnimation.js" });
  vm.runInContext(fs.readFileSync(path.join(ROOT, "src/sprites/LookSheetLibrary.js"), "utf8"), sb, { filename: "LookSheetLibrary.js" });
  for (const f of LOOK_FILES) vm.runInContext(fs.readFileSync(path.join(ROOT, "src/elements/looks", f + ".js"), "utf8"), sb, { filename: f });
  // ctx that records every drawImage (and would record any path call)
  const calls = { draws: [], paths: 0 };
  const PATH = ["beginPath", "arc", "lineTo", "moveTo", "bezierCurveTo", "quadraticCurveTo", "fill", "stroke", "rect", "ellipse", "fillRect"];
  const ctx = new Proxy({}, { get: (t, k) => (k in t ? t[k] : k === "drawImage" ? (...a) => calls.draws.push(a) : PATH.includes(k) ? () => calls.paths++ : () => {}), set: (t, k, v) => { t[k] = v; return true; } });
  const subs = {}; const bus = { on: (t, fn) => { subs[t] = fn; return () => {}; } };
  const sheetJson = {}, img = {};
  for (const [name, url] of Object.entries(LST.LOOK_SHEETS)) {
    ok(fs.existsSync(path.join(ROOT, url)), "looks: sheet json exists " + url);
    sheetJson[name] = JSON.parse(fs.readFileSync(path.join(ROOT, url), "utf8"));
    for (const s of Object.values(sheetJson[name].strips)) ok(fs.existsSync(path.join(ROOT, path.dirname(url), s.image)), "looks: sheet image exists " + s.image);
    img[name] = {}; for (const id of Object.keys(sheetJson[name].strips)) img[name][id] = { id: name + ":" + id };
  }
  const swSrc = fs.readFileSync(path.join(ROOT, "sw.js"), "utf8"), html = fs.readFileSync(path.join(ROOT, "index.html"), "utf8");
  ok(Object.values(LST.LOOK_SHEETS).every((u) => swSrc.includes('"' + u + '"') && Object.values(JSON.parse(fs.readFileSync(path.join(ROOT, u), "utf8")).strips).every((s) => swSrc.includes('"' + path.dirname(u) + "/" + s.image + '"'))), "looks: sw.js precaches every look json + png");
  ok(["src/sprites/SheetAnimation.js", "src/sprites/LookSheetLibrary.js", ...LOOK_FILES.map((f) => "src/elements/looks/" + f + ".js")].every((f) => html.includes('src="' + f + '"') && swSrc.includes('"' + f + '"')), "looks: index.html + sw.js list every look script");
  // No code-drawn art: the look classes (and their base / player) never call canvas path or shape APIs.
  const BANNED = /\.\s*(beginPath|arc|arcTo|lineTo|moveTo|bezierCurveTo|quadraticCurveTo|closePath|ellipse|fillRect|strokeRect|roundRect|stroke|fill|createLinearGradient|createRadialGradient|putImageData)\s*\(|\.\s*(fillStyle|strokeStyle|globalAlpha|globalCompositeOperation|filter|lineWidth)\s*=(?!=)|LST\.draw\b|LookKit|LOOK_VARIANTS/;
  for (const f of [...LOOK_FILES.map((n) => "src/elements/looks/" + n + ".js"), "src/sprites/SheetAnimation.js", "src/sprites/LookSheetLibrary.js"]) {
    const code = fs.readFileSync(path.join(ROOT, f), "utf8").split("\n").filter((l) => !/^\s*\/\//.test(l)).join("\n");
    const m = code.match(BANNED); ok(!m, "looks: no canvas path / shape / tint calls in " + f + (m ? " (found " + m[0] + ")" : ""));
  }
  // The looks alone carry the status visuals: the old code-drawn frozen disc / venom pips
  // (FxRenderer.drawStatusRings, called from FxDirector.drawWorld) must never come back.
  const RING_BANNED = /drawStatusRings|StatusRings|\.get\(\s*e\s*,\s*"(frozen|venom|burn)"\s*\)|status\.(frozen|venom)\b/;
  const jsUnder = (d) => fs.readdirSync(path.join(ROOT, d), { withFileTypes: true }).flatMap((x) => x.isDirectory() ? jsUnder(d + "/" + x.name) : x.name.endsWith(".js") ? [d + "/" + x.name] : []);
  const codeOf = (f) => fs.readFileSync(path.join(ROOT, f), "utf8").split("\n").filter((l) => !/^\s*\/\//.test(l)).join("\n");
  for (const f of [...jsUnder("src/fx"), ...jsUnder("src/themes"), ...jsUnder("src/sprites")]) {
    const m = codeOf(f).match(RING_BANNED); ok(!m, "looks: no code-drawn status rings / pips in " + f + (m ? " (found " + m[0] + ")" : ""));
  }
  // src/sprites draws image frames only. SpriteTinter is the one exception, still used for the hit
  // flash and Big Red's charge flicker until HitFlash / ChargeGlow replace it (docs/OO-MIGRATION.md PR 1).
  for (const f of jsUnder("src/sprites").filter((f) => !f.endsWith("/SpriteTinter.js"))) {
    const m = codeOf(f).match(BANNED); ok(!m, "sprites: no canvas path / shape / tint calls in " + f + (m ? " (found " + m[0] + ")" : ""));
  }
  // Slowed enemies get the ChillFrost look, never a tint: no theme or sprite code reads slowTimer to
  // recolor, and the TINT table has no frost entry. (The cartoon theme's other vector art is planned
  // for later PRs in docs/OO-MIGRATION.md; this scan only guards the slow/frozen tint.)
  const FROST_TINT_BANNED = /TINT\.frozen|\bslowTimer\b|#bfefff|\bfrozen\s*:\s*\[/i;
  for (const f of [...jsUnder("src/themes"), ...jsUnder("src/sprites")]) {
    const m = codeOf(f).match(FROST_TINT_BANNED); ok(!m, "looks: no slow / frozen tint in " + f + (m ? " (found " + m[0] + ")" : ""));
  }
  ok(!LST.LOOK_VARIANTS && !LST.LOOK_STYLE && !LST.setLookVariant && !LST.LookKit, "looks: code-drawn variant presets are gone");

  const L = new LST.LookLayer(bus), R = LST.LookRegistry;
  ok(R.get("burn") === LST.BurnFlames && R.get("frozen") === LST.IceCrust && R.get("venom") === LST.VenomDrips && R.get("spark") === LST.SparkCrackle, "looks: registry maps burn/frozen/venom/spark to their classes");
  ok([LST.BurnFlames, LST.IceCrust, LST.VenomDrips, LST.SparkCrackle].every((C) => C.prototype instanceof LST.StatusLook && LST.LOOK_SHEETS[C.sheet]), "looks: each look is its own StatusLook subclass with its own sheet");
  const mk = (type, x, radius = 20) => ({ type, x, y: 0, radius, age: 1 });
  const a = mk("tank", 0), b = mk("basic", 100), scene = { enemies: [a, b], hasStatus: false };
  let t = 0; const frame = (dt = 0.1, reduced = false) => { t += dt; calls.draws = []; L.render(ctx, scene, t, reduced); return calls.draws.length; };

  // Before any image is in: looks attach but draw nothing (no coded fallback)
  LST.StatusEffects.add(a, new LST.Burn(1, 1)); scene.hasStatus = true;
  ok(frame() === 0 && L.looksOf(a).get("burn") instanceof LST.BurnFlames && calls.paths === 0, "looks: attached before the sheet loads but draws nothing (no fallback)");
  const half = LST.lookSheets.install("BurnFlames", sheetJson.BurnFlames, {});
  ok(!LST.lookSheets.get("BurnFlames") && !half.strips.main.draw(ctx, 0, 0, 0, 27), "looks: a sheet without its image is not handed out and draws nothing");
  for (const n of Object.keys(sheetJson)) LST.lookSheets.install(n, sheetJson[n], img[n]);
  L.remove(a, "burn"); a.status.burn.time = 0; frame();
  ok(L.count === 0 && frame() === 0, "looks: nothing attached or drawn with no status");

  LST.StatusEffects.add(a, new LST.Burn(1, 1));
  ok(frame() === 1 && calls.draws[0][0] === img.BurnFlames.main && L.looksOf(a).get("burn") instanceof LST.BurnFlames && !L.looksOf(b), "looks: BurnFlames attaches to the burning enemy only and draws its sheet");
  // anchor + scale: frame w * bodyR/88, anchor pixel on (e.x, e.y)
  { const d = calls.draws[0], k = LST.StatusLook.bodyR(a) / 88, J = sheetJson.BurnFlames;
    ok(Math.abs(d[5] - (a.x - J.anchor.x * k)) < 1e-9 && Math.abs(d[6] - (a.y - J.anchor.y * k)) < 1e-9 && Math.abs(d[7] - 288 * k) < 1e-9 && Math.abs(d[8] - 352 * k) < 1e-9 && d[3] === 288 && d[4] === 352,
      "looks: scale = bodyR/88 and the anchor (144,248) sits on (e.x, e.y)"); }
  { const big = mk("tank", 300, 40); const d1 = LST.SheetAnimation.prototype.rect.call(LST.lookSheets.get("BurnFlames").strips.main, 300, 0, LST.StatusLook.bodyR(big));
    ok(Math.abs(d1[2] - 288 * 54 / 88) < 1e-9 && Math.abs(d1[0] - (300 - 144 * 54 / 88)) < 1e-9, "looks: twice the radius draws twice the size, anchor still on the body"); }
  // frame stepping by fps: burn 10 fps x6 loop, venom 8 fps x4 loop
  { const B = LST.lookSheets.get("BurnFlames").strips.main, V = LST.lookSheets.get("VenomDrips").strips.main;
    ok([0, 0.099, 0.1, 0.35, 0.59, 0.6, 0.71].map((s) => B.index(s)).join() === "0,0,1,3,5,0,1", "looks: BurnFlames steps at 10 fps and loops after 6 frames");
    ok([0, 0.124, 0.125, 0.3, 0.5, 0.625].map((s) => V.index(s)).join() === "0,0,1,2,0,1", "looks: VenomDrips steps at 8 fps and loops after 4 frames");
    const lk = L.looksOf(a).get("burn"); lk.t = 0.35; calls.draws = []; L.draw(ctx, false); ok(calls.draws[0][1] === 3 * 288, "looks: the drawn source rect follows the frame index"); }

  LST.StatusEffects.add(b, new LST.Frozen(1)); LST.StatusEffects.add(b, new LST.Poison(1, 1, 3)); frame(0);
  ok(L.looksOf(b).get("frozen") instanceof LST.IceCrust && L.looksOf(b).get("venom") instanceof LST.VenomDrips && L.count === 3, "looks: IceCrust + VenomDrips attach to the frozen, poisoned enemy");
  // ice: snap strip (3 frames @30 fps, once) then straight to the static frame
  { const ice = L.looksOf(b).get("frozen"), S = LST.lookSheets.get("IceCrust").strips, seen = [];
    for (const s of [0, 0.034, 0.067, 0.099, 0.1, 0.5, 5]) { ice.t = s; const p = ice.pick(S, false); seen.push(p[0] + p[1]); }
    ok(seen.join() === "snap0,snap1,snap2,snap2,main0,main0,main0", "looks: IceCrust plays its 3-frame snap at 30 fps once, then holds the static frame");
    ice.t = 0; ok(ice.pick(S, true).join() === "main,0", "looks: IceCrust reduced motion = static frame, no snap");
    ice.t = 0; calls.draws = []; ice.draw(ctx, b, false); ok(calls.draws[0][0] === img.IceCrust.snap, "looks: IceCrust draws the snap image on attach");
    ice.t = 1; calls.draws = []; ice.draw(ctx, b, false); ok(calls.draws[0][0] === img.IceCrust.main, "looks: IceCrust draws the static image after the snap"); }
  ok(frame(0) === 3, "looks: one image per active look per frame");
  a.status.burn.time = 0; frame(); ok(!L.looksOf(a) && L.count === 2, "looks: BurnFlames detached the frame the burn ended");
  b.status.frozen.time = 0; frame(); ok(L.looksOf(b) && !L.looksOf(b).has("frozen") && L.looksOf(b).has("venom"), "looks: IceCrust detached on thaw, VenomDrips stays while poisoned");
  b.dead = true; frame(); ok(L.count === 0 && frame() === 0, "looks: a dead enemy's looks are removed, nothing drawn after");

  const c = mk("basic", 50); scene.enemies.push(c);
  subs[LST.EVENTS.ELEMENT_HIT]({ element: "chainSpark", x: 0, y: 0, points: [[0, 0], [50, 0]] });
  ok(L.looksOf(c) && L.looksOf(c).get("spark") instanceof LST.SparkCrackle, "looks: SparkCrackle on an enemy hit by a Chain Spark");
  const n0 = L.count; subs[LST.EVENTS.ELEMENT_HIT]({ element: "ember", x: 50, y: 0 }); ok(L.count === n0, "looks: other element hits add no event look");
  { const sp = L.looksOf(c).get("spark"), S = LST.lookSheets.get("SparkCrackle").strips;
    ok([0, 0.06, 0.12, 0.2].map((s) => { sp.t = s; return sp.pick(S, false)[1]; }).join() === "0,1,2,3" && (sp.t = 0.22, sp.pick(S, false) === null), "looks: SparkCrackle plays 4 frames once over 0.22 s, then nothing");
    sp.t = 0.05; ok(sp.pick(S, true).join() === "main,1", "looks: SparkCrackle reduced motion = the peak frame"); sp.t = 0; }
  ok(L.looksOf(a) && L.looksOf(a).has("spark") && frame(0.1) === 2 && calls.draws.every((d) => d[0] === img.SparkCrackle.main), "looks: SparkCrackle draws on both hit enemies during its life");
  frame(0.2); ok(L.count === 0 && frame() === 0, "looks: SparkCrackle removed after its 0.22 s life");
  subs[LST.EVENTS.ELEMENT_HIT]({ element: "chainSpark", x: 50, y: 0 }); frame(0, true);
  ok(calls.draws.length === 1 && calls.draws[0][1] === 288, "looks: reduced motion spark draws the single peak frame");
  frame(0.3, true); ok(L.count === 0, "looks: reduced motion spark gone after its life");
  LST.StatusEffects.add(c, new LST.Burn(9, 1)); LST.StatusEffects.add(c, new LST.Poison(9, 1, 3)); frame();
  ok(frame(0.25, true) === 2 && calls.draws.every((d) => d[1] === 0), "looks: reduced motion holds frame 0 (burn, venom)");
  subs[LST.EVENTS.RUN_START]({}); ok(L.count === 0, "looks: run start clears every look");

  // ChillFrost: slowed enemies (Enemy.slowTimer: Frost Shots, Frostbite chill, Freeze ability), hidden
  // while frozen (IceCrust owns that), and nothing drawn until its sheet is in.
  ok(R.get("chill") === LST.ChillFrost && LST.ChillFrost.prototype instanceof LST.StatusLook && LST.ChillFrost.sheet === "ChillFrost", "chill: ChillFrost is its own StatusLook subclass, registered as \"chill\"");
  { const real = new LST.Enemy("basic", 0, 0, MULT); ok(!LST.ChillFrost.isActive(real), "chill: an unslowed enemy has no ChillFrost");
    real.applySlow(0.15, 1.2); ok(LST.ChillFrost.isActive(real), "chill: Enemy.applySlow (Frost Shots / chill / Freeze) turns ChillFrost on");
    LST.StatusEffects.add(real, new LST.Frozen(1)); ok(!LST.ChillFrost.isActive(real), "chill: hidden while the enemy is frozen"); }
  const s1 = mk("basic", 200), s2 = mk("tank", 260); scene.enemies = [s1, s2]; scene.hasStatus = false;
  delete LST.lookSheets.sheets.ChillFrost;
  s1.slowTimer = 1.2; frame();
  ok(L.looksOf(s1) && L.looksOf(s1).get("chill") instanceof LST.ChillFrost && !L.looksOf(s2), "chill: attaches to the slowed enemy only, with no StatusEffect on it (hasStatus false)");
  ok(calls.draws.length === 0 && !LST.lookSheets.get("ChillFrost"), "chill: asset missing -> nothing drawn (no fallback, no tint)");
  const CF = sheetJson.ChillFrost || { strips: { attach: { image: "t_attach.png", frame: { w: 288, h: 288 }, count: 2, fps: 12, loop: false }, still: { image: "t_still.png", frame: { w: 288, h: 288 }, count: 1, fps: 0, loop: false }, loop: { image: "t.png", frame: { w: 288, h: 288 }, count: 4, fps: 8, loop: true } }, anchor: { x: 144, y: 144 }, refBodyR: 88 };
  const cfImg = img.ChillFrost || Object.fromEntries(Object.keys(CF.strips).map((id) => [id, { id: "ChillFrost:" + id }]));
  LST.lookSheets.install("ChillFrost", CF, cfImg);
  { const cf = L.looksOf(s1).get("chill"), S = LST.lookSheets.get("ChillFrost").strips; cf.t = 0;
    ok(frame(0) === 1 && calls.draws[0][0] === cfImg.attach, "chill: draws one ChillFrost image (attach) once the sheet is in");
    { const A = S.attach, Lp = S.loop, seen = [];
      for (let i = 0; i < A.count; i++) { cf.t = (i + 0.5) / A.fps; seen.push(cf.pick(S, false).join()); }
      ok(seen.join("|") === [...Array(A.count).keys()].map((i) => "attach," + i).join("|"), "chill: plays the attach one-shot frame by frame first");
      const lf = []; for (let i = 0; i < Lp.count + 1; i++) { cf.t = A.duration + (i + 0.5) / Lp.fps; lf.push(cf.pick(S, false).join()); }
      ok(lf.join("|") === [...Array(Lp.count).keys(), 0].map((i) => "loop," + i).join("|"), "chill: then the loop from frame 0 at its fps, wrapping"); }
    cf.t = 0; ok(cf.pick(S, true).join() === (S.still ? "still,0" : "loop,0"), "chill: reduced motion = the still frame, no attach");
    const d = calls.draws[0], k = LST.StatusLook.bodyR(s1) / (CF.refBodyR || 88);
    ok(Math.abs(d[5] - (s1.x - CF.anchor.x * k)) < 1e-9 && Math.abs(d[6] - (s1.y - CF.anchor.y * k)) < 1e-9, "chill: anchor on the body centre, scaled bodyR / refBodyR"); }
  LST.StatusEffects.add(s1, new LST.Frozen(1)); scene.hasStatus = true; frame(0);
  ok(L.looksOf(s1).has("frozen") && !L.looksOf(s1).has("chill") && calls.draws.length === 1 && calls.draws[0][0] !== undefined && !Object.values(cfImg).includes(calls.draws[0][0]), "chill: frozen -> IceCrust only, ChillFrost hidden");
  s1.status.frozen.time = 0; frame(); ok(L.looksOf(s1).has("chill") && !L.looksOf(s1).has("frozen"), "chill: back on after the thaw while still slowed");
  s1.slowTimer = 0; frame(); ok(!L.looksOf(s1) && L.count === 0 && frame() === 0, "chill: removed the frame the slow ends");
  s2.slowTimer = 4; subs[LST.EVENTS.RUN_START]({}); ok(L.count === 0, "chill: run start clears ChillFrost too");
  ok(calls.paths === 0, "looks: no path or shape call reached the canvas in any frame");
}
console.log(fails ? `\n${fails} FAILED` : "\nALL PASS");
process.exit(fails ? 1 : 0);
