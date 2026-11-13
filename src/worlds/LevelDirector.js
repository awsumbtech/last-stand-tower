// LevelDirector: runs a world's LevelPlan (PROGRESSION section 4). Same interface as
// ClassicWaveDirector; the game never asks which one it has.
//   multipliers(w)  LST.waves' curve x the world's scaling (hp x H, damage x D, coins x C)
//   build(w)        crowd size from the classic curve x the beat's countMult, enemy ids drawn
//                   from the beat's mix, a gate's boss (+ escorts) in the middle of the queue
//   rareShop(w)     gates and supply waves deal a Rare+ slot in the next shop
LST.LevelDirector = class LevelDirector {
  constructor(world) { this.world = world; this.plan = world.plan; }
  get finaleWave() { return this.plan.finaleWave; }

  multipliers(wave) {
    const m = LST.waves.multipliers(wave), s = this.world.scaling;
    return { hp: m.hp * s.hp, speed: m.speed, damage: m.damage * s.damage, coins: m.coins * (s.coins || 1) };
  }

  beat(wave) { return this.plan.beat(wave); }
  isFinale(wave) { return wave === this.plan.finaleWave; }
  isBossWave(wave) { return !this.isFinale(wave) && this.plan.beat(wave).kind === "gate"; }
  rareShop(wave) { return !this.isFinale(wave) && this.plan.beat(wave).rareShop; }
  clearBonus(wave) { return LST.waves.clearBonus(wave); }
  bossWavesIn(skip) { let n = 0; for (let w = 1; w <= skip; w++) if (this.isBossWave(w) || this.isFinale(w)) n++; return n; }

  build(wave) {
    const W = LST.CONFIG.waves;
    if (this.isFinale(wave)) return { queue: [], interval: 1 }; // the finale boss arrives after the intro
    const b = this.plan.beat(wave);
    const base = Math.min(W.maxCount, W.baseCount + W.countPerWave * (wave - 1));
    const count = Math.max(1, Math.round(base * b.countMult));
    const weights = LST.LevelPlan.weights(b.mix, wave);
    const queue = [];
    for (let i = 0; i < count; i++) queue.push(LST.utils.pick(weights));
    if (b.kind === "gate" && b.boss) queue.splice(Math.floor(queue.length / 2), 0, ...b.escorts, b.boss);
    let interval = Math.max(W.minSpawnInterval, W.baseSpawnInterval * Math.pow(0.93, wave - 1));
    interval = Math.min(interval, (this.plan.spawnSpan || W.maxSpawnSpan) / queue.length);
    return { queue, interval };
  }
};
