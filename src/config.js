// Global namespace for the game. Each file adds its piece to LST.
window.LST = window.LST || {};

// All tunable numbers live here so balancing is easy.
// Distances are in "world units": the shorter side of the screen is always
// WORLD_SIZE units, so the game plays the same on phones and monitors.
LST.CONFIG = {
  WORLD_SIZE: 800,
  WORLD_SIZE_PORTRAIT: 620, // tall phone screens zoom in a bit so things aren't tiny
  MAX_SPAWN_DIST: 520,      // enemies never spawn further than this from the tower (keeps waves short)
  MAX_DT: 0.05, // clamp frame time (seconds) so tab switches don't teleport enemies

  tower: {
    radius: 26,
    maxHp: 100,
    damage: 12,
    fireRate: 2, // shots per second
    range: 220,
    projectileSpeed: 620,
    targets: 1, // multishot: how many enemies are targeted per volley
    critChance: 0.1, // chance a shot deals critMult damage
    critMult: 2,
    // Card-granted extras (all start at zero):
    pierce: 0,    // extra enemies a shot passes through
    slow: 0,      // fraction of speed removed on hit (for slowTime seconds)
    slowTime: 1.2,
    splash: 0,    // fraction of damage dealt to enemies near the impact
    splashRadius: 0,
    regen: 0,     // fraction of max HP restored per second during waves
    lifesteal: 0, // fraction of max HP restored per kill
  },

  // Enemy archetypes. hp/damage/coins are scaled per wave in waves.js.
  enemies: {
    basic: { hp: 20, speed: 62, damage: 6, coins: 2, score: 10, radius: 12, color: "#ff2bd6", shape: "circle" },
    fast:  { hp: 10, speed: 115, damage: 4, coins: 2, score: 12, radius: 9, color: "#ffd93d", shape: "triangle" },
    tank:  { hp: 75, speed: 30, damage: 15, coins: 6, score: 30, radius: 18, color: "#ff8a3d", shape: "square" },
    boss:  { hp: 250, speed: 17, damage: 28, coins: 40, score: 250, radius: 30, color: "#ff4d6d", shape: "hexagon" },
  },

  waves: {
    baseCount: 6,        // enemies in wave 1
    countPerWave: 2,     // extra enemies each wave...
    maxCount: 36,        // ...up to this many (plus the boss); HP keeps scaling after that
    hpGrowth: 0.25,      // +25% enemy HP per wave (compounding) until hpKnee...
    hpKnee: 30,
    hpGrowthLate: 0.12,  // ...then +12% per wave
    damageGrowth: 0.05,  // +5% enemy contact damage per wave (linear)
    coinGrowth: 0.05,    // +5% coins per kill per wave (linear)
    speedGrowth: 0.02,   // +2% enemy speed per wave (capped)
    maxSpeedMult: 1.6,
    baseSpawnInterval: 0.7,
    minSpawnInterval: 0.18,
    maxSpawnSpan: 8,     // a whole wave spawns within this many seconds
    bossEvery: 5,        // one boss joins every Nth wave
    clearBonusBase: 12,  // coins for clearing a wave
    clearBonusPerWave: 4,
  },

  // Between-wave shop: pick 1 of 3 cards for free, then spend coins on extras.
  // Coin prices scale with the wave: round(base * growth^(wave-1)) * step^(times used this shop).
  shop: {
    cards: 3,
    rarityWeights: { common: 60, rare: 30, epic: 10 },
    extraCard: { base: 10, growth: 1.17, step: 2 },   // buy one of the other cards after the free pick
    reroll:    { base: 6,  growth: 1.09, step: 2 },   // re-deal the cards you haven't taken
    repair:    { base: 10, growth: 1.09, step: 1.5, heal: 0.4 }, // heal 40% of max HP
  },

  // Trap ("gotcha") cards, src/traps.js.
  traps: {
    fromWave: 4,   // traps can be dealt after this wave...
    chance: 0.2,   // ...in 20% of deals, at most one per deal
    returnWaves: 1, // Appraisal L3: a trap can be returned within this many waves
  },

  // Lasting progression between runs (src/meta.js).
  meta: {
    // Gears per run = floor((perWave * wave^waveExp + perBoss * boss waves cleared) * worldMult * (1 + cogBonus * Cogs))
    gears: { perWave: 2, waveExp: 1.3, perBoss: 3, cogBonus: 0.1 },
    // Until Multishot is unlocked (normally just the first run), enemy HP grows
    // gentler for the first `untilWave` waves so a commons-only tower doesn't hit a wall at wave 10.
    starterAssist: { untilWave: 10, hpGrowth: 0.2 },
    // Lasting Workshop upgrades: level n+1 costs round(base * growth^n) Gears.
    upgrades: {
      power:     { base: 12, growth: 1.15, max: 60, per: 0.05 }, // +5% damage
      rapid:     { base: 12, growth: 1.17, max: 30, per: 0.03 }, // +3% fire rate
      armor:     { base: 14, growth: 1.2,  max: 35, keep: 0.97, cap: 0.65 }, // damage taken x0.97 per level (max 65% reduced)
      bank:      { base: 15, growth: 1.3,  max: 15, per: 15 },   // +15 starting coins
      greed:     { base: 20, growth: 1.22, max: 25, per: 0.04 }, // +4% coins per kill
      sharpEye:  { base: 25, growth: 1.25, max: 15, per: 0.01 }, // +1% crit chance
      headStart: { base: 30, growth: 1.4,  max: 10, per: 5 },    // start 5 waves later per level...
      appraisal: { costs: [40, 120, 300], max: 3 },               // reads trap cards (see src/traps.js)
    },
    headStartCap: 0.7, // ...but never past 70% of your best wave (rounded down to a multiple of 5)
    benchMax: 2,       // cards you can keep out of the shop
  },
};
