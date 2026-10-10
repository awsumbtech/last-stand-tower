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
//   node tools/sim.js --campaign              # Sprint 1 model: commons-only start, real Gears + Workshop unlock prices
//   node tools/sim.js --meta [--prestige]     # older planning model (lasting stat upgrades, prestige)
//
// Notes: the sim steps at a fixed 1/60 s, 1x speed, desktop view (1280x800),
// and skips hit-stop / slow-mo (a few seconds per run at most).
"use strict";
const fs = require("fs");
const path = require("path");
const vm = require("vm");

const ROOT = path.join(__dirname, "..");
const FILES = ["config.js", "utils.js", "upgrades.js", "meta.js", "entities.js", "world.js", "waves.js", "game.js"];
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
  LST.audio = { play() {}, startMusic() {}, stopMusic() {}, duckMusic() {} };
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
  const best = () => open(game).map((c) => ({ ...c, v: cardValue(c.card, game, last) * (opts.favor && opts.favor(c.card) ? 10 : 1) }))
    .sort((a, b) => b.v - a.v);
  let cards = best();
  // Reroll once before the free pick if nothing is good (or the favorite isn't there).
  const wantReroll = opts.favor ? !cards.some((c) => opts.favor(c.card)) : cards.length && cards[0].v < 0.08;
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

const STRATEGIES = {
  // Casual: free pick is a random card (shiny rarities slightly preferred), repairs when
  // under half HP, spends the rest on random extra cards, never rerolls.
  casual(LST, game, s) {
    repair(game, s, 0.5);
    const cards = open(game);
    const shiny = cards.flatMap((c) => Array(c.card.rarity === "epic" ? 3 : c.card.rarity === "rare" ? 2 : 1).fill(c));
    if (cards.length) take(game, rand(shiny), s);
    for (let k = 0; k < 2; k++) {
      const rest = open(game);
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

// ---------- Meta-progression (model of the proposed lasting upgrade tree) ----------
// Gems are earned at the end of every run: floor(gemBase * wave^gemExp * prestigeMult).
// Nodes cost round(base * growth^level). "headStart" lets a run begin at wave 5*level
// (capped to half the best wave), with the coins the skipped waves would have paid out.
const META = (OVERRIDES.meta) || {
  gemBase: 2, gemExp: 1.3,
  nodes: {
    power:     { base: 10, growth: 1.18, max: 60, damagePct: 0.08 },   // +8% damage / level (additive)
    rapid:     { base: 10, growth: 1.18, max: 40, fireRatePct: 0.04 }, // +4% fire rate
    armor:     { base: 8,  growth: 1.16, max: 60, hpPct: 0.10 },       // +10% max HP
    bank:      { base: 12, growth: 1.25, max: 20, startCoins: 20 },    // +20 starting coins
    greed:     { base: 15, growth: 1.22, max: 30, coinPct: 0.05 },     // +5% coins from kills
    crit:      { base: 20, growth: 1.25, max: 20, critPct: 0.02 },     // +2% crit chance
    headStart: { base: 60, growth: 1.6, max: 10, waves: 5 },           // start at wave 5*level
  },
  prestige: { minBest: 30, starsPerWaves: 5, starsFrom: 20, gemMultPerStar: 0.2, powerPerStar: 0.05 },
};

function metaCost(node, lvl) { return Math.round(node.base * Math.pow(node.growth, lvl)); }

function applyMeta(LST, game, meta) {
  const n = META.nodes, t = game.tower, levels = meta.levels;
  const L = (k) => levels[k] || 0;
  const star = 1 + META.prestige.powerPerStar * (meta.stars || 0);
  t.damage *= (1 + n.power.damagePct * L("power")) * star;
  t.fireRate *= 1 + n.rapid.fireRatePct * L("rapid");
  t.maxHp *= (1 + n.armor.hpPct * L("armor")) * star; t.hp = t.maxHp;
  t.critChance += n.crit.critPct * L("crit");
  game.coins += n.bank.startCoins * L("bank");
  game.metaCoinMult = 1 + n.greed.coinPct * L("greed");
  // Head start: skip waves, collect what they would have paid.
  const start = Math.min(n.headStart.waves * L("headStart"), Math.floor(((meta.best || 0) * (META.headStartFrac || 0.5)) / 5) * 5);
  if (start > 0) {
    let coins = 0;
    for (let w = 1; w <= start; w++) {
      const m = LST.waves.multipliers(w);
      for (const ty of LST.waves.build(w).queue) coins += Math.max(1, Math.round(LST.CONFIG.enemies[ty].coins * m.coins));
      coins += LST.waves.clearBonus(w);
    }
    game.coins += Math.round(coins * game.metaCoinMult);
    game.wave = start;
  }
  return start;
}

// ---------- One run ----------
function playRun(strategyName, seed, meta, unlocked) {
  const { LST, game } = loadGame(seed, unlocked);
  const strategy = STRATEGIES[strategyName];
  const waves = [];
  let cur = null, bossKills = 0;

  // Instrument events.
  const onHit = game.onHit.bind(game);
  game.onHit = (e, dmg, crit) => { if (cur) cur.damageDealt += dmg || 0; onHit(e, dmg, crit); };
  const onKill = game.onEnemyKilled.bind(game);
  game.onEnemyKilled = (e) => {
    const before = game.coins;
    onKill(e);
    if (game.metaCoinMult && game.metaCoinMult !== 1) game.coins += Math.round(e.coins * (game.metaCoinMult - 1));
    if (cur) cur.coinsEarned += game.coins - before;
    if (e.type === "boss") bossKills++;
  };
  const onTowerHit = game.onTowerHit.bind(game);
  game.onTowerHit = (e) => { if (cur) cur.hpLost += e.damage; onTowerHit(e); };

  game.reset();
  const runStats = { spent: 0, bought: {}, picks: 0, extras: 0, rerolls: 0, repairs: 0 };
  let realSeconds = 0;
  let startWave = 0;
  if (meta) {
    startWave = applyMeta(LST, game, meta);
    if (startWave > 0) { // skipped waves grant their free picks, then one shop for the coins
      game.state = "upgrade";
      for (let w = 0; w < startWave; w++) { game.openShop(); strategy(LST, game, runStats, null); }
      realSeconds += SHOP_SECONDS;
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
    while (game.state === "playing" && time < 900) {
      game.step(DT);
      time += DT;
      game.texts.length = 0; game.particles.length = 0; game.bursts.length = 0; game.confetti.length = 0;
    }
    cur.seconds = time;
    cur.realDps = cur.damageDealt / Math.max(1, time);
    realSeconds += time;
    const died = game.state !== "celebrate";
    cur.died = died;
    if (!died) {
      // Clear bonus was added in endWave; count it as earned.
      cur.coinsEarned += LST.waves.clearBonus(game.wave);
      game.finishCelebration();
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
  return {
    strategy: strategyName, seed, deathWave: game.wave, startWave, realMinutes: realSeconds / 60,
    bought: runStats.bought, picks: runStats.picks, extras: runStats.extras, rerolls: runStats.rerolls, repairs: runStats.repairs, bossKills, waves,
    finalDps: towerDps(game.tower),
    gears: LST.meta.gearsFor(game.wave, game.bossWavesCleared).total,
  };
}

// ---------- Meta progression model ----------
// A player who always plays `strategy`, earns gems per run, and spends them between runs
// on the cheapest node (head start whenever affordable). With `prestige`, they reset once a
// run gains < 1 wave over the average of their last 3 and best >= prestige.minBest.
function metaCampaign(strategy, seed, maxRuns, milestones, usePrestige) {
  const P = META.prestige;
  const meta = { levels: {}, best: 0, stars: 0 };
  let gems = 0, totalMinutes = 0;
  const reached = {};
  const history = [];
  let sincePrestige = [];
  for (let run = 1; run <= maxRuns; run++) {
    const r = playRun(strategy, seed * 1000 + run, meta);
    totalMinutes += r.realMinutes;
    const gemMult = 1 + P.gemMultPerStar * meta.stars;
    const earned = Math.floor(META.gemBase * Math.pow(r.deathWave, META.gemExp) * gemMult);
    gems += earned;
    meta.best = Math.max(meta.best, r.deathWave);
    sincePrestige.push(r.deathWave);
    history.push({ run, start: r.startWave, wave: r.deathWave, minutes: +r.realMinutes.toFixed(1), totalMinutes: +totalMinutes.toFixed(0), gems: earned, stars: meta.stars,
      levels: Object.values(meta.levels).reduce((a, b) => a + b, 0) });
    for (const m of milestones) if (!reached[m] && r.deathWave >= m) reached[m] = { run, hours: +(totalMinutes / 60).toFixed(1) };
    if (milestones.every((m) => reached[m])) break;

    // Prestige check.
    const recent = sincePrestige.slice(-4, -1);
    if (usePrestige && meta.best >= P.minBest && recent.length === 3) {
      const avg = recent.reduce((a, b) => a + b, 0) / 3;
      const newStars = Math.max(0, Math.floor((meta.best - P.starsFrom) / P.starsPerWaves));
      if (r.deathWave < avg + 1 && newStars > meta.stars) {
        meta.stars = newStars; meta.levels = {}; gems = 0; meta.best = 0; sincePrestige = [];
        history[history.length - 1].prestige = newStars;
        continue;
      }
    }
    // Spend gems.
    for (let k = 0; k < 1000; k++) {
      const opts = Object.entries(META.nodes).filter(([id, n]) => (meta.levels[id] || 0) < n.max)
        .map(([id, n]) => [id, metaCost(n, meta.levels[id] || 0)]);
      const hs = opts.find(([id]) => id === "headStart");
      const useful = hs && META.nodes.headStart.waves * ((meta.levels.headStart || 0) + 1) <= meta.best * (META.headStartFrac || 0.5);
      let pickOpt = useful && hs[1] <= gems ? hs : opts.filter(([id]) => id !== "headStart").sort((a, b) => a[1] - b[1])[0];
      if (!pickOpt || pickOpt[1] > gems) break;
      gems -= pickOpt[1];
      meta.levels[pickOpt[0]] = (meta.levels[pickOpt[0]] || 0) + 1;
    }
  }
  return { strategy, seed, reached, history, levels: meta.levels };
}

// ---------- Sprint 1 campaign: Gears + Workshop card unlocks ----------
// Start with the starter pool, earn the real Gears payout each run, and unlock the
// cheapest locked card whenever affordable (the "Next unlock" the results screen shows).
function unlockCampaign(strategy, seed, maxRuns = 40) {
  const { LST } = loadGame(1);
  const order = LST.meta.lockable().map((c) => [c.id, c.unlockCost]);
  const unlocked = [];
  let gears = 0, minutes = 0;
  const events = {}, runs = [];
  for (let run = 1; run <= maxRuns && unlocked.length < order.length; run++) {
    const r = playRun(strategy, seed * 1000 + run, null, unlocked);
    minutes += r.realMinutes;
    gears += r.gears;
    runs.push({ run, wave: r.deathWave, minutes: +r.realMinutes.toFixed(1), gears: r.gears, pool: unlocked.length });
    for (const [id, cost] of order) {
      if (unlocked.includes(id)) continue;
      if (gears < cost) break;
      gears -= cost; unlocked.push(id);
      events[id] = { run, minutes: Math.round(minutes) };
    }
  }
  return { strategy, seed, events, runs, order };
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
      minutes: { median: +q(m, 0.5).toFixed(1), p25: +q(m, 0.25).toFixed(1), p75: +q(m, 0.75).toFixed(1) } };
  }
  return out;
}

if (require.main === module) {
  const outPath = opt("out", "sim-results.json");
  const t0 = Date.now();
  if (opt("campaign", false)) {
    const n = +opt("campaigns", 30);
    const q = (arr, p) => { arr = arr.slice().sort((a, b) => a - b); return arr[Math.min(arr.length - 1, Math.floor(p * arr.length))]; };
    const out = {};
    for (const strategy of String(opt("strategies", "casual,skilled")).split(",")) {
      const camps = [];
      for (let s = 1; s <= n; s++) camps.push(unlockCampaign(strategy, s));
      const order = camps[0].order;
      const run1 = camps.map((c) => c.runs[0]);
      const firstCost = order[0][1];
      const row = {
        firstRun: { wave: q(run1.map((r) => r.wave), 0.5), waveP10: q(run1.map((r) => r.wave), 0.1), minutes: q(run1.map((r) => r.minutes), 0.5), gears: q(run1.map((r) => r.gears), 0.5),
          firstUnlockAffordable: +(run1.filter((r) => r.gears >= firstCost).length / n).toFixed(2) },
        secondRun: { wave: q(camps.map((c) => c.runs[1].wave), 0.5), minutes: q(camps.map((c) => c.runs[1].minutes), 0.5) },
        unlocks: Object.fromEntries(order.map(([id, cost]) => [id, { cost, run: q(camps.map((c) => (c.events[id] ? c.events[id].run : 99)), 0.5),
          minutes: q(camps.map((c) => (c.events[id] ? c.events[id].minutes : 9999)), 0.5) }])),
      };
      out[strategy] = row;
      console.log(`== ${strategy} (${n} campaigns): first run wave ${row.firstRun.wave} (p10 ${row.firstRun.waveP10}), ${row.firstRun.minutes} min, ${row.firstRun.gears} Gears; ` +
        `first unlock affordable after run 1 in ${Math.round(row.firstRun.firstUnlockAffordable * 100)}%; run 2: wave ${row.secondRun.wave}, ${row.secondRun.minutes} min`);
      console.table(row.unlocks);
    }
    fs.writeFileSync(outPath, JSON.stringify(out, null, 1));
  } else if (opt("meta", false)) {
    const strategy = opt("strategy", "skilled");
    const milestones = [10, 20, 30, 40, 50, 60];
    const campaigns = [];
    const seeds = +opt("campaigns", 5);
    for (let s = 1; s <= seeds; s++) {
      campaigns.push(metaCampaign(strategy, s, +opt("max-runs", 150), milestones, !!opt("prestige", false)));
      process.stderr.write(`campaign ${s}/${seeds} done\n`);
    }
    fs.writeFileSync(outPath, JSON.stringify({ meta: META, strategy, campaigns }, null, 1));
    for (const c of campaigns) console.log(c.seed, JSON.stringify(c.reached), "last:", JSON.stringify(c.history[c.history.length - 1]));
  } else {
    let names = opt("strategies", "all") === "all" ? Object.keys(STRATEGIES) : String(opt("strategies")).split(",");
    if (opt("favor", false)) {
      // Dominance check: one strategy per card that always grabs that card when offered.
      const { LST } = loadGame(1);
      names = ["skilled"];
      for (const c of LST.CARDS) { STRATEGIES["favor:" + c.id] = focus([c.id]); names.push("favor:" + c.id); }
    }
    const results = [];
    for (const name of names) {
      for (let seed = 1; seed <= RUNS; seed++) results.push(playRun(name, seed));
      process.stderr.write(`${name} done\n`);
    }
    const summary = summarize(results);
    fs.writeFileSync(outPath, JSON.stringify({ overrides: OVERRIDES, summary, results }, null, 0));
    console.table(Object.fromEntries(Object.entries(summary).map(([k, v]) => [k, { median: v.deathWave.median, p25: v.deathWave.p25, p75: v.deathWave.p75, min: v.deathWave.min, max: v.deathWave.max, minutes: v.minutes.median }])));
  }
  process.stderr.write(`took ${((Date.now() - t0) / 1000).toFixed(1)}s -> ${outPath}\n`);
}

module.exports = { playRun, metaCampaign, unlockCampaign, STRATEGIES };
