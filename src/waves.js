// Builds the list of enemies for a wave and how they scale.

LST.waves = {
  // Stat multipliers for a given wave number (1-based).
  multipliers(wave) {
    const w = LST.CONFIG.waves;
    const n = wave - 1;
    const early = Math.min(n, w.hpKnee);
    const late = Math.max(0, n - w.hpKnee);
    let hp = Math.pow(1 + w.hpGrowth, early) * Math.pow(1 + w.hpGrowthLate, late);
    if (LST.meta && LST.meta.starterAssist()) {
      const a = LST.CONFIG.meta.starterAssist;
      const k = Math.min(n, a.untilWave);
      hp *= Math.pow((1 + a.hpGrowth) / (1 + w.hpGrowth), k);
    }
    return {
      hp,
      speed: Math.min(w.maxSpeedMult, 1 + w.speedGrowth * n),
      damage: 1 + w.damageGrowth * n,
      coins: 1 + w.coinGrowth * n,
    };
  },

  // Returns { queue: [types...], interval } for a wave.
  build(wave) {
    const w = LST.CONFIG.waves;
    const count = Math.min(w.maxCount, w.baseCount + w.countPerWave * (wave - 1));

    // Unlock enemy types gradually: fast from wave 2, tanks from wave 3.
    const weights = [["basic", 6]];
    if (wave >= 2) weights.push(["fast", Math.min(5, 1 + wave * 0.5)]);
    if (wave >= 3) weights.push(["tank", Math.min(4, 0.5 + wave * 0.3)]);

    const queue = [];
    for (let i = 0; i < count; i++) queue.push(LST.utils.pick(weights));
    // One boss every few waves, arriving in the middle of the wave.
    if (wave % w.bossEvery === 0) queue.splice(Math.floor(queue.length / 2), 0, "boss");

    let interval = Math.max(w.minSpawnInterval, w.baseSpawnInterval * Math.pow(0.93, wave - 1));
    interval = Math.min(interval, w.maxSpawnSpan / queue.length);
    return { queue, interval };
  },

  clearBonus(wave) {
    const w = LST.CONFIG.waves;
    return w.clearBonusBase + w.clearBonusPerWave * wave;
  },
};
