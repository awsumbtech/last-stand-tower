// EnemyAnimationRules: maps an enemy's simulation state to a clip on its sprite rig.
// Pure lookup, no drawing. One rule per enemy type; add a type by adding a rule.
//
//   pick(e)  -> { rig, anim, finish?, time?, codeMotion? } or null (= draw the vector art)
//   death(e) -> { rig, anim } for the Corpse
//   rigs[name] = list of layer sets to try in order; a layer set is drawn bottom-up,
//                [{ sheet, rotates? }]. The first set whose sheets are all loaded wins.
//
//   codeMotion: false means the frames already contain the movement, so the theme must
//   not add its own translate/squash on top (King Mole's rise, dig and slam).
LST.EnemyAnimationRules = class EnemyAnimationRules {
  constructor() {
    this.rigs = {
      basic: [[{ sheet: "basic" }]],
      // Fast: the dart turns toward the tower, the face stays upright on top.
      // The merged sheet (no rotation) is the fallback.
      fast: [[{ sheet: "fast_body", rotates: true }, { sheet: "fast_face" }], [{ sheet: "fast" }]],
      tank: [[{ sheet: "tank" }]],
      big_red: [[{ sheet: "big_red" }]],
      king_mole: [[{ sheet: "king_mole" }]],
      king_mole_angry: [[{ sheet: "king_mole_angry" }], [{ sheet: "king_mole" }]],
    };
    const walker = (rig) => (e) => ({ rig, anim: e.stun > 0 ? "idle" : "walk" });
    this.rules = {
      basic: walker("basic"),
      fast: walker("fast"),
      tank: walker("tank"),
      // Big Red: walk in, wind up (0.8 s clip = the code's 0.8 s telegraph), slam, charge.
      // He has no idle row, so standing at range keeps the walk shuffle.
      boss: (e) => {
        if (e.charging) return { rig: "big_red", anim: "charge" };
        if (e.windup > 0) return { rig: "big_red", anim: "slam_windup" };
        if (e.slamAnim > 0) return { rig: "big_red", anim: "slam", finish: true };
        return { rig: "big_red", anim: "walk" };
      },
      // King Mole: the angry sheet from phase 2 on. Rise/dig are timed from e.timer so the
      // frames match the code exactly (the first rise waits 0.35 s in an empty hole, like
      // the vector version). Phase-change dig lasts 0.9 s: phase_change for the first
      // 0.4 s, then the 0.5 s dig.
      mole: (e) => {
        const rig = e.phase > 0 ? "king_mole_angry" : "king_mole";
        const T = Math.max(0, e.timer);
        if (e.mode === "under") return { rig, anim: "underground_travel", codeMotion: false };
        if (e.mode === "rise") return { rig, anim: "rise", time: Math.max(0, 0.55 - T), codeMotion: false };
        if (e.mode === "dig") {
          return T > 0.5 ? { rig, anim: "phase_change", time: 0.9 - T, codeMotion: false }
            : { rig, anim: "dig", time: 0.5 - T, codeMotion: false };
        }
        if (e.slamAnim > 0) return { rig, anim: "slam", finish: true, codeMotion: false };
        return { rig, anim: "idle", codeMotion: true };
      },
    };
    this.deathRig = { basic: "basic", fast: "fast", tank: "tank", boss: "big_red" };
  }

  pick(e) {
    const rule = this.rules[e.type];
    return rule ? rule(e) : null;
  }

  death(e) {
    if (e.type === "mole") return { rig: e.phase > 0 ? "king_mole_angry" : "king_mole", anim: "death" };
    const rig = this.deathRig[e.type];
    return rig ? { rig, anim: "death" } : null;
  }
};
