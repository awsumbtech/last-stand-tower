#!/usr/bin/env node
// Headless balance simulator for Last Stand Tower.
//
// Loads the real game code (src/config.js, upgrades.js, entities.js, world.js,
// waves.js, game.js) into a Node VM with the browser bits stubbed out, then plays
// many seeded runs with scripted "player" strategies and records per-wave stats.
//
//   node tools/sim.js                         # all strategies, 40 seeds each
//   node tools/sim.js --runs 100 --strategies casual,skilled
//   node tools/sim.js --config my-tweaks.json --out sim-tweaks.json   # { "config": { ...CONFIG overrides } }
//   node tools/sim.js --favor                 # dominance check: skilled player who always takes card X
//   node tools/sim.js --unlocked starter      # card pool: all (default) | starter | multishot,crit,...
//   node tools/sim.js --campaign [--hours 10] # meta model: real Gears, card unlocks, Workshop upgrades, Head Start
//
// Notes: the sim steps at a fixed 1/60 s, 1x speed, desktop view (1280x800),
// and skips hit-stop / slow-mo (a few seconds per run at most).
"use strict";
const fs = require("fs");
const path = require("path");
const vm = require("vm");

const ROOT = path.join(__dirname, "..");
const FILES = ["config.js", "utils.js", "upgrades.js", "traps.js", "meta.js", "entities.js", "world.js", "waves.js", "game.js"];
const SOURCES = FILES.map((f) => [f, fs.readFileSync(path.join(ROOT, "src", f), "utf8")]);

// ---------- CLI ----------
const args = process.argv.slice(2);
const opt = (name, def) => {
  const i = args.indexOf("--" + name);
  if (i < 0) return def;
  const v = args[i + 1];
  return v === undefined || v.startsWith("--") ? true : v;
};
const RUNS = +opt("runs", 40);
const MAX_WAVE = +opt("max-wave", 120);
const DT = 1 / 60;
const SHOP_SECONDS = +opt("shop-seconds", 8); // assumed real time a player spends in each shop
const CELEBRATE_SECONDS = 1.6;
const DRAFT_SECONDS = +opt("draft-seconds", 2); // per Head Start draft hand
const VIEW = opt("phone", false) ? { halfW: 310, halfH: 650 } : { halfW: 640, halfH: 400 };
const CONFIG_PATH = opt("config", null);
const OVERRIDES = CONFIG_PATH ? JSON.parse(fs.readFileSync(CONFIG_PATH, "utf8")) : {};

// ---------- Seeded RNG ----------
function mulberry32(seed) {
  let a = seed >>> 0;
  return function () {
    a |= 0; a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

function deepMerge(target, src) {
  for (const [k, v] of Object.entries(src)) {
    if (v && typeof v === "object" && !Array.isArray(v) && target[k] && typeof target[k] === "object") deepMerge(target[k], v);
    else target[k] = v;
  }
}

// ---------- Load the game into a sandbox ----------
// Which Workshop cards are unlocked: "all", "starter" (none), or a list of ids.
const UNLOCKED = opt("unlocked", "all");
const USE_ABILITY = !opt("no-ability", false); // bots fire the ability when something is close or a boss winds up

function loadGame(seed, unlocked = UNLOCKED) {
  const rand = mulberry32(seed);
  const SandMath = Object.create(Math);
  SandMath.random = rand;
  const store = {};
  const sandbox = {
    Math: SandMath,
    console,
    localStorage: { getItem: (k) => (k in store ? store[k] : null), setItem: (k, v) => { store[k] = String(v); } },
  };
  sandbox.window = sandbox;
  vm.createContext(sandbox);
  for (const [name, src] of SOURCES) vm.runInContext(src, sandbox, { filename: name });
  const LST = sandbox.LST;

  // Browser-only pieces become no-ops.
  LST.UI = class { show() {} updateHud() {} renderShop() {} };
  LST.audio = { play() {}, startMusic() {}, stopMusic() {}, duckMusic() {}, setTension() {} };
  LST.haptics = { buzz() {} };

  LST.meta.state.unlocked = unlocked === "all" ? LST.CARDS.filter((c) => c.unlockCost).map((c) => c.id)
    : unlocked === "starter" ? [] : Array.isArray(unlocked) ? unlocked.slice() : String(unlocked).split(",");

  // Balance overrides: { config: { ...deep-merged into LST.CONFIG } }
  if (OVERRIDES.config) deepMerge(LST.CONFIG, OVERRIDES.config);

  const renderer = VIEW;
  const game = new LST.Game(renderer);
  return { LST, game };
}

// ---------- Tower helpers ----------
const towerDps = (t) => t.damage * t.fireRate * t.targets * (1 + t.critChance * (t.critMult - 1));

// Rough "how strong is this tower" estimate the skilled bot uses to rank cards.
function offense(t) {
  return t.damage * t.fireRate * (1 + t.critChance * (t.critMult - 1)) * Math.pow(Math.min(t.targets, 5), 0.75) *
    (1 + 0.6 * t.pierce) * (1 + 2.2 * t.splash) * (1 + 0.7 * t.slow) * Math.pow(t.range / 220, 0.7);
}
function defense(t) { return t.maxHp * (1 + t.regen * 16 + t.lifesteal * 25); }
function cardValue(card, game, last) {
  if (card.trap) return -1; // the skilled bot reads the fine print
  const t = game.tower;
  const c = Object.assign(Object.create(Object.getPrototypeOf(t)), t);
  card.apply(c);
  const hurt = last ? Math.min(1.5, last.hpLost / t.maxHp) : 0;
  const wDef = 0.25 + hurt;
  return Math.log(offense(c) / offense(t)) + wDef * Math.log(defense(c) / defense(t));
}

// ---------- Shop strategies: called once per shop visit ----------
// Each gets (LST, game, stats, lastWave) and uses the real shop API:
// game.takeCard(i) (first is free), game.rerollShop(), game.repairTower(), game.shopPrice(kind).
const open = (game) => game.shop.cards.map((c, i) => ({ ...c, i })).filter((c) => !c.taken);
function take(game, slot, stats) {
  const paid = game.shop.picked ? game.shopPrice("extraCard") : 0;
  if (!game.takeCard(slot.i)) return false;
  stats.spent += paid;
  stats.bought[slot.card.id] = (stats.bought[slot.card.id] || 0) + 1;
  stats.picks += 1; if (paid) stats.extras += 1;
  return true;
}
function repair(game, stats, below) {
  let n = 0;
  while (game.tower.hp < game.tower.maxHp * below && game.coins >= game.shopPrice("repair") && n++ < 3) {
    const price = game.shopPrice("repair");
    if (!game.repairTower()) break;
    stats.spent += price; stats.repairs += 1;
  }
}
function reroll(game, stats) {
  const price = game.shopPrice("reroll");
  if (game.coins < price || !game.rerollShop()) return false;
  stats.spent += price; stats.rerolls += 1;
  return true;
}
const rand = (arr) => arr[Math.floor(Math.random() * arr.length)];

// Skilled: ranks cards by estimated value, rerolls weak shops, buys extras that are
// worth it while keeping a repair reserve.
function skilled(LST, game, s, last, opts = {}) {
  const repairBelow = opts.noRepair ? 0 : 0.6;
  if (!opts.noRepair) repair(game, s, repairBelow);
  const best = () => open(game).map((c) => ({ ...c, v: opts.favor && opts.favor(c.card) ? 100 : cardValue(c.card, game, last) }))
    .sort((a, b) => b.v - a.v);
  let cards = best();
  // Reroll once before the free pick if nothing is good (or the favorite isn't there).
  const wantReroll = opts.favor && !opts.noSeek ? !cards.some((c) => opts.favor(c.card)) : cards.length && cards[0].v < 0.08;
  if (wantReroll && game.coins >= game.shopPrice("reroll") * 3) { reroll(game, s); cards = best(); }
  if (cards.length) take(game, cards[0], s);
  // Extras: buy the best remaining card while affordable; keep a repair in reserve
  // only when the tower is already hurt.
  for (let k = 0; k < 3; k++) {
    cards = best();
    if (!cards.length || cards[0].v <= 0) break;
    const hurt = game.tower.hp < game.tower.maxHp * 0.75;
    const reserve = opts.noRepair || !hurt ? 0 : LST.shopRules.price("repair", game.wave + 1);
    if (game.coins - game.shopPrice("extraCard") < reserve) break;
    take(game, cards[0], s);
  }
}

// Focus: take the favourite card whenever it shows up (reroll to look for it), else play skilled.
const focus = (ids) => (LST, game, s, last) => skilled(LST, game, s, last, { favor: (c) => ids.includes(c.id) });
// Trap check: the trap is put into every deal from wave 4 (CONFIG.traps.force) and always taken.
const trapFocus = (id) => (LST, game, s, last) => skilled(LST, game, s, last, { favor: (c) => c.id === id, noSeek: true });

const STRATEGIES = {
  // Casual: free pick is a random card (shiny rarities slightly preferred), repairs when
  // under half HP, spends the rest on random extra cards, never rerolls.
  // Learns traps like a player: skips ones already in the Codex (eye icon), and all of them
  // once Appraisal L2 prints the fine print in full.
  casual(LST, game, s) {
    repair(game, s, 0.5);
    const wary = (c) => !(c.card.trap && (LST.meta.knowsTrap(c.card.id) || LST.meta.level("appraisal") >= 2));
    const cards = open(game).filter(wary);
    const shiny = cards.flatMap((c) => Array(c.card.rarity === "epic" ? 3 : c.card.rarity === "rare" ? 2 : 1).fill(c));
    if (cards.length) take(game, rand(shiny), s);
    for (let k = 0; k < 2; k++) {
      const rest = open(game).filter(wary);
      if (!rest.length || game.coins < game.shopPrice("extraCard")) break;
      take(game, rand(rest), s);
    }
  },
  skilled: (LST, game, s, last) => skilled(LST, game, s, last),
  damage: focus(["damage", "crit", "overcharge"]),
  fireRate: focus(["fireRate"]),
  multishot: focus(["multishot", "pierce", "splash"]),
  noRepair: (LST, game, s, last) => skilled(LST, game, s, last, { noRepair: true }),
};

// ---------- One run ----------
// `meta` (optional) is a saved meta state ({ unlocked, upgrades, benched, ... }) plus `best`;
// the run then uses the game's own Workshop upgrades and Head Start (LST.meta / game.beginHeadStart).
function playRun(strategyName, seed, meta, unlocked) {
  const { LST, game } = loadGame(seed, meta ? meta.unlocked : unlocked);
  const strategy = STRATEGIES[strategyName];
  const waves = [];
  let cur = null, bossKills = 0, bossWavesSurvived = 0, bossWavesKilled = 0, finaleWon = false;

  // Instrument events.
  const onHit = game.onHit.bind(game);
  game.onHit = (e, dmg, crit) => { if (cur) cur.damageDealt += dmg || 0; onHit(e, dmg, crit); };
  const onKill = game.onEnemyKilled.bind(game);
  game.onEnemyKilled = (e) => {
    const before = game.coins;
    onKill(e);
    if (cur) cur.coinsEarned += game.coins - before;
    if (e.type === "boss") bossKills++;
  };
  const onTowerHit = game.onTowerHit.bind(game);
  game.onTowerHit = (e) => { if (cur) cur.hpLost += e.damage * (1 - game.tower.armor); onTowerHit(e); };
  if (strategyName.startsWith("trap:")) LST.CONFIG.traps.force = strategyName.slice(5);

  game.reset();
  const runStats = { spent: 0, bought: {}, picks: 0, extras: 0, rerolls: 0, repairs: 0 };
  let realSeconds = 0;
  let startWave = 0;
  if (meta) {
    Object.assign(LST.meta.state, JSON.parse(JSON.stringify(meta)));
    game.bestWave = meta.best || 0;
    LST.meta.applyToRun(game);
    startWave = LST.meta.headStartWave(game.bestWave);
    if (startWave > 0) {
      game.beginHeadStart(startWave);
      // The draft replays the skipped waves' shops (a few seconds each); the last hand is a normal shop.
      do { strategy(LST, game, runStats, null); realSeconds += DRAFT_SECONDS; } while (game.advanceDraft());
      game.draft = null;
    }
  }
  let last = null;

  while (game.wave < MAX_WAVE) {
    game.startNextWave();
    const t = game.tower;
    const types = game.spawnQueue.slice();
    const mult = game.waveMult;
    const totalHp = types.reduce((s, ty) => s + LST.CONFIG.enemies[ty].hp * mult.hp, 0);
    const spawnSpan = types.length * game.spawnInterval;
    cur = {
      wave: game.wave, count: types.length, bosses: types.filter((x) => x === "boss").length,
      enemyHp: totalHp, pressure: totalHp / Math.max(1, spawnSpan + 6), // HP per second arriving (+walk-in time)
      dps: towerDps(t), hpStart: t.hp, maxHp: t.maxHp,
      coinsEarned: 0, spent: 0, hpLost: 0, damageDealt: 0, seconds: 0,
    };
    let time = 0;
    const killsBefore = game.bossKills;
    while (game.state === "playing" && time < 900) {
      if (USE_ABILITY && game.ability.cd <= 0 && game.enemies.some((e) => !e.dead && (e.windup > 0 || (!e.isBoss && e.x * e.x + e.y * e.y < 95 * 95)))) game.useAbility();
      game.step(DT);
      time += DT;
      game.texts.length = 0; game.particles.length = 0; game.bursts.length = 0; game.confetti.length = 0;
    }
    cur.seconds = time;
    cur.realDps = cur.damageDealt / Math.max(1, time);
    realSeconds += time;
    if (game.state === "victory") {
      finaleWon = true;
      realSeconds += 7; // party + World cleared! screen
      game.state = "cleared";
      game.continueEndless(); // straight into Endless (Gears are paid when the run ends)
      cur.died = false;
      waves.push(cur);
      last = cur;
      realSeconds += SHOP_SECONDS;
      strategy(LST, game, runStats, cur);
      continue;
    }
    if (LST.waves.isBossWave(game.wave) && game.state === "celebrate") { bossWavesSurvived++; cur.bossKilled = game.bossKills > killsBefore; if (cur.bossKilled) bossWavesKilled++; cur.bossFight = cur.seconds; }
    const died = game.state !== "celebrate";
    cur.died = died;
    if (!died) {
      // Clear bonus was added in endWave; count it as earned.
      cur.coinsEarned += LST.waves.clearBonus(game.wave);
      game.finishCelebration();
      while (game.state === "gotcha") game.dismissGotcha();
      realSeconds += CELEBRATE_SECONDS + SHOP_SECONDS;
      const spentBefore = runStats.spent;
      strategy(LST, game, runStats, cur);
      cur.spent = runStats.spent - spentBefore;
      cur.coinsBanked = game.coins;
    }
    waves.push(cur);
    last = cur;
    if (died) break;
  }
  for (const p of game.pendingGotchas) LST.meta.discoverTrap(p.id);
  if (meta) {
    meta.codex = JSON.parse(JSON.stringify(LST.meta.state.codex));
    meta.worlds = JSON.parse(JSON.stringify(LST.meta.state.worlds));
  }
  return {
    strategy: strategyName, seed, deathWave: game.wave, startWave, realMinutes: realSeconds / 60,
    bought: runStats.bought, picks: runStats.picks, extras: runStats.extras, rerolls: runStats.rerolls, repairs: runStats.repairs, bossKills, waves,
    finalDps: towerDps(game.tower),
    gears: LST.meta.gearsFor(game.wave, game.bossWavesCleared, game.gearMult, 0, game.bossKills).total + (game.worldBonus ? game.worldBonus.bonus : 0),
    bossWavesSurvived, bossWavesKilled, bossEscapes: game.bossEscapes, finaleWon, reachedFinale: game.wave >= LST.CONFIG.finale.wave,
    traps: game.trapLog.map((t) => t.id),
  };
}

// ---------- Campaign: Gears, card unlocks, Workshop upgrades, Head Start, bench ----------
// A player who keeps playing `strategy` for `hours` of real time. After each run they spend
// Gears with a simple balanced policy:
//   1. unlock the next (cheapest) card if affordable,
//   2. then spend up to `statShare` of what's left on the cheapest Workshop upgrade
//      (Head Start only when the cap lets them use the new level), saving the rest
//      toward the next card. Once every card is unlocked, all Gears go to upgrades.
// Head Start is always used at its max.
function campaign(strategy, seed, hours = 10, statShare = +opt("stat-share", 0.5)) {
  const { LST } = loadGame(1);
  const cfg = LST.CONFIG.meta;
  const order = LST.meta.lockable().map((c) => [c.id, c.unlockCost]);
  const cost = (id, n) => { const u = cfg.upgrades[id]; return n >= u.max ? Infinity : u.costs ? u.costs[n] : Math.round(u.base * Math.pow(u.growth, n)); };
  const meta = { unlocked: [], upgrades: {}, benched: [], headStartPick: null, best: 0, codex: { seen: [], traps: [] } };
  let gears = 0, minutes = 0;
  const events = {}, runs = [];
  for (let run = 1; minutes < hours * 60 && run <= 2000; run++) {
    const r = playRun(strategy, seed * 10000 + run, meta);
    minutes += r.realMinutes;
    gears += r.gears;
    meta.best = Math.max(meta.best, r.deathWave);
    runs.push({ run, start: r.startWave, wave: r.deathWave, minutes: +r.realMinutes.toFixed(1), at: +(minutes / 60).toFixed(2), gears: r.gears,
      levels: Object.values(meta.upgrades).reduce((a, b) => a + b, 0), cards: meta.unlocked.length, finaleWon: r.finaleWon,
      bossKilled: r.bossWavesKilled, bossSurvived: r.bossWavesSurvived,
      bossWaves: r.waves.filter((w) => w.bossKilled !== undefined).map((w) => [w.wave, w.bossKilled ? 1 : 0, Math.round(w.seconds)]),
      finaleSec: (() => { const f = r.waves.find((w) => w.wave === LST.CONFIG.finale.wave); return f ? Math.round(f.seconds) : null; })(),
      bossEscapes: r.bossEscapes || 0 });
    for (const m of [20, 30, 40, 50, 60, 80, 100]) if (!events["wave" + m] && r.deathWave >= m) events["wave" + m] = { run, minutes: Math.round(minutes) };
    if (r.finaleWon && !events.finale) events.finale = { run, minutes: Math.round(minutes) };
    if (r.reachedFinale && !events.reach20) events.reach20 = { run, minutes: Math.round(minutes) };
    // 1. next card
    for (const [id, c] of order) {
      if (meta.unlocked.includes(id)) continue;
      if (gears >= c) { gears -= c; meta.unlocked.push(id); events[id] = { run, minutes: Math.round(minutes) }; }
      break;
    }
    // 2. upgrades
    const allCards = meta.unlocked.length === order.length;
    let budget = allCards ? gears : gears * statShare;
    for (let k = 0; k < 500; k++) {
      const opts = Object.keys(cfg.upgrades).map((id) => [id, cost(id, meta.upgrades[id] || 0)]).filter(([id, c]) => {
        if (c === Infinity) return false;
        if (id !== "headStart") return true;
        const next = ((meta.upgrades.headStart || 0) + 1) * cfg.upgrades.headStart.per;
        return next <= Math.floor((meta.best * cfg.headStartCap) / cfg.upgrades.headStart.per) * cfg.upgrades.headStart.per;
      }).sort((a, b) => a[1] - b[1]);
      // Head Start first whenever usable and affordable: it's what keeps runs short.
      const hs = opts.find(([id]) => id === "headStart");
      const pick = hs && hs[1] <= budget ? hs : opts[0];
      if (!pick || pick[1] > budget) break;
      budget -= pick[1]; gears -= pick[1];
      meta.upgrades[pick[0]] = (meta.upgrades[pick[0]] || 0) + 1;
    }
  }
  return { strategy, seed, events, runs, order, upgrades: meta.upgrades, best: meta.best };
}

// ---------- Main ----------
function summarize(results) {
  const by = {};
  for (const r of results) (by[r.strategy] = by[r.strategy] || []).push(r);
  const out = {};
  for (const [s, rs] of Object.entries(by)) {
    const w = rs.map((r) => r.deathWave).sort((a, b) => a - b);
    const m = rs.map((r) => r.realMinutes).sort((a, b) => a - b);
    const q = (arr, p) => arr[Math.min(arr.length - 1, Math.floor(p * arr.length))];
    out[s] = { runs: rs.length, deathWave: { min: w[0], p25: q(w, 0.25), median: q(w, 0.5), p75: q(w, 0.75), max: w[w.length - 1] },
      minutes: { median: +q(m, 0.5).toFixed(1), p25: +q(m, 0.25).toFixed(1), p75: +q(m, 0.75).toFixed(1) },
      bossKillRate: +(rs.reduce((a, r) => a + r.bossWavesKilled, 0) / Math.max(1, rs.reduce((a, r) => a + r.bossWavesSurvived, 0))).toFixed(2),
      finaleReached: +(rs.filter((r) => r.reachedFinale).length / rs.length).toFixed(2),
      finaleWon: +(rs.filter((r) => r.finaleWon).length / rs.length).toFixed(2) };
  }
  return out;
}

if (require.main === module) {
  const outPath = opt("out", "sim-results.json");
  const t0 = Date.now();
  if (opt("upgrade-check", false)) {
    // Workshop dominance check: spend a fixed Gear budget on ONE upgrade (or cheapest-first
    // "balanced"), all cards unlocked, then play skilled runs. Head Start off.
    const budget = +opt("gears", 1500), runs = +opt("runs", 40);
    const { LST } = loadGame(1);
    const cfg = LST.CONFIG.meta.upgrades;
    const cost = (id, n) => (n >= cfg[id].max ? Infinity : Math.round(cfg[id].base * Math.pow(cfg[id].growth, n)));
    const ids = ["power", "rapid", "armor", "greed", "sharpEye", "bank"];
    const q = (arr, p) => { arr = arr.slice().sort((a, b) => a - b); return arr[Math.floor(p * arr.length)]; };
    const rows = {};
    for (const plan of ["none", ...ids, "balanced", "balanced-no-armor"]) {
      const up = {}; let g = plan === "none" ? 0 : budget;
      for (let k = 0; k < 1000 && plan !== "none"; k++) {
        const opts = (plan.startsWith("balanced") ? ids.filter((i) => plan === "balanced" || i !== "armor") : [plan]).map((i) => [i, cost(i, up[i] || 0)]).sort((a, b) => a[1] - b[1]);
        if (!opts.length || opts[0][1] > g) break;
        g -= opts[0][1]; up[opts[0][0]] = (up[opts[0][0]] || 0) + 1;
      }
      const meta = { unlocked: LST.CARDS.filter((c) => c.unlockCost).map((c) => c.id), upgrades: up, benched: [], headStartPick: 0, best: 0 };
      const rs = []; for (let s = 1; s <= runs; s++) rs.push(playRun("skilled", s, meta));
      rows[plan] = { levels: JSON.stringify(up), medianWave: q(rs.map((r) => r.deathWave), 0.5), p25: q(rs.map((r) => r.deathWave), 0.25), minutes: +q(rs.map((r) => r.realMinutes), 0.5).toFixed(1) };
    }
    console.log(`Upgrade check: ${budget} Gears on one upgrade, skilled, all cards, ${runs} runs`);
    console.table(rows);
    fs.writeFileSync(outPath, JSON.stringify(rows, null, 1));
  } else if (opt("campaign", false)) {
    const n = +opt("campaigns", 12), hours = +opt("hours", 10);
    const q = (arr, p) => { arr = arr.slice().sort((a, b) => a - b); return arr[Math.min(arr.length - 1, Math.floor(p * arr.length))]; };
    const out = {};
    for (const strategy of String(opt("strategies", "casual,skilled")).split(",")) {
      const camps = [];
      for (let s = 1; s <= n; s++) { camps.push(campaign(strategy, s, hours)); process.stderr.write("."); }
      const order = camps[0].order;
      const run1 = camps.map((c) => c.runs[0]);
      const ev = (id) => ({ run: q(camps.map((c) => (c.events[id] ? c.events[id].run : 9999)), 0.5), hours: +(q(camps.map((c) => (c.events[id] ? c.events[id].minutes : 99999)), 0.5) / 60).toFixed(2) });
      // run length per hour band
      const bands = [];
      for (let h = 0; h < hours; h++) {
        const rs = camps.flatMap((c) => c.runs.filter((r) => r.at > h && r.at <= h + 1));
        if (!rs.length) continue;
        const m = rs.map((r) => r.minutes);
        bands.push({ hour: `${h}-${h + 1}`, runs: rs.length, medianMin: q(m, 0.5), p90Min: q(m, 0.9), maxMin: Math.max(...m),
          medianStart: q(rs.map((r) => r.start), 0.5), medianWave: q(rs.map((r) => r.wave), 0.5) });
      }
      const all = camps.flatMap((c) => c.runs);
      const row = {
        firstRun: { wave: q(run1.map((r) => r.wave), 0.5), minutes: q(run1.map((r) => r.minutes), 0.5), gears: q(run1.map((r) => r.gears), 0.5),
          firstUnlockAffordable: +(run1.filter((r) => r.gears >= order[0][1]).length / n).toFixed(2) },
        unlocks: Object.fromEntries(order.map(([id, cost]) => [id, { cost, ...ev(id) }])),
        milestones: Object.fromEntries(["reach20", "finale", "wave30", "wave40", "wave50", "wave60", "wave80"].map((m) => [m, ev(m)])),
        bands, longestRun: Math.max(...all.map((r) => r.minutes)), over10: all.filter((r) => r.minutes > 10).length, totalRuns: all.length,
        endUpgrades: camps[0].upgrades, endBest: q(camps.map((c) => c.best), 0.5),
        bossKillRate: +(all.reduce((a, r) => a + r.bossKilled, 0) / Math.max(1, all.reduce((a, r) => a + r.bossSurvived, 0))).toFixed(2),
        finaleRuns: camps.map((c) => (c.events.finale ? c.events.finale.run : null)),
      };
      const bw = {};
      for (const r of all) for (const [w, k, sec] of r.bossWaves) { const b = (bw[w] = bw[w] || { n: 0, killed: 0, secs: [] }); b.n++; b.killed += k; b.secs.push(sec); }
      row.bossByWave = Object.fromEntries(Object.entries(bw).map(([w, b]) => [w, { survived: b.n, killRate: +(b.killed / b.n).toFixed(2), medianWaveSec: q(b.secs, 0.5) }]));
      out[strategy] = row;
      console.log(`\n== ${strategy} (${n} campaigns x ${hours} h): first run wave ${row.firstRun.wave}, ${row.firstRun.minutes} min, ${row.firstRun.gears} Gears; ` +
        `longest run ${row.longestRun} min; runs over 10 min: ${row.over10}/${row.totalRuns}; best wave at the end ${row.endBest}; ` +
        `boss kill rate ${row.bossKillRate}; finale first beaten on runs ${JSON.stringify(row.finaleRuns)}`);
      console.table(row.unlocks);
      console.table(row.milestones);
      console.table(bands);
      console.table(row.bossByWave);
      console.log("upgrades at the end (campaign 1):", JSON.stringify(row.endUpgrades));
    }
    fs.writeFileSync(outPath, JSON.stringify(out, null, 1));
  } else {
    let names = opt("strategies", "all") === "all" ? Object.keys(STRATEGIES) : String(opt("strategies")).split(",");
    if (opt("favor", false)) {
      // Dominance check: one strategy per card that always grabs that card when offered.
      const { LST } = loadGame(1);
      names = ["skilled"];
      if (!opt("traps-only", false)) for (const c of LST.CARDS) { STRATEGIES["favor:" + c.id] = focus([c.id]); names.push("favor:" + c.id); }
      for (const c of LST.TRAPS) { STRATEGIES["trap:" + c.id] = trapFocus(c.id); names.push("trap:" + c.id); }
    }
    const results = [];
    for (const name of names) {
      for (let seed = 1; seed <= RUNS; seed++) results.push(playRun(name, seed));
      process.stderr.write(`${name} done\n`);
    }
    const summary = summarize(results);
    fs.writeFileSync(outPath, JSON.stringify({ overrides: OVERRIDES, summary, results }, null, 0));
    console.table(Object.fromEntries(Object.entries(summary).map(([k, v]) => [k, { median: v.deathWave.median, p25: v.deathWave.p25, p75: v.deathWave.p75, min: v.deathWave.min, max: v.deathWave.max, mean: +(results.filter((r) => r.strategy === k).reduce((a, r) => a + r.deathWave, 0) / RUNS).toFixed(2), minutes: v.minutes.median, bossKill: v.bossKillRate, reach20: v.finaleReached, won20: v.finaleWon }])));
  }
  process.stderr.write(`took ${((Date.now() - t0) / 1000).toFixed(1)}s -> ${outPath}\n`);
}

module.exports = { playRun, campaign, STRATEGIES };
