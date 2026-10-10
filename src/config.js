// Global namespace for the game. Each file adds its piece to LST.
window.LST = window.LST || {};

// All tunable numbers live here so balancing is easy.
// Distances are in "world units": the shorter side of the screen is always
// WORLD_SIZE units, so the game plays the same on phones and monitors.
LST.CONFIG = {
  WORLD_SIZE: 800,
  WORLD_SIZE_PORTRAIT: 620, // tall phone screens zoom in a bit so things aren't tiny
  MAX_SPAWN_DIST: 650,      // on very tall screens, enemies fade in this far from the tower
  MAX_DT: 0.05, // clamp frame time (seconds) so tab switches don't teleport enemies

  tower: {
    radius: 26,
    maxHp: 100,
    damage: 12,
    fireRate: 2, // shots per second
    range: 220,
    projectileSpeed: 620,
    targets: 1, // multishot: how many enemies are targeted per volley
  },

  // Enemy archetypes. hp/damage/coins are scaled per wave in waves.js.
  enemies: {
    basic: { hp: 20, speed: 55, damage: 6, coins: 2, score: 10, radius: 12, color: "#ff2bd6", shape: "circle" },
    fast:  { hp: 10, speed: 105, damage: 4, coins: 2, score: 12, radius: 9, color: "#ffd93d", shape: "triangle" },
    tank:  { hp: 75, speed: 26, damage: 15, coins: 6, score: 30, radius: 18, color: "#ff8a3d", shape: "square" },
    boss:  { hp: 450, speed: 20, damage: 45, coins: 40, score: 250, radius: 30, color: "#ff4d6d", shape: "hexagon" },
  },

  waves: {
    baseCount: 8,        // enemies in wave 1
    countPerWave: 3,     // extra enemies each wave
    hpGrowth: 0.15,      // +15% enemy HP per wave (compounding)
    speedGrowth: 0.02,   // +2% enemy speed per wave (capped)
    maxSpeedMult: 1.6,
    baseSpawnInterval: 0.9,
    minSpawnInterval: 0.18,
    bossEvery: 5,        // a boss joins every Nth wave
    clearBonusBase: 8,   // coins for clearing a wave
    clearBonusPerWave: 3,
  },
};
