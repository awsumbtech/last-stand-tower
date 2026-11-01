// TowerAura: soft motes drifting up from the tower. Its strength follows "tower power":
// cards taken this run (weighted by rarity) plus a little for permanent Workshop levels,
// so a stronger tower visibly glows more. Crossing a tier queues a tier-up moment, which
// the director plays when the next wave starts (the shop panel hides the tower).
//
// Trap cards count like normal cards of their rarity on purpose: the aura must not give
// a trap away before its "Gotcha!" reveal.

LST.TowerAura = class TowerAura {
  constructor(preset) {
    this.preset = preset;
    this.stream = new LST.Emitter.Stream(preset);
    this.runPower = 0;
    this.metaPower = 0;
    this.tier = 0;
    this.announcedTier = 0;
  }

  static rarityWeight(card) { return card && card.rarity === "epic" ? 3 : card && card.rarity === "rare" ? 2 : 1; }

  // levels: { cardId: timesTaken } (game.upgradeLevels)
  setRunLevels(levels) {
    let p = 0;
    for (const id in levels) {
      const n = levels[id] || 0;
      if (!n) continue;
      const card = LST.cardById ? LST.cardById(id) : null;
      p += n * LST.TowerAura.rarityWeight(card);
    }
    this.runPower = p;
    this.refresh();
  }

  // Permanent Workshop levels add a small base glow (long-journey progress shows too).
  setMetaLevels(upgrades) {
    let n = 0;
    for (const id in upgrades || {}) n += upgrades[id] || 0;
    this.metaPower = Math.min(6, n * 0.35);
    this.refresh();
  }

  get power() { return this.runPower + this.metaPower; }
  get intensity() { return Math.min(1, this.power / this.preset.maxPower); }

  refresh() {
    const t = this.preset.tierPower;
    let tier = 0;
    while (tier < t.length && this.power >= t[tier]) tier++;
    this.tier = tier;
  }

  // Run start: take the current tier as the baseline, no announcement.
  resetBaseline() { this.announcedTier = this.tier; this.stream.acc = 0; }

  // True once when the tier went up since the last announcement.
  takeTierUp() {
    if (this.tier > this.announcedTier) { this.announcedTier = this.tier; return true; }
    if (this.tier < this.announcedTier) this.announcedTier = this.tier;
    return false;
  }

  update(dt, tower, pool, rng, scale) {
    const P = this.preset;
    const k = this.intensity;
    if (this.power <= 0 || !tower) return;
    const rate = (P.rate[0] + (P.rate[1] - P.rate[0]) * k) * scale;
    const n = this.stream.take(dt, rate);
    if (!n) return;
    const colors = P.colorsByTier[Math.min(P.colorsByTier.length - 1, this.tier)];
    const R = tower.radius;
    for (let j = 0; j < n; j++) {
      const i = pool.spawn(false);
      if (i < 0) return;
      const a = rng.next() * Math.PI * 2;
      const d = R * rng.range(P.spawnRadius[0], P.spawnRadius[1]);
      const out = rng.range(P.speed[0], P.speed[1]);
      pool.set(i, tower.x + Math.cos(a) * d, tower.y + Math.sin(a) * d * 0.7,
        Math.cos(a) * out * 0.5, -rng.range(P.rise[0], P.rise[1]) - out * 0.3,
        rng.range(P.life[0], P.life[1]), rng.range(P.size[0], P.size[1]) * (1 + 0.6 * k),
        LST.FX_SHAPE.SOFT, pool.colorId(rng.pick(colors)), P.drag, P.gravity, 0, 0);
    }
  }
};
