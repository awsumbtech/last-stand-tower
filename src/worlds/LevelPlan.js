// LevelPlan: one world's 20-wave level as data (PROGRESSION section 1): acts, gates, supply
// waves and the finale, plus what Endless looks like after it. Knows nothing about spawning.
//   beat(wave) -> { wave, act, name, kind, countMult, mix, boss?, escorts?, rareShop }
//     kind: "normal" | "gate" (mini-boss wave) | "supply" (half count, rare+ shop after) | "finale"
//   mix: [[enemyId, weight], ...] where weight is a number or { from, base, per, max }
//        (0 before wave `from`, then min(max, base + per * wave)).
LST.LevelPlan = class LevelPlan {
  constructor({ id, finaleWave, acts, endless, spawnSpan }) {
    this.id = id;
    this.finaleWave = finaleWave;
    this.spawnSpan = spawnSpan || null; // seconds a whole wave spawns within (null = CONFIG.waves.maxSpawnSpan)
    this.acts = acts;           // [{ id, name, from, to, kind, countMult?, mix?, boss?, escorts?, rareShop? }]
    this.endless = endless;     // { every, gate: {...}, normal: {...} } for waves past the finale
  }

  act(wave) {
    for (const a of this.acts) if (wave >= a.from && wave <= a.to) return a;
    return null;
  }

  beat(wave) {
    let a = this.act(wave);
    if (!a) {
      const E = this.endless;
      a = wave % E.every === 0 ? E.gate : E.normal;
    }
    const kind = a.kind || "normal";
    return {
      wave, act: a.id, name: a.name, kind,
      countMult: a.countMult != null ? a.countMult : 1,
      mix: a.mix || [],
      boss: a.boss || null,
      escorts: a.escorts || [],
      rareShop: a.rareShop != null ? !!a.rareShop : kind === "gate" || kind === "supply",
    };
  }

  // [[id, weight], ...] for a beat, weights resolved for its wave, zero weights dropped.
  static weights(mix, wave) {
    const out = [];
    for (const [id, w] of mix) {
      const v = typeof w === "number" ? w : wave < (w.from || 0) ? 0 : Math.min(w.max != null ? w.max : Infinity, (w.base || 0) + (w.per || 0) * wave);
      if (v > 0) out.push([id, v]);
    }
    return out;
  }
};
