#!/usr/bin/env node
// World 2 (Beach) systems test (node, no browser): node tools/world-test.js
//   registry + unlock rules (incl. the ?debug=1&unlock=beach door), save migration v4 -> v5,
//   the Beach LevelPlan acts / beats, ShellShield regrow-once, Flyer slow immunity,
//   Captain Crabclaw phases / frenzy / coconut lifecycle, the World 2 renderers (draw nothing
//   without their sheets, draw only images with stub sheets, no path / shape calls in source),
//   index.html + sw.js lists, and a short Beach game smoke run.
// Backyard byte-identity is checked by tools/sim-ab.sh (seeded A/B vs main).
const fs = require("fs"), path = require("path"), vm = require("vm");
const ROOT = path.join(__dirname, "..");
const FILES = JSON.parse(fs.readFileSync(path.join(__dirname, "sim.js"), "utf8").match(/const FILES = (\[[^\]]*\])/)[1]);
const RENDER_FILES = ["sprites/SheetAnimation.js", "sprites/LookSheetLibrary.js", ...["AtlasSheetAdapter", "World2Sheets", "SheetRenderer", "HermitCrabRenderer", "SeagullRenderer", "CrabclawRenderer", "EliteShellRenderer", "CoconutRenderer", "BeachBackdrop", "WorldRenderers"].map((f) => "worlds/render/" + f + ".js")];
const UI_FILES = ["ui/WorldSelect.js", "ui/WorldScreens.js"];

function mulberry32(a) { return () => { a |= 0; a = (a + 0x6d2b79f5) | 0; let t = Math.imul(a ^ (a >>> 15), 1 | a); t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t; return ((t ^ (t >>> 14)) >>> 0) / 4294967296; }; }
// A sandboxed game. `store` seeds localStorage (e.g. an old save) before meta.js runs.
function load(seed = 1, store = {}, extra = []) {
  const M = Object.create(Math); M.random = mulberry32(seed);
  const sb = { Math: M, console, localStorage: { getItem: (k) => (k in store ? store[k] : null), setItem: (k, v) => { store[k] = String(v); } } };
  sb.window = sb; vm.createContext(sb);
  for (const f of [...FILES, ...extra]) vm.runInContext(fs.readFileSync(path.join(ROOT, "src", f), "utf8"), sb, { filename: f });
  const LST = sb.LST;
  LST.UI = class { show() {} updateHud() {} renderShop() {} renderWorkshop() {} };
  LST.audio = { play() {}, startMusic() {}, stopMusic() {}, duckMusic() {}, setTension() {} };
  LST.haptics = { buzz() {} };
  const game = new LST.Game({ halfW: 310, halfH: 650 });
  game.reset();
  return { LST, game, store };
}
let fails = 0, passes = 0;
const ok = (cond, msg) => { console.log((cond ? "PASS " : "FAIL ") + msg); if (cond) passes++; else fails++; };
const near = (a, b, e = 1e-6) => Math.abs(a - b) <= e;
const MULT = { hp: 1, speed: 1, damage: 1, coins: 1 };
const flags = (unlocks) => ({ enabled: true, unlocks });

// ---------- 1. Registry and unlock rules ----------
{
  const { LST, game } = load(1);
  const R = LST.WorldRegistry;
  ok(R.list().map((w) => w.id).join() === "backyard,beach", "registry: worlds in map order (backyard, beach)");
  ok(R.get("beach") instanceof LST.WorldDefinition && R.get("beach").plan instanceof LST.LevelPlan && !R.get("backyard").plan, "registry: Beach is a plan-driven WorldDefinition, Backyard keeps the classic waves");
  ok(R.get("backyard").createDirector() instanceof LST.ClassicWaveDirector && R.get("beach").createDirector() instanceof LST.LevelDirector, "registry: directors (Classic for Backyard, LevelDirector for Beach)");
  ok(R.get("beach").gearMult === 1.6 && R.get("backyard").gearMult === 1, "registry: Gears x1.6 on the Beach, x1 in the Backyard");
  ok(R.isUnlocked("backyard") && !R.isUnlocked("beach", LST.meta, null), "unlock: fresh save has Backyard open, Beach locked");
  ok(!R.isUnlocked("beach", LST.meta, { enabled: false, unlocks: ["beach"] }), "unlock: &unlock=beach without ?debug=1 does nothing");
  ok(R.isUnlocked("beach", LST.meta, flags(["beach"])) && !R.isUnlocked("beach", LST.meta, flags(["volcano"])), "unlock: ?debug=1&unlock=beach opens the Beach (only that id)");
  ok(!R.get("beach").isUnlockedBy(LST.meta) && !LST.meta.worldCleared("beach"), "unlock: the debug door never touches the save's own rule");
  ok(R.selected(LST.meta, null) === R.get("backyard") && R.select("beach", LST.meta, null) === null && LST.meta.state.world === "backyard", "select: locked Beach can't be picked or saved");
  ok(game.selectWorld("beach") === false && game.world.id === "backyard", "game.selectWorld refuses a locked world");
  LST.meta.clearWorld("backyard", 600);
  ok(R.isUnlocked("beach", LST.meta, null), "unlock: beating the Backyard finale opens the Beach");
  game.state = "menu";
  ok(game.selectWorld("beach") === true && game.world.id === "beach" && LST.meta.state.world === "beach" && game.director instanceof LST.LevelDirector, "select: picking the Beach switches world + director and saves the pick");
  ok(R.selected(LST.meta, null) === R.get("beach"), "select: saved pick comes back next load");
  game.state = "playing";
  ok(game.selectWorld("backyard") === false && game.world.id === "beach", "select: can't switch world mid-run");
  ok(game.runGearMult() === game.gearMult * 1.6, "results: run Gear multiplier = Piggy Bank x world (x1.6)");
}
// headStart: none on the Beach until its first clear
{
  const { LST } = load(1);
  LST.meta.state.upgrades.headStart = 3; LST.meta.clearWorld("backyard", 600);
  ok(LST.meta.headStartMax(19, "backyard") > 0 && LST.meta.headStartMax(19, "beach") === 0 && LST.meta.headStartWave(19, "beach") === 0, "head start: Backyard keeps it, Beach starts at wave 1 until cleared");
  LST.meta.clearWorld("beach", 600);
  ok(LST.meta.headStartMax(19, "beach") > 0, "head start: opens on the Beach after its first clear");
  const g0 = LST.meta.state.gears; const b = LST.meta.clearWorld("beach", 500, 1.6);
  ok(LST.meta.state.worlds.beach.clears === 2 && typeof b === "number" ? true : LST.meta.state.gears >= g0, "clearWorld: second Beach clear counts and pays (x1.6 bonus)");
}

// ---------- 2. Save migration v4 -> v5 ----------
{
  const v4 = { v: 4, gears: 123, lifetimeGears: 456, runs: 9, unlocked: [], upgrades: { power: 3 }, benched: [], headStartPick: null, codex: { seen: ["a"], traps: [] },
    armorRefund: 0, armorNotice: false, worlds: { backyard: { cleared: true, clears: 2, bestTime: 590 } }, abilities: ["shockwave"], ability: "shockwave", finaleNotice: false };
  const store = { "lst.meta": JSON.stringify(v4), "lst.bestWave": "21" };
  const { LST, game } = load(1, store);
  const s = LST.meta.state;
  ok(s.v === 5 && s.gears === 123 && s.lifetimeGears === 456 && s.runs === 9 && s.upgrades.power === 3 && s.codex.seen[0] === "a", "migration: v4 save -> v5 keeps Gears, runs, upgrades, codex");
  ok(s.worlds.backyard.cleared && s.worlds.backyard.clears === 2 && s.worlds.backyard.bestTime === 590, "migration: Backyard record kept");
  ok(JSON.stringify(s.worlds.beach) === JSON.stringify({ cleared: false, clears: 0, bestTime: 0, best: 0 }) && s.world === "backyard", "migration: adds an empty Beach record and world = backyard");
  ok(LST.WorldRegistry.isUnlocked("beach", LST.meta, null) && game.bestWave === 21 && JSON.parse(store["lst.meta"]).v === 5, "migration: a cleared v4 Backyard opens the Beach; legacy best wave (21) still read; saved as v5");
  const bad = load(1, { "lst.meta": JSON.stringify(Object.assign({}, v4, { v: 5, world: "atlantis", worlds: { backyard: v4.worlds.backyard } })) });
  ok(bad.LST.meta.state.world === "backyard" && bad.LST.meta.state.worlds.beach && bad.game.world.id === "backyard", "sanitize: unknown world falls back to Backyard; missing Beach record is filled");
  const vb = load(1, { "lst.meta": JSON.stringify(Object.assign({}, v4, { v: 5, world: "beach", worlds: { backyard: { cleared: false, clears: 0, bestTime: 0 }, beach: { cleared: false, clears: 0, bestTime: 0, best: 7 } } })) });
  ok(vb.game.world.id === "backyard", "load: a saved Beach pick on a save that hasn't opened it starts in the Backyard");
}

// v1 -> v5 and v3 -> v5: every step runs in order and lands on a clean v5 save.
{
  const v1 = { v: 1, gears: 40, lifetimeGears: 90, runs: 3, unlocked: ["multishot"] };
  const st1 = { "lst.meta": JSON.stringify(v1), "lst.bestWave": "8" };
  const a = load(1, st1), s1 = a.LST.meta.state;
  ok(s1.v === 5 && s1.gears === 40 && s1.lifetimeGears === 90 && s1.runs === 3 && s1.unlocked.join() === "multishot", "migration: v1 save -> v5 keeps Gears, runs, unlocked cards");
  ok(s1.worlds.backyard && !s1.worlds.backyard.cleared && s1.worlds.beach && !s1.worlds.beach.cleared && s1.world === "backyard" && s1.ability === "shockwave" && Array.isArray(s1.codex.seen), "migration: v1 -> v5 adds codex, abilities, Backyard + Beach records, world = backyard");
  ok(!a.LST.WorldRegistry.isUnlocked("beach", a.LST.meta, null) && a.game.bestWave === 8 && JSON.parse(st1["lst.meta"]).v === 5, "migration: v1 -> v5 keeps the Beach locked, reads the legacy best wave (8), saves as v5");
  const v3 = { v: 3, gears: 77, lifetimeGears: 300, runs: 12, unlocked: [], upgrades: { armor: 20, power: 5 }, benched: ["damage"], headStartPick: 6, codex: { seen: ["b"], traps: ["t"] }, armorRefund: 0, armorNotice: false };
  const st3 = { "lst.meta": JSON.stringify(v3), "lst.bestWave": "16" };
  const b = load(1, st3), s3 = b.LST.meta.state;
  ok(s3.v === 5 && s3.gears === 77 && s3.upgrades.armor === 20 && s3.upgrades.power === 5 && s3.benched.join() === "damage" && s3.headStartPick === 6 && s3.codex.traps.join() === "t", "migration: v3 save -> v5 keeps Gears, upgrades, bench, head-start pick, codex");
  ok(s3.worlds.backyard && s3.worlds.beach && s3.world === "backyard" && s3.finaleNotice === true && JSON.parse(st3["lst.meta"]).v === 5, "migration: v3 -> v5 adds world records + pick, finale notice for best wave 16, saves as v5");
}

// ---------- 3. LevelPlan acts and beats ----------
{
  const { LST } = load(1);
  const beach = LST.WorldRegistry.get("beach"), plan = beach.plan, D = beach.createDirector();
  const kinds = []; for (let w = 1; w <= 20; w++) kinds.push(plan.beat(w).kind[0]);
  ok(kinds.join("") === "nnnngsnnngsnnngsnnnf", "plan: waves 1-20 = 4 build-up, gate, supply, 3 rising, gate, supply, 3 siege, gate, supply, 3 last stand, finale (" + kinds.join("") + ")");
  ok(["buildup", "rising", "siege", "laststand"].every((id, i) => plan.beat([1, 7, 12, 17][i]).act === id), "plan: act ids by wave (1 buildup, 7 rising, 12 siege, 17 laststand)");
  ok(plan.beat(5).boss === "boss" && plan.beat(10).boss === "boss" && plan.beat(10).escorts.filter((x) => x === "crab").length === 2 && plan.beat(15).boss === "bigRedElite" && plan.beat(15).escorts.filter((x) => x === "gull").length === 2, "plan: gates are Big Red, Big Red + 2 crabs, Elite Big Red + 2 gulls");
  ok([5, 6, 10, 11, 15, 16].every((w) => plan.beat(w).rareShop) && ![1, 7, 12, 17].some((w) => plan.beat(w).rareShop), "plan: Rare+ shop after gates and supply waves only");
  ok(plan.beat(6).countMult === 0.5 && plan.beat(12).countMult === 1.1 && plan.beat(17).countMult === 1.2, "plan: supply x0.5, siege x1.1, last stand x1.2");
  ok(D.isFinale(20) && !D.isBossWave(20) && D.isBossWave(15) && !D.isBossWave(14) && D.bossWavesIn(19) === 3, "director: finale 20, gates 5/10/15");
  const noGullsEarly = [1, 2, 3, 4, 5, 6].every((w) => !LST.LevelPlan.weights(plan.beat(w).mix, w).some(([id]) => id === "gull"));
  ok(noGullsEarly && LST.LevelPlan.weights(plan.beat(8).mix, 8).some(([id]) => id === "gull") && !LST.LevelPlan.weights(plan.beat(1).mix, 1).some(([id]) => id === "crab") && LST.LevelPlan.weights(plan.beat(2).mix, 2).some(([id]) => id === "crab"), "plan: crabs from wave 2, gulls from wave 7");
  const q15 = D.build(15).queue, q5 = D.build(5).queue, q3 = D.build(3).queue;
  ok(q15.includes("bigRedElite") && q15.filter((t) => t === "gull").length >= 2 && q5.includes("boss") && !q3.includes("boss") && !q3.includes("tank"), "director: queues carry the gate boss + escorts, no Backyard tanks");
  ok(D.build(17).interval * D.build(17).queue.length <= plan.spawnSpan + 1e-9, "director: a whole wave spawns within spawnSpan (" + plan.spawnSpan + " s)");
  const m1 = D.multipliers(1), c1 = LST.waves.multipliers(1);
  ok(near(m1.hp, c1.hp * 2.5) && near(m1.damage, c1.damage * 1.2), "director: Beach HP x2.5 and damage x1.2 on the classic curve");
  ok(plan.beat(25).kind === "gate" && plan.beat(25).boss === "bigRedElite" && plan.beat(23).kind === "normal", "plan: Endless has an Elite Big Red gate every 5th wave");
}

// ---------- 4. Enemy archetypes: ShellShield regrows once ----------
{
  const { LST, game } = load(1);
  const c = LST.EnemyRegistry.create("crab", 0, -300, MULT);
  ok(c instanceof LST.PartEnemy && c.type === "crab" && c.part(LST.ShellShield) && LST.CONFIG.enemies.crab, "crab: a PartEnemy with a ShellShield, registered in CONFIG.enemies");
  ok(LST.EnemyRegistry.create("basic", 0, -300, MULT).constructor === LST.Enemy, "registry: Backyard types stay plain LST.Enemy");
  const sh = c.part(LST.ShellShield), hp0 = c.hp; sh.size(); // sized lazily on first use
  ok(near(sh.max, c.maxHp * 0.7) && sh.state === "shell", "shell: sized to 70% of max HP, up at spawn");
  c.takeDamage(sh.max * 0.5, game);
  ok(c.hp === hp0 && sh.state === "shell", "shell: soaks hits; body untouched");
  c.takeDamage(sh.max * 0.5 + 3, game);
  ok(sh.state === "broken" && near(c.hp, hp0 - 3) && sh.breaks === 1, "shell: breaks; overflow carries to the body on the same hit");
  for (let t = 0; t < 2.9; t += 0.1) c.update(0.1, game);
  ok(sh.state === "broken", "shell: still bare before regrowDelay (3 s)");
  for (let t = 0; t < 0.3; t += 0.1) c.update(0.1, game);
  ok(sh.state === "shell" && near(sh.hp, sh.max) && sh.regrowsLeft === 0 && sh.regrewAt > 0, "shell: regrows to full once after 3 s");
  c.takeDamage(sh.max, game);
  for (let t = 0; t < 10; t += 0.1) sh.update(0.1, c);
  ok(sh.state === "bare" && sh.breaks === 2, "shell: second break is for good (no second regrow)");
  const hp1 = c.hp; c.takeDamage(5, game);
  ok(near(c.hp, hp1 - 5), "shell: bare crab takes full damage");
  // Elite Big Red: sized after boss HP scaling
  const e = LST.EnemyRegistry.create("bigRedElite", 0, -300, MULT); e.maxHp = e.hp = 5000;
  ok(e.type === "boss" && e.part(LST.ShellShield).state === "shell" && near(e.part(LST.ShellShield).max, 5000 * 0.25), "elite: Big Red with a 25% shell sized after its HP is set");
}

// ---------- 5. Flyer: slows never land ----------
{
  const { LST, game } = load(1);
  const g = LST.EnemyRegistry.create("gull", 0, -200, MULT);
  g.maxHp = g.hp = 1e9; game.enemies.push(g);
  g.applySlow(0.5, 3);
  ok(g.part(LST.Flyer) && !(g.slowTimer > 0) && !g.slowAmount, "gull: applySlow does nothing (Frost Shots / chill)");
  game.ability.id = "freeze"; game.ability.cd = 0; game.state = "playing"; game.useAbility();
  ok(!(g.slowTimer > 0), "gull: Freeze ability doesn't slow it");
  const p = () => { const s = new LST.Projectile(0, 0, g, 10, 500, false); s.elements = { frostbite: 3 }; game.tower.elements = s.elements; game.tower.slow = 0.3; s.slow = 0.3; s.slowTime = 2; s.strike(g, game); };
  for (let i = 0; i < 60; i++) { p(); LST.StatusEffects.tickAll(game, 1 / 60); }
  ok(!(g.stun > 0) && !((game.elementFreezes || {}).gull) && !(g.status && g.status.frozen), "gull: Frostbite never freezes it (so IceCrust never attaches)");
  const hp = g.hp; g.takeDamage(10, game);
  ok(near(g.hp, hp - 10), "gull: still takes damage");
  const crab = LST.EnemyRegistry.create("crab", 0, -200, MULT); crab.applySlow(0.5, 3);
  ok(crab.slowTimer > 0, "crab: walkers still get slowed");
}

// ---------- 6. Captain Crabclaw ----------
{
  const { LST, game } = load(3);
  game.useWorld(LST.WorldRegistry.get("beach"));
  game.state = "playing"; game.tower.maxHp = game.tower.hp = 1e6;
  const C = LST.CONFIG.crabclaw;
  const b = LST.WorldRegistry.get("beach").createFinaleBoss(MULT, game);
  ok(b instanceof LST.CaptainCrabclaw && b instanceof LST.BossScript && b.isBoss && b.finaleBoss && b.hudName === "CAPTAIN CRABCLAW" && b.hudPhase === "Phase 1 / 2", "crabclaw: finale boss, a BossScript, named on the boss bar");
  game.enemies.push(b);
  let steps = 0; while (b.mode === "approach" && steps++ < 60 * 60) b.update(1 / 60, game);
  const d = Math.hypot(b.x - game.tower.x, b.y - game.tower.y);
  ok(b.mode === "fight" && d <= C.keepRange[0] + 3 && d < game.tower.range, "crabclaw: walks in and stops at keepRange inside tower range (" + d.toFixed(0) + ")");
  game.hazards = [];
  let wound = false; for (let i = 0; i < 60 * 4 && !game.hazards.length; i++) { b.update(1 / 60, game); if (b.windup > 0) wound = true; }
  ok(wound && game.hazards.length === 1 && game.hazards[0] instanceof LST.Coconut, "crabclaw: winds up (telegraph), then lobs a coconut");
  // coconut lifecycle: fly -> land on the tower -> splat -> dead
  const nut = game.hazards[0], hp0 = game.tower.hp;
  ok(nut.state === "flying" && near(nut.height, 0) && nut.tx === game.tower.x && nut.ty === game.tower.y, "coconut: flies at the tower, starts at arc height 0");
  nut.update(nut.flight / 2, game);
  ok(nut.state === "flying" && nut.height > 0 && near(nut.progress, 0.5), "coconut: mid-flight is up in the air");
  nut.update(nut.flight / 2 + 1e-6, game);
  ok(nut.state === "splat" && nut.hit && game.tower.hp < hp0, "coconut: lands on the tower and hurts it (" + (hp0 - game.tower.hp).toFixed(1) + ")");
  nut.update(0.2, game); ok(!nut.dead, "coconut: splat lingers");
  nut.update(0.2, game); ok(nut.dead, "coconut: gone after the splat (0.35 s)");
  const miss = new LST.Coconut({ x: 0, y: -200, tx: 300, ty: 0, flight: 1, damage: 50, hitRadius: 18 }); const hp1 = game.tower.hp;
  miss.update(1.01, game);
  ok(miss.state === "splat" && !miss.hit && game.tower.hp === hp1, "coconut: a scattered miss does no damage");
  // knock cancels a windup throw
  b.lobTimer = 0; b.windup = 0; b.update(1 / 60, game);
  ok(b.windup > 0, "crabclaw: winding up");
  const n0 = b.thrown; b.knock(100, 1.0); for (let i = 0; i < 30; i++) b.update(1 / 60, game);
  ok(b.thrown === n0, "crabclaw: Shockwave stun holds the throw");
  // phase 2 at 50%
  let banner = null; game.onBossPhase = (boss, bn) => { banner = bn; };
  b.takeDamage(b.maxHp * 0.51, game);
  ok(b.phase === 1 && b.angry && b.P.volley === 2 && b.keepRange === C.keepRange[1] && banner && banner.text === "PHASE 2" && b.hudPhase === "Phase 2 / 2", "crabclaw: phase 2 below 50% (2-nut volleys, closer, banner)");
  // frenzy after frenzyAt seconds of fighting
  b.fightTime = C.frenzyAt - 0.01; b.update(0.02, game);
  ok(b.frenzy && b.P.volley === 3 && b.hudPhase === "FRENZY!" && banner.text === "FRENZY!", "crabclaw: frenzy after " + C.frenzyAt + " s (3-nut volleys)");
  // minions
  game.enemies = [b]; b.stun = 0; b.minionTimer = 0; b.update(1 / 60, game);
  ok(game.enemies.some((e) => e.type === "crab" || e.type === "gull"), "crabclaw: calls crab / gull deckhands");
  // kill -> world cleared
  game.wave = 20; game.finale = { intro: 0, mole: b, won: false }; game.runTime = 500;
  b.takeDamage(1e9, game);
  ok(b.dead && LST.meta.worldCleared("beach"), "crabclaw: beating him clears the Beach");
}

// ---------- 7. World 2 renderers: images only ----------
{
  const { LST } = load(1, {}, [...RENDER_FILES, ...UI_FILES]);
  const calls = { draws: [], paths: 0 };
  const PATH = ["beginPath", "arc", "lineTo", "moveTo", "bezierCurveTo", "quadraticCurveTo", "fill", "stroke", "rect", "ellipse", "fillRect", "strokeRect", "roundRect", "fillText"];
  const ctx = new Proxy({ canvas: { width: 780, height: 1688 } }, { get: (t, k) => (k in t ? t[k] : k === "drawImage" ? (...a) => calls.draws.push(a) : PATH.includes(k) ? () => calls.paths++ : () => {}), set: (t, k, v) => { t[k] = v; return true; } });
  const W = LST.WorldRenderers, lib = LST.world2Sheets, r = { halfW: 195, halfH: 422, scale: 2, time: 1 };
  const crab = LST.EnemyRegistry.create("crab", -100, -200, MULT), gull = LST.EnemyRegistry.create("gull", 100, -200, MULT);
  const cc = new LST.CaptainCrabclaw(MULT), elite = LST.EnemyRegistry.create("bigRedElite", 0, -200, MULT);
  const nut = new LST.Coconut({ x: 0, y: -200, tx: 0, ty: 0, flight: 1, damage: 1, hitRadius: 18 }); nut.t = 0.5;
  let themed = 0; const theme = () => { themed++; };
  const frame = () => {
    calls.draws = []; themed = 0;
    W.shadows(ctx, [crab, gull, cc, elite], r);
    const handled = [crab, gull, cc, elite].map((e) => W.enemy(ctx, e, r, theme));
    W.groundHazards(ctx, [nut]); W.airHazards(ctx, [nut]);
    const bg = W.background(LST.WorldRegistry.get("beach")); bg.draw(ctx, r);
    return handled;
  };
  // Expected sheets (what Game Art & Motion delivers). Stub images: plain objects.
  const SPEC = {
    BeachGround: { anchor: { x: 768, y: 1024 }, refBodyR: 1, strips: { main: [1536, 2048, 1, 0, false] } },
    BeachSurf: { anchor: { x: 768, y: 0 }, refBodyR: 1, strips: { main: [1536, 384, 4, 6, true] } },
    HermitCrab: { anchor: { x: 96, y: 96 }, refBodyR: 48, strips: { walk: [192, 192, 6, 10, true], bare: [192, 192, 6, 12, true], crack: [192, 192, 4, 16, false], regrow: [192, 192, 4, 12, false] } },
    Seagull: { anchor: { x: 64, y: 64 }, refBodyR: 32, strips: { fly: [128, 128, 6, 12, true] } },
    CaptainCrabclaw: { anchor: { x: 192, y: 192 }, refBodyR: 110, strips: { walk: [384, 384, 6, 8, true], idle: [384, 384, 4, 6, true], throw: [384, 384, 6, 0, false], walk_angry: [384, 384, 6, 8, true], idle_angry: [384, 384, 4, 6, true], throw_angry: [384, 384, 6, 0, false] } },
    EliteShell: { anchor: { x: 96, y: 96 }, refBodyR: 48, strips: { on: [192, 192, 4, 8, true], crack: [192, 192, 4, 16, false], regrow: [192, 192, 4, 12, false] } },
    Coconut: { anchor: { x: 32, y: 32 }, refBodyR: 12, strips: { spin: [64, 64, 4, 16, true], splat: [160, 128, 4, 0, false] } },
    CoconutWarning: { anchor: { x: 80, y: 80 }, refBodyR: 75, strips: { warn: [160, 160, 6, 0, false] } },
    SeagullShadow: { anchor: { x: 64, y: 32 }, refBodyR: 32, strips: { shadow: [128, 64, 1, 0, false] } },
  };
  ok(Object.keys(SPEC).sort().join() === Object.keys(LST.WORLD2_SHEETS).sort().join(), "manifest: one World 2 sheet per renderer slot (" + Object.keys(LST.WORLD2_SHEETS).join(", ") + ")");

  let h = frame();
  ok(calls.draws.length === 0 && calls.paths === 0 && h.join() === "true,true,true,true" && themed === 1, "renderers: no sheets loaded -> nothing drawn at all (no fallback), Backyard theme only under the Elite overlay");
  ok(!W.enemy(ctx, LST.EnemyRegistry.create("basic", 0, 0, MULT), r, theme), "renderers: Backyard enemies are left to the theme");
  const json = {}, img = {};
  for (const [n, s] of Object.entries(SPEC)) {
    json[n] = { anchor: s.anchor, refBodyR: s.refBodyR, strips: {} }; img[n] = {};
    for (const [id, [w, hh, count, fps, loop]] of Object.entries(s.strips)) { json[n].strips[id] = { image: `${n}_${id}.png`, frame: { w, h: hh }, count, fps, loop }; img[n][id] = { id: n + ":" + id }; }
  }
  lib.install("HermitCrab", json.HermitCrab, {});
  ok(!lib.get("HermitCrab") && frame() && calls.draws.length === 0, "renderers: a sheet whose images haven't loaded still draws nothing");
  for (const n of Object.keys(SPEC)) lib.install(n, json[n], img[n]);
  h = frame();
  const used = calls.draws.map((d) => d[0].id);
  ok(calls.paths === 0 && ["HermitCrab:walk", "Seagull:fly", "SeagullShadow:shadow", "CaptainCrabclaw:walk", "EliteShell:on", "CoconutWarning:warn", "Coconut:spin", "BeachGround:main", "BeachSurf:main"].every((x) => used.includes(x)), "renderers: with stub sheets every visual is one drawImage of its own sheet, 0 path calls (" + used.join(" ") + ")");
  { const d = calls.draws.find((x) => x[0].id === "HermitCrab:walk"), k = LST.SheetRenderer.bodyR(crab) / 48;
    ok(near(d[7], 192 * k) && near(d[8], 192 * k), "renderers: crab drawn at bodyR / refBodyR (radius x 1.35)"); }
  // shell states pick strips
  const sh = crab.part(LST.ShellShield); crab.age = 5; crab.takeDamage(sh.max + 1, {}); frame();
  ok(calls.draws.some((d) => d[0].id === "HermitCrab:crack"), "crab renderer: crack plays when the shell breaks");
  crab.age = 7; frame(); ok(calls.draws.some((d) => d[0].id === "HermitCrab:bare"), "crab renderer: bare while broken");
  sh.update(3.1, crab); frame(); ok(calls.draws.some((d) => d[0].id === "HermitCrab:regrow"), "crab renderer: regrow plays once when it comes back");
  crab.age += 2; frame(); ok(calls.draws.some((d) => d[0].id === "HermitCrab:walk"), "crab renderer: back to walk");
  cc.mode = "fight"; cc.windup = cc.windupMax = 0.75; frame(); ok(calls.draws.some((d) => d[0].id === "CaptainCrabclaw:throw"), "crabclaw renderer: throw clip over the windup");
  { const R = W.bodies.crabclaw; lib.sheets.CaptainCrabclaw.strips.throw.releaseFrame = 2; const sp = lib.sheets.CaptainCrabclaw.strips.throw; sp.count = 4;
    const seq = []; cc.slamAnim = 0;
    for (const w of [0.75, 0.5, 0.2, 0.01]) { cc.windup = w; seq.push(R.throwFrame("throw", cc)); }
    cc.windup = 0; for (const a of [1, 0.6, 0.3]) { cc.slamAnim = a; seq.push(R.throwFrame("throw", cc)); }
    ok(seq.join() === "0,0,1,1,2,2,3", "crabclaw renderer: frames 0-1 over the windup, release frame 2 on the throw, then 3 (" + seq.join() + ")"); cc.slamAnim = 0; cc.windup = 0.4; }
  { calls.draws = []; W.bodies.gull.draw(ctx, gull); W.bodies.crabclaw.draw(ctx, cc);
    ok(calls.draws.length === 2 && calls.draws.every((d) => d[7] > 0), "renderers: gull and Crabclaw face the camera, never mirrored (x>0 gull drawn unflipped)"); }
  { let hud = 0; calls.draws = []; W.enemy(ctx, crab, r, theme, () => hud++); ok(hud === 1, "renderers: the theme HP bar is reused on top of a World 2 body"); }
  { LST.SheetRenderer.reduced = false; const a = W.bodies.crab.frameAt("walk", 0.35); W.motion({ fx: { reducedMotion: true } }); const b = W.bodies.crab.frameAt("walk", 0.35), c1 = W.bodies.crab.frameAt("crack", 0.2); W.motion({});
    ok(a > 0 && b === 0 && c1 > 0, "reduced motion: loops hold frame 0, one-shots still play"); }
  cc.phase = 1; frame(); ok(calls.draws.some((d) => d[0].id === "CaptainCrabclaw:throw_angry"), "crabclaw renderer: angry art in phase 2 (own sheet strips, not a tint)");
  nut.update(0.6, { tower: { x: 0, y: 0, radius: 30 } }); frame(); ok(calls.draws.some((d) => d[0].id === "Coconut:splat") && !calls.draws.some((d) => d[0].id === "Coconut:spin"), "coconut renderer: splat after landing, no air sprite");
  // Real v0.1.1 atlases through the adapter (stub image): slots, gutters, pivots, body radius.
  {
    const A = LST.AtlasSheetAdapter, dir = path.join(ROOT, "assets/sprites/world2"), J = (f) => JSON.parse(fs.readFileSync(path.join(dir, f), "utf8"));
    const crabA = A.build(J("hermit_crab/hermit_crab_a.json"), { id: "atlas" }, { walk_broken: "bare", hit_crack: "crack" }).strips;
    ok(["walk", "bare", "crack", "regrow"].every((k) => crabA[k]) && crabA.walk.count === 4 && crabA.walk.refBodyR === 48.6 && crabA.walk.ax === 96, "adapter: hermit_crab_a -> walk / bare / crack / regrow, 4 frames, refBodyR 48.6, pivot 96");
    calls.draws = []; crabA.bare.draw(ctx, 1, 0, 0, 48.6);
    const d = calls.draws[0], fr = J("hermit_crab/hermit_crab_a.json").frames.hermit_crab_a_walk_broken_1.frame;
    ok(d[1] === fr.x && d[2] === fr.y && fr.x === 194 && d[5] === -96 && d[6] === -96 && d[7] === 192, "adapter: frame rects honour the 2 px gutter grid and the centre pivot");
    const boss = Object.assign({}, A.build(J("crabclaw/crabclaw_b.json"), {}).strips, A.build(J("crabclaw/crabclaw_b_angry.json"), {}, { walk: "walk_angry", hurt: "hurt_angry" }).strips);
    ok(["walk", "idle", "throw", "walk_angry", "idle_angry", "throw_angry"].every((k) => boss[k]) && boss.throw.releaseFrame === 2 && boss.throw_angry.releaseFrame === 2, "adapter: crabclaw_b + angry -> all six slots, releaseFrame 2");
    const surf = A.build(J("background/beach_surf.json"), {}).strips.main;
    ok(surf.placement.a.foamTopYInBackgroundSrcPx === 275 && surf.loop && surf.count === 4, "adapter: surf keeps its placement on background a (row 275)");
    const sw = fs.readFileSync(path.join(ROOT, "sw.js"), "utf8"), urls = [].concat(...Object.values(LST.WORLD2_SHEETS).map((v) => [].concat(v).map((x) => (typeof x === "string" ? x : x.url))));
    const imgs = urls.map((u) => { const m = JSON.parse(fs.readFileSync(path.join(ROOT, u), "utf8")).meta; return path.dirname(u) + "/" + (m.quantizedCopy ? m.quantizedCopy.image : m.image); });
    const cardArt = ["assets/sprites/world2/cards/card_backyard.png", "assets/sprites/world2/cards/card_beach.png", LST.WorldSelect ? LST.WorldSelect.LOCK_ART : "assets/sprites/world2/cards/card_locked_overlay.png"];
    ok([...urls, ...imgs, ...cardArt].every((f) => fs.existsSync(path.join(ROOT, f)) && sw.includes('"' + f + '"')), "sw.js precaches every World 2 json + png the game loads, and each exists (" + (urls.length + imgs.length + 3) + " files)");
    const listed = [...sw.matchAll(/"(assets\/sprites\/world2\/[^"]+)"/g)].map((m) => m[1]);
    ok(listed.every((f) => fs.existsSync(path.join(ROOT, f))), "sw.js: every listed world2 file exists (" + listed.length + "), so install can't fail");
  }
  // Source scan: no canvas paths / fills / tints in any new render or UI file
  const BANNED = /\.\s*(beginPath|arc|arcTo|lineTo|moveTo|bezierCurveTo|quadraticCurveTo|closePath|ellipse|fillRect|strokeRect|roundRect|stroke|fill|fillText|strokeText|createLinearGradient|createRadialGradient|putImageData)\s*\(|\.\s*(fillStyle|strokeStyle|globalAlpha|globalCompositeOperation|filter|lineWidth|shadowColor|shadowBlur)\s*=(?!=)|LST\.draw\b/;
  const NEW = [...RENDER_FILES.slice(2), ...UI_FILES, "bosses/BossScript.js", "bosses/Coconut.js", "bosses/CaptainCrabclaw.js", "enemies/PartEnemy.js", "enemies/parts/ShellShield.js", "enemies/parts/Flyer.js", "worlds/Beach.js", "worlds/LevelDirector.js"];
  for (const f of NEW) {
    const code = fs.readFileSync(path.join(ROOT, "src", f), "utf8").split("\n").filter((l) => !/^\s*\/\//.test(l)).join("\n");
    const m = code.match(BANNED); ok(!m, "no code-drawn art in src/" + f + (m ? " (found " + m[0] + ")" : ""));
  }
}

// ---------- 7b. Art provenance: repo files == committed manifests (fails, never skips) ----------
for (const dirRel of ["assets/sprites/world2", "assets/sprites/looks"]) {
  const dir = path.join(ROOT, dirRel), mf = path.join(dir, "PROVENANCE.json");
  ok(fs.existsSync(mf), "provenance: " + dirRel + "/PROVENANCE.json committed");
  if (!fs.existsSync(mf)) continue;
  const P = JSON.parse(fs.readFileSync(mf, "utf8")), files = P.files || {};
  const sha = (f) => require("crypto").createHash("sha256").update(fs.readFileSync(f)).digest("hex");
  ok(P.source && P.source.delivery && P.source.version && P.source.date && Object.keys(files).length > 0, "provenance: " + dirRel + " names delivery, version and date (" + (P.source && P.source.version) + ", " + (P.source && P.source.date) + ")");
  const onDisk = []; (function walk(d) { for (const n of fs.readdirSync(d)) { const f = path.join(d, n); if (fs.statSync(f).isDirectory()) walk(f); else onDisk.push(path.relative(dir, f).split(path.sep).join("/")); } })(dir);
  const unlisted = onDisk.filter((f) => !files[f] && f !== "PROVENANCE.json" && f !== "MANIFEST.md");
  ok(unlisted.length === 0, "provenance: every file in " + dirRel + " is in the manifest" + (unlisted.length ? " (unlisted: " + unlisted.join(", ") + ")" : ""));
  const missing = [], changed = [];
  for (const [rel, e] of Object.entries(files)) {
    const f = path.join(dir, rel);
    if (!fs.existsSync(f)) { missing.push(rel); continue; }
    if (sha(f) !== e.sha256 || fs.statSync(f).size !== e.bytes) changed.push(rel);
  }
  ok(missing.length === 0, "provenance: no manifest file missing from " + dirRel + (missing.length ? " (MISSING: " + missing.join(", ") + ")" : ""));
  ok(changed.length === 0, "provenance: " + Object.keys(files).length + " files in " + dirRel + " match their committed sha256" + (changed.length ? " (CHANGED: " + changed.join(", ") + ")" : ""));
  const imgs = Object.entries(files).filter(([rel]) => rel.endsWith(".png"));
  ok(imgs.every(([, e]) => e.sha256 === e.sourceSha256 && /byte-identical/.test(e.edit)), "provenance: every image in " + dirRel + " is a byte-identical delivery file (sha256 == sourceSha256)");
  ok(imgs.filter(([rel]) => rel.endsWith(".q.png")).every(([, e]) => e.quantizedFrom && /^[0-9a-f]{64}$/.test(e.quantizedFrom.sha256) && e.quantizedFrom.name), "provenance: each .q.png records its original's name + sha256");
  // Every file name a sprite JSON points at exists in the repo (no _src/raw or missing masters).
  const broken = [];
  for (const rel of Object.keys(files).filter((r) => r.endsWith(".json"))) {
    let j; try { j = JSON.parse(fs.readFileSync(path.join(dir, rel), "utf8")); } catch (e) { broken.push(rel + " is not valid JSON"); continue; }
    const base = path.dirname(path.join(dir, rel));
    const refs = [];
    (function walk(o, k) { if (o && typeof o === "object") { for (const [kk, v] of Object.entries(o)) walk(v, kk); } else if (typeof o === "string") { if (/_src\//.test(o)) broken.push(rel + " -> " + o); else if (/^(image|json)$/.test(k)) refs.push(o); } })(j, "");
    for (const r of refs) if (!fs.existsSync(path.join(base, r))) broken.push(rel + " -> " + r);
  }
  ok(broken.length === 0, "provenance: every image / json name in " + dirRel + " JSON exists in the repo, no _src refs" + (broken.length ? " (" + broken.join("; ") + ")" : ""));
}

// ---------- 8. UI data: world cards + screens ----------
{
  const { LST, game } = load(1, {}, UI_FILES);
  const ws = new LST.WorldSelect(game, null);
  let cards = ws.cards();
  ok(cards[0].open && cards[0].selected && !cards[1].open && /Beat Backyard wave 20 to unlock/.test(cards[1].lockText) && cards[1].gearMult === 1.6, "world cards: Backyard open + picked; Beach locked with 'Beat Backyard wave 20 to unlock', Gears x1.6");
  LST.meta.clearWorld("backyard", 600); game.state = "menu"; game.selectWorld("beach"); cards = ws.cards();
  ok(cards[0].cleared && cards[1].open && cards[1].selected && !cards[1].dev, "world cards: after the Backyard clear the Beach is open (not a dev card) and picked");
  const el = {}; const doc = { getElementById: (id) => (el[id] = el[id] || { innerHTML: "", classList: { on: null, toggle(c, v) { this.on = v; } }, querySelector: () => (el[id + ":x"] = el[id + ":x"] || { textContent: "" }) }) };
  LST.WorldScreens.cleared(game, doc);
  ok(/Beach/.test(el["cl-title"].innerHTML) && el["cl-sub"].innerHTML.length > 0, "World cleared! screen says Beach (" + el["cl-title"].innerHTML + ")");
  LST.WorldScreens.results({ world: "beach", worldGearMult: 1.6 }, doc);
  ok(el["res-g-worldmult"].classList.on === false, "results: Beach Gears x1.6 row shown");
  LST.WorldScreens.results({ world: "backyard", worldGearMult: 1 }, doc);
  ok(el["res-g-worldmult"].classList.on === true, "results: x1 row hidden in the Backyard");
}

// ---------- 9. index.html + sw.js ----------
{
  const html = fs.readFileSync(path.join(ROOT, "index.html"), "utf8"), sw = fs.readFileSync(path.join(ROOT, "sw.js"), "utf8");
  const all = [...FILES, ...RENDER_FILES, ...UI_FILES, "core/DevFlags.js", "core/DevRunGuard.js"].map((f) => "src/" + f);
  ok(all.every((f) => html.includes(`src="${f}"`)), "index.html loads every World 2 script");
  ok(all.every((f) => sw.includes(`"${f}"`)) && /const VERSION = "v21"/.test(sw), "sw.js v21 precaches every World 2 script");
  const scripts = [...html.matchAll(/<script src="([^"]+)"/g)].map((m) => m[1]);
  const at = (f) => scripts.indexOf("src/" + f);
  ok(at("waves.js") < at("enemies/parts/EnemyPart.js") && at("worlds/Beach.js") < at("game.js") && at("sprites/LookSheetLibrary.js") < at("worlds/render/World2Sheets.js") && at("worlds/render/WorldRenderers.js") < at("main.js"), "index.html script order: systems after waves.js, renderers after LookSheetLibrary, all before main.js");
  ok(/id="world-select"/.test(html) && /id="res-g-worldmult"/.test(html) && /id="cl-title"/.test(html), "index.html has the world select, results row and cleared-screen ids");
}

// Locked world cards: overlay image only (P2-4). No CSS filter / opacity on any .world-card rule.
{
  const css = fs.readFileSync(path.join(ROOT, "style.css"), "utf8");
  const rules = [...css.matchAll(/([^{}]*\.world-card[^{}]*)\{([^}]*)\}/g)].map((m) => [m[1].trim(), m[2]]);
  const bad = rules.filter(([, body]) => /(^|[;\s])(filter|opacity|-webkit-filter|mix-blend-mode)\s*:/.test(body)).map(([sel]) => sel);
  ok(rules.length > 5 && bad.length === 0, "world cards: no CSS filter / opacity on world-card rules (locked = overlay image only)" + (bad.length ? " (found in " + bad.join(" | ") + ")" : ""));
  const ws = fs.readFileSync(path.join(ROOT, "src/ui/WorldSelect.js"), "utf8");
  ok(/card_locked_overlay\.png/.test(ws) && /wc-lock/.test(ws), "world cards: locked cards layer card_locked_overlay.png over the art");
}

// ---------- 10. Beach smoke run ----------
{
  const { LST, game } = load(5);
  game.useWorld(LST.WorldRegistry.get("beach"));
  game.reset(); game.tower.maxHp = game.tower.hp = 1e7; game.tower.damage *= 60;
  const seen = new Set(); let maxHz = 0, err = null;
  try {
    for (let w = 0; w < 20 && !["cleared", "victory"].includes(game.state); w++) {
      game.startNextWave();
      for (let i = 0; i < 60 * 240 && game.state === "playing"; i++) { game.step(1 / 60); for (const e of game.enemies) seen.add(e.archetype || e.type); maxHz = Math.max(maxHz, game.hazards.length); }
      if (game.state === "shop") game.state = "menu";
    }
  } catch (e) { err = e; }
  ok(!err, "smoke: 20 Beach waves run without errors" + (err ? " (" + err.message + ")" : ""));
  ok(["basic", "crab", "gull", "boss", "bigRedElite", "crabclaw"].every((t) => seen.has(t)), "smoke: saw " + [...seen].join(", "));
  const fb = game.finale && game.finale.mole;
  if (!["cleared", "victory"].includes(game.state)) console.log("  smoke: wave", game.wave, "state", game.state, "boss", fb && fb.type, fb && Math.round(fb.hp) + "/" + Math.round(fb.maxHp), "mode", fb && fb.mode, "enemies", game.enemies.length);
  ok(maxHz > 0 && ["cleared", "victory"].includes(game.state) && LST.meta.worldCleared("beach"), "smoke: Crabclaw threw coconuts and the Beach was cleared (state " + game.state + ")");
}

// ---------- 11. Dev door: local hosts only, and a door run never writes the save ----------
function devFlagsAt(href) {
  const u = new URL(href);
  const cls = new Set();
  const sb = { URLSearchParams, location: { search: u.search, hostname: u.hostname, protocol: u.protocol },
    document: { documentElement: { classList: { toggle: (c, on) => (on ? cls.add(c) : cls.delete(c)) } } } };
  sb.window = sb; vm.createContext(sb);
  vm.runInContext(fs.readFileSync(path.join(ROOT, "src/core/DevFlags.js"), "utf8"), sb);
  return sb.LST.DevFlags;
}
{
  const { LST } = load(1);
  const R = LST.WorldRegistry;
  for (const href of ["https://awsumbtech.github.io/last-stand-tower/?debug=1&unlock=beach", "http://192.168.1.20:8765/?debug=1&unlock=beach", "https://example.com/?dev=1&unlock=beach"]) {
    const f = devFlagsAt(href);
    ok(f.enabled && !f.local && f.unlocks.length === 0 && !R.isUnlocked("beach", LST.meta, f), "door: inert on a non-local host (" + new URL(href).host + ")");
  }
  for (const href of ["http://localhost:8765/?debug=1&unlock=beach", "http://127.0.0.1:8765/index.html?debug=1&unlock=beach", "file:///home/x/index.html?debug=1&unlock=beach"]) {
    const f = devFlagsAt(href);
    ok(f.local && f.unlocks.join() === "beach" && R.isUnlocked("beach", LST.meta, f), "door: opens the Beach on a local host (" + (new URL(href).host || "file:") + ")");
  }
  ok(devFlagsAt("http://localhost:8765/?unlock=beach").unlocks.length === 0, "door: needs ?debug=1 even on localhost");
}
{
  // A full door run on the Beach (cleared finale, Gears, best wave, codex) leaves the save byte-unchanged.
  const store = {};
  const { LST, game } = load(9, store);
  LST.meta.state.gears = 250; LST.meta.state.runs = 4; LST.meta.save();
  const before = store["lst.meta"], beforeState = JSON.stringify(LST.meta.state), beforeKeys = Object.keys(store).sort().join();
  LST.DevFlags = Object.freeze({ enabled: true, local: true, unlocks: Object.freeze(["beach"]) });
  game.state = "menu";
  ok(game.selectWorld("beach") && game.world.id === "beach" && store["lst.meta"] === before && LST.meta.state.world === "backyard", "door run: picking the door-only Beach saves no world pick");
  let err = null;
  try {
    game.newGame();
    ok(game.devRun === true && LST.DevRunGuard.active, "door run: newGame marks a door-only world run as a dev run");
    game.tower.maxHp = game.tower.hp = 1e7; game.tower.damage *= 60;
    for (let w = 0; w < 21 && !["cleared", "victory"].includes(game.state); w++) {
      if (game.state !== "playing") game.startNextWave();
      for (let i = 0; i < 60 * 240 && game.state === "playing"; i++) game.step(1 / 60);
      if (game.state === "shop") game.state = "menu";
    }
    ok(["cleared", "victory"].includes(game.state) && LST.meta.worldCleared("beach") && LST.meta.state.worlds.beach.best > 0, "door run: the Beach finale was cleared in memory during the run (state " + game.state + ")");
    game.finishRun({ won: true });
  } catch (e) { err = e; }
  ok(!err, "door run: ran start to finish without errors" + (err ? " (" + err.stack + ")" : ""));
  ok(game.result && game.result.devRun === true && game.result.gears.total > 0, "door run: results still show the run (and say it was a dev run)");
  ok(store["lst.meta"] === before && Object.keys(store).sort().join() === beforeKeys, "door run: localStorage lst.meta byte-unchanged (no world pick, Gears, clears, best wave)");
  ok(JSON.stringify(LST.meta.state) === beforeState && !LST.meta.worldCleared("beach") && LST.meta.state.gears === 250 && LST.meta.state.runs === 4, "door run: meta.state byte-unchanged after the run");
  ok(!LST.DevRunGuard.active && !game.devRun, "door run: guard released after finishRun");
  // Quitting a door run mid-way (pause > Quit) also puts the save back and releases the guard.
  game.state = "menu"; game.selectWorld("beach"); game.newGame(); game.tower.maxHp = game.tower.hp = 1e7; game.tower.damage *= 60;
  for (let i = 0; i < 60 * 30; i++) game.step(1 / 60);
  LST.meta.state.gears += 999; LST.meta.save(); game.toMenu();
  ok(store["lst.meta"] === before && JSON.stringify(LST.meta.state) === beforeState && !LST.DevRunGuard.active && !game.devRun, "door run: quitting mid-run leaves the save byte-unchanged and releases the guard");
  // Normal runs are untouched by the guard.
  LST.DevFlags = Object.freeze({ enabled: false, local: true, unlocks: Object.freeze([]) });
  game.state = "menu"; game.selectWorld("backyard"); game.newGame();
  ok(game.devRun === false && !LST.DevRunGuard.active, "normal run: no guard in the Backyard");
  game.wave = 3; game.finishRun({ won: false });
  ok(LST.meta.state.runs === 5 && store["lst.meta"] !== before, "normal run: results are saved as usual");
}

console.log(`\n${fails ? "FAILED " + fails : "ALL PASS"} (${passes} passed)`);
process.exit(fails ? 1 : 0);
