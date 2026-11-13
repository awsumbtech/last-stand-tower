// ClassicWaveDirector: the Backyard's wave source. It is LST.waves (src/waves.js) behind the
// director interface, call for call, so Backyard runs stay byte-identical in the seeded sims.
//   finaleWave, multipliers(w), build(w), isBossWave(w), isFinale(w), clearBonus(w),
//   rareShop(w), bossWavesIn(skip), beat(w)
LST.ClassicWaveDirector = class ClassicWaveDirector {
  constructor(world) { this.world = world; }
  get finaleWave() { return LST.CONFIG.finale.wave; }
  multipliers(wave) { return LST.waves.multipliers(wave); }
  build(wave) { return LST.waves.build(wave); }
  isBossWave(wave) { return LST.waves.isBossWave(wave); }
  isFinale(wave) { return LST.waves.isFinale(wave); }
  clearBonus(wave) { return LST.waves.clearBonus(wave); }
  rareShop(wave) { return wave % LST.CONFIG.waves.bossEvery === 0; }
  bossWavesIn(skip) { return Math.floor(skip / LST.CONFIG.waves.bossEvery); }
  beat() { return null; }
};
