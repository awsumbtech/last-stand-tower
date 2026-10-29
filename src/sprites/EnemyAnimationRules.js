// EnemyAnimationRules: maps an enemy's simulation state to a clip on its sprite sheet.
// Pure lookup, no drawing. One rule per enemy type; add a type by adding a rule.
//   pick(e) -> { sheet, anim, finish?, codeMotion? } or null (= draw the vector art)
//   codeMotion: false means the frames already contain the movement, so the theme must
//   not add its own translate/squash on top (King Mole's rise, dig and slam).
LST.EnemyAnimationRules = class EnemyAnimationRules {
  constructor() {
    const walker = (sheet) => (e) => ({ sheet, anim: e.stun > 0 ? "idle" : "walk" });
    this.rules = {
      basic: walker("basic"),
      fast: walker("fast"),
      tank: walker("tank"),
      // Big Red: walk in, wind up (0.8 s clip = the code's 0.8 s telegraph), slam, charge.
      // He has no idle row, so standing at range keeps the walk shuffle.
      boss: (e) => {
        if (e.charging) return { sheet: "big_red", anim: "charge" };
        if (e.windup > 0) return { sheet: "big_red", anim: "slam_windup" };
        if (e.slamAnim > 0) return { sheet: "big_red", anim: "slam", finish: true };
        return { sheet: "big_red", anim: "walk" };
      },
      // King Mole: the angry sheet from phase 2 on (falls back to the base sheet).
      // Underground he keeps the vector dirt mound (no travel animation exists).
      // Phase-change dig lasts 0.9 s: phase_change for the first 0.4 s, then the 0.5 s dig.
      mole: (e) => {
        const sheet = e.phase > 0 ? ["king_mole_angry", "king_mole"] : "king_mole";
        if (e.mode === "under") return null;
        // Timed from e.timer so the frames match the code exactly (the first rise waits
        // 0.35 s in an empty hole, like the vector version).
        const T = Math.max(0, e.timer);
        if (e.mode === "rise") return { sheet, anim: "rise", time: Math.max(0, 0.55 - T), codeMotion: false };
        if (e.mode === "dig") {
          return T > 0.5 ? { sheet, anim: "phase_change", time: 0.9 - T, codeMotion: false }
            : { sheet, anim: "dig", time: 0.5 - T, codeMotion: false };
        }
        if (e.slamAnim > 0) return { sheet, anim: "slam", finish: true, codeMotion: false };
        return { sheet, anim: "idle", codeMotion: true };
      },
    };
    // Death clips, played by a Corpse after the enemy is gone.
    this.deathSheet = { basic: "basic", fast: "fast", tank: "tank", boss: "big_red", mole: ["king_mole_angry", "king_mole"] };
  }

  pick(e) {
    const rule = this.rules[e.type];
    return rule ? rule(e) : null;
  }

  death(e) {
    const sheet = this.deathSheet[e.type];
    if (!sheet) return null;
    // Only King Mole has an angry variant, and he only dies angry (phase 3).
    return { sheet: e.type === "mole" && !(e.phase > 0) ? "king_mole" : sheet, anim: "death" };
  }
};
