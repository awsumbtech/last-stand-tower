// Preload for old sim.js versions (before StrategyRandom): seeds the host Math.random with the
// same mulberry32 sequence (seed 987654321) so their strategy dice match. Used by tools/sim-ab.sh.
let a = 987654321 >>> 0;
Math.random = function () { a |= 0; a = (a + 0x6d2b79f5) | 0; let t = Math.imul(a ^ (a >>> 15), 1 | a); t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t; return ((t ^ (t >>> 14)) >>> 0) / 4294967296; };
