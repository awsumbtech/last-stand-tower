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
console.log(fails ? `\n${fails} FAILED` : "\nALL PASS");
process.exit(fails ? 1 : 0);
