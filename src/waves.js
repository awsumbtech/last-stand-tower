// Builds the list of enemies for a wave and how they scale.

LST.waves = {
  // Stat multipliers for a given wave number (1-based).
  multipliers(wave) {
    const w = LST.CONFIG.waves;
    const n = wave - 1;
    return {
      hp: Math.pow(1 + w.hpGrowth, n),
      speed: Math.min(w.maxSpeedMult, 1 + w.speedGrowth * n),
      damage: 1 + 0.06 * n,
      coins: 1 + 0.05 * n,
    };
  },

  // Returns { queue: [types...], interval } for a wave.
  build(wave) {
    const w = LST.CONFIG.waves;
    const count = w.baseCount + w.countPerWave * (wave - 1);

    // Unlock enemy types gradually: fast from wave 2, tanks from wave 3.
    const weights = [["basic", 6]];
    if (wave >= 2) weights.push(["fast", Math.min(5, 1 + wave * 0.5)]);
    if (wave >= 3) weights.push(["tank", Math.min(4, 0.5 + wave * 0.3)]);

    const queue = [];
    for (let i = 0; i < count; i++) queue.push(LST.utils.pick(weights));
    if (wave % w.bossEvery === 0) {
      // Bosses arrive roughly in the middle of the wave.
      const bosses = Math.floor(wave / w.bossEvery);
      for (let b = 0; b < bosses; b++) {
        queue.splice(Math.floor(queue.length / 2) + b, 0, "boss");
      }
    }

    const interval = Math.max(w.minSpawnInterval, w.baseSpawnInterval * Math.pow(0.93, wave - 1));
    return { queue, interval };
  },

  clearBonus(wave) {
    const w = LST.CONFIG.waves;
    return w.clearBonusBase + w.clearBonusPerWave * wave;
  },
};
