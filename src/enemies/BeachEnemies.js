// The Beach's enemy archetypes (ROADMAP Sprint 6). Data only: stats + parts.
//   crab        Hermit Crab: a shell soaks hits, breaks, regrows once after 3 s (ShellShield)
//   gull        Seagull: fast flyer, slows and freezes don't land (Flyer)
//   bigRedElite Elite Big Red for Gate III: Big Red with a one-regrow shield phase (ShellShield)
// Captain Crabclaw (the wave-20 boss) is its own BossScript in src/bosses/CaptainCrabclaw.js.
(function () {
  const R = LST.EnemyRegistry, A = LST.EnemyArchetype;
  R.register(new A({
    id: "crab",
    stats: { hp: 24, speed: 64, damage: 8, coins: 4, score: 18, radius: 13, color: "#ff7a59", shape: "crab" },
    parts: [[LST.ShellShield, { share: 0.7, regrowDelay: 3, regrows: 1 }]],
  }));
  R.register(new A({
    id: "gull",
    stats: { hp: 11, speed: 128, damage: 5, coins: 3, score: 14, radius: 10, color: "#f4f7fb", shape: "gull" },
    parts: [[LST.Flyer, {}]],
  }));
  R.register(new A({
    id: "bigRedElite", base: "boss",
    parts: [[LST.ShellShield, { share: 0.25, regrowDelay: 6, regrows: 1 }]],
  }));
})();
