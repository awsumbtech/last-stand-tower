#!/usr/bin/env node
// Headless balance simulator for Last Stand Tower.
//
// Loads the real game code (src/config.js, upgrades.js, entities.js, world.js,
// waves.js, game.js) into a Node VM with the browser bits stubbed out, then plays
// many seeded runs with scripted "player" strategies and records per-wave stats.
//
//   node tools/sim.js                         # all strategies, 40 seeds each
//   node tools/sim.js --runs 100 --strategies cheapest,greedy
//   node tools/sim.js --config tools/balance-proposal.json --out sim-proposal.json
//   node tools/sim.js --meta --config tools/balance-proposal.json   # meta-progression model
//
// Notes: the sim steps at a fixed 1/60 s, 1x speed, desktop view (1280x800),
// and skips hit-stop / slow-mo (a few seconds per run at most).
"use strict";
const fs = require("fs");
const path = require("path");
const vm = require("vm");

const ROOT = path.join(__dirname, "..");
const FILES = ["config.js", "utils.js", "upgrades.js", "entities.js", "world.js", "waves.js", "game.js"];
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
function loadGame(seed) {
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
  LST.UI = class { show() {} updateHud() {} renderUpgrades() {} };
  LST.audio = { play() {}, startMusic() {}, stopMusic() {}, duckMusic() {} };
  LST.haptics = { buzz() {} };

  // Balance overrides: { config: {...}, upgrades: { id: { base, growth, maxLevel, effect } }, waves: {...} }
  if (OVERRIDES.config) deepMerge(LST.CONFIG, OVERRIDES.config);
  if (OVERRIDES.upgrades) {
    for (const [id, o] of Object.entries(OVERRIDES.upgrades)) {
      const up = LST.UPGRADES.find((u) => u.id === id);
      if (!up) continue;
      if (o.base !== undefined || o.growth !== undefined) {
        const base = o.base, growth = o.growth;
        up.cost = (lvl) => Math.round(base * Math.pow(growth, lvl));
      }
      if (o.maxLevel !== undefined) up.maxLevel = o.maxLevel;
      if (o.effect !== undefined) {
        // effect: multiplier (damage/fireRate), flat amount (range/maxHp), heal fraction (repair)
        const e = o.effect;
        if (id === "damage") up.apply = (t) => { t.damage *= e; };
        if (id === "fireRate") up.apply = (t) => { t.fireRate *= e; };
        if (id === "range") up.apply = (t) => { t.range += e; };
        if (id === "maxHp") up.apply = (t) => { t.maxHp += e; t.hp = Math.min(t.maxHp, t.hp + e); };
        if (id === "repair") up.apply = (t) => { t.hp = Math.min(t.maxHp, t.hp + t.maxHp * e); };
      }
    }
  }
  // Wave-shape overrides (proposal knobs that are not plain CONFIG numbers):
  //   bossCount: "one"     -> exactly one boss per boss wave (instead of wave/5)
  //   bossHpMult           -> multiply boss HP (to compensate for a single boss)
  //   countCap             -> max non-boss enemies per wave
  //   spawnSpanCap         -> squeeze the spawn interval so a wave spawns within N seconds
  //   damageGrowth, coinGrowth -> per-wave linear growth of enemy damage / coin drops
  //   knee + hpGrowthLate  -> two-slope HP curve
  const W = OVERRIDES.waves || {};
  const origBuild = LST.waves.build.bind(LST.waves);
  LST.waves.build = (wave) => {
    const r = origBuild(wave);
    const bosses = r.queue.filter((t) => t === "boss");
    let rest = r.queue.filter((t) => t !== "boss");
    if (W.countCap) rest = rest.slice(0, W.countCap);
    const keep = W.bossCount === "one" ? bosses.slice(0, 1) : bosses;
    rest.splice(Math.floor(rest.length / 2), 0, ...keep);
    r.queue = rest;
    if (W.spawnSpanCap) r.interval = Math.min(r.interval, W.spawnSpanCap / r.queue.length);
    return r;
  };
  const origMult = LST.waves.multipliers.bind(LST.waves);
  LST.waves.multipliers = (wave) => {
    const m = origMult(wave);
    const n = wave - 1;
    if (W.damageGrowth !== undefined) m.damage = 1 + W.damageGrowth * n;
    if (W.coinGrowth !== undefined) m.coins = 1 + W.coinGrowth * n;
    if (W.hpGrowthLate !== undefined) {
      const g = LST.CONFIG.waves.hpGrowth, k = W.knee;
      m.hp = n <= k ? Math.pow(1 + g, n) : Math.pow(1 + g, k) * Math.pow(1 + W.hpGrowthLate, n - k);
    }
    return m;
  };
  if (W.bossHpMult) {
    const origSpawn = LST.World.prototype.spawnEnemy;
    LST.World.prototype.spawnEnemy = function (type, ...rest) {
      const e = origSpawn.call(this, type, ...rest);
      const last = this.enemies[this.enemies.length - 1];
      const boss = e && e.type === "boss" ? e : last && last.type === "boss" && type === "boss" ? last : null;
      if (boss && !boss._scaled) { boss._scaled = true; boss.hp *= W.bossHpMult; boss.maxHp *= W.bossHpMult; }
      return e;
    };
  }

  const renderer = VIEW;
  const game = new LST.Game(renderer);
  return { LST, game };
}

// ---------- Tower helpers ----------
const towerDps = (t) => t.damage * t.fireRate * t.targets * (1 + t.critChance * (t.critMult - 1));
const upgradeById = (LST, id) => LST.UPGRADES.find((u) => u.id === id);

function canBuy(LST, game, id) {
  const up = upgradeById(LST, id);
  const lvl = game.upgradeLevels[id] || 0;
  if (up.maxLevel !== undefined && lvl >= up.maxLevel) return null;
  if (up.canBuy && !up.canBuy(game.tower)) return null;
  return up.cost(lvl);
}

// Buy if affordable; returns true when something was bought.
function tryBuy(LST, game, id, stats) {
  const cost = canBuy(LST, game, id);
  if (cost === null || cost > game.coins) return false;
  const before = game.coins;
  game.buyUpgrade(id);
  if (game.coins === before) return false; // the game refused (wrong state etc.)
  stats.spent += cost;
  stats.bought[id] = (stats.bought[id] || 0) + 1;
  return true;
}

// ---------- Strategies: called once per shop visit ----------
const OFFENSE = ["damage", "fireRate", "multishot", "range"];
const STRATEGIES = {
  // Always buy the cheapest available upgrade (repair included when hurt).
  cheapest(LST, game, s) {
    for (let k = 0; k < 200; k++) {
      const opts = LST.UPGRADES.map((u) => [u.id, canBuy(LST, game, u.id)]).filter(([, c]) => c !== null).sort((a, b) => a[1] - b[1]);
      if (!opts.length || !tryBuy(LST, game, opts[0][0], s)) break;
    }
  },
  // Damage only (plus repair when below 40%).
  damage(LST, game, s) {
    if (game.tower.hp < game.tower.maxHp * 0.4) tryBuy(LST, game, "repair", s);
    while (tryBuy(LST, game, "damage", s));
  },
  // Fire rate until capped, then damage.
  fireRate(LST, game, s) {
    if (game.tower.hp < game.tower.maxHp * 0.4) tryBuy(LST, game, "repair", s);
    for (let k = 0; k < 100; k++) {
      if (canBuy(LST, game, "fireRate") !== null) { if (!tryBuy(LST, game, "fireRate", s)) break; }
      else if (!tryBuy(LST, game, "damage", s)) break;
    }
  },
  // Save for multishot first, then damage/fire rate cheapest-first.
  multishot(LST, game, s) {
    if (game.tower.hp < game.tower.maxHp * 0.4) tryBuy(LST, game, "repair", s);
    for (let k = 0; k < 100; k++) {
      const ms = canBuy(LST, game, "multishot");
      if (ms !== null) { if (!tryBuy(LST, game, "multishot", s)) break; continue; }
      const d = canBuy(LST, game, "damage"), f = canBuy(LST, game, "fireRate");
      const id = f !== null && f < d ? "fireRate" : "damage";
      if (!tryBuy(LST, game, id, s)) break;
    }
  },
  // Greedy: best DPS gain per coin; heals when low; buys HP if last wave hurt a lot.
  greedy(LST, game, s, last) {
    const t = game.tower;
    if (t.hp < t.maxHp * 0.5) tryBuy(LST, game, "repair", s);
    if (last && last.hpLost > t.maxHp * 0.3) tryBuy(LST, game, "maxHp", s);
    for (let k = 0; k < 100; k++) {
      const dps = towerDps(t);
      const value = {
        damage: dps * 0.25,
        fireRate: dps * 0.15,
        multishot: (dps / t.targets) * 0.7, // extra targets are not always available
        range: dps * (25 / t.range) * 0.6, // more time shooting each enemy
      };
      const opts = OFFENSE.map((id) => [id, canBuy(LST, game, id)]).filter(([, c]) => c !== null)
        .map(([id, c]) => [id, c, value[id] / c]).sort((a, b) => b[2] - a[2]);
      if (!opts.length) break;
      // Save up for the best one rather than wasting coins on worse value.
      if (!tryBuy(LST, game, opts[0][0], s)) break;
    }
  },
  // Cheapest, but never buys Repair.
  noRepair(LST, game, s) {
    for (let k = 0; k < 200; k++) {
      const opts = LST.UPGRADES.filter((u) => u.id !== "repair").map((u) => [u.id, canBuy(LST, game, u.id)]).filter(([, c]) => c !== null).sort((a, b) => a[1] - b[1]);
      if (!opts.length || !tryBuy(LST, game, opts[0][0], s)) break;
    }
  },
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
function playRun(strategyName, seed, meta) {
  const { LST, game } = loadGame(seed);
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
  const runStats = { spent: 0, bought: {} };
  let realSeconds = 0;
  let startWave = 0;
  if (meta) {
    startWave = applyMeta(LST, game, meta);
    if (startWave > 0) { // spend the head-start coins in a shop before the first wave
      game.state = "upgrade";
      strategy(LST, game, runStats, null);
      realSeconds += SHOP_SECONDS;
    }
  }
  let last = null;

  while (game.wave < MAX_WAVE) {
    game.startNextWave();
    const t = game.tower;
    const types = game.spawnQueue.slice();
    const mult = game.waveMult;
    const bossMult = (OVERRIDES.waves && OVERRIDES.waves.bossHpMult) || 1;
    const totalHp = types.reduce((s, ty) => s + LST.CONFIG.enemies[ty].hp * mult.hp * (ty === "boss" ? bossMult : 1), 0);
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
    bought: runStats.bought, bossKills, waves,
    finalDps: towerDps(game.tower),
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
  if (opt("meta", false)) {
    const strategy = opt("strategy", "greedy");
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
    const names = opt("strategies", "all") === "all" ? Object.keys(STRATEGIES) : String(opt("strategies")).split(",");
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

module.exports = { playRun, metaCampaign, STRATEGIES };
