// World 2, the Beach (ROADMAP Sprint 6, PROGRESSION section 1).
// H 2.5 / D 1.2 / G 1.6 (Gears x1.6). Unlocks when the Backyard's wave-20 finale is beaten.
// One 20-wave level in 4 acts:
//   1-4   Build-up    basics + Hermit Crabs from wave 2 (learn the shell)
//   5     Gate I      Big Red                              6  Supply (half count, Rare+ shop)
//   7-9   Rising      Seagulls join (fast flyers, slows don't work)
//   10    Gate II     Big Red + 2 crab escorts             11 Supply
//   12-14 Siege       denser waves (x1.1)
//   15    Gate III    Elite Big Red (shell shield phase) + 2 gull escorts   16 Supply
//   17-19 Last stand  peak pressure (x1.2)
//   20    Finale      Captain Crabclaw lobs coconuts, 2 phases + frenzy at 150 s
// Endless after the finale: last-stand mix, Elite Big Red every 5th wave.
(function () {
  // No Backyard tanks here: the Hermit Crab is the Beach's tough walker.
  const crowd = (extra) => [
    ["basic", 5],
    ["fast", { from: 3, base: 0.5, per: 0.3, max: 3 }],
    ["crab", { from: 2, base: 1.5, per: 0.3, max: 4.5 }],
    ...(extra || []),
  ];
  const gulls = ["gull", { from: 7, base: 0.5, per: 0.25, max: 4 }];
  const mix = { early: crowd(), late: crowd([gulls]) };

  LST.WorldRegistry.register(new LST.WorldDefinition({
    id: "beach", name: "Beach", order: 2,
    scaling: { hp: 2.5, damage: 1.2, gears: 1.6, coins: 1 },
    plan: new LST.LevelPlan({
      id: "beach", finaleWave: 20, spawnSpan: 4.5,
      acts: [
        { id: "buildup", name: "Build-up", from: 1, to: 4, mix: mix.early },
        { id: "gate1", name: "Gate I", from: 5, to: 5, kind: "gate", boss: "boss", mix: mix.early },
        { id: "supply1", name: "Supply", from: 6, to: 6, kind: "supply", countMult: 0.5, mix: mix.early },
        { id: "rising", name: "Rising", from: 7, to: 9, mix: mix.late },
        { id: "gate2", name: "Gate II", from: 10, to: 10, kind: "gate", boss: "boss", escorts: ["crab", "crab"], mix: mix.late },
        { id: "supply2", name: "Supply", from: 11, to: 11, kind: "supply", countMult: 0.5, mix: mix.late },
        { id: "siege", name: "Siege", from: 12, to: 14, countMult: 1.1, mix: mix.late },
        { id: "gate3", name: "Gate III", from: 15, to: 15, kind: "gate", boss: "bigRedElite", escorts: ["gull", "gull"], mix: mix.late },
        { id: "supply3", name: "Supply", from: 16, to: 16, kind: "supply", countMult: 0.5, mix: mix.late },
        { id: "laststand", name: "Last stand", from: 17, to: 19, countMult: 1.2, mix: mix.late },
        { id: "finale", name: "Finale", from: 20, to: 20, kind: "finale" },
      ],
      endless: {
        every: 5,
        gate: { id: "endlessGate", name: "Endless", kind: "gate", boss: "bigRedElite", escorts: ["gull", "crab"], countMult: 1.2, mix: mix.late },
        normal: { id: "endless", name: "Endless", countMult: 1.2, mix: mix.late },
      },
    }),
    enemies: ["crab", "gull"], miniBoss: "boss",
    finale: {
      boss: "crabclaw",
      create(mult, game) {
        const r = game.renderer, D = LST.CONFIG.MAX_SPAWN_DIST;
        // Walks in from the top edge (from the side on landscape screens).
        const side = r && r.halfW > r.halfH * 1.15;
        const edge = side ? Math.min(D, r.halfW + 60) : Math.min(D, (r && r.halfH ? r.halfH : D) + 60);
        return side ? new LST.CaptainCrabclaw(mult, -edge, 0) : new LST.CaptainCrabclaw(mult, 0, -edge);
      },
      arrive(game, b) { if (game.onCrabclawArrive) game.onCrabclawArrive(b); },
    },
    art: { background: "BeachGround", card: "assets/sprites/world2/cards/card_beach.png" },
    unlock: { cleared: "backyard" },
    copy: {
      finaleSub: "Captain Crabclaw drops anchor!",
      clearedTitle: "Beach cleared!", clearedSub: "Captain Crabclaw sails off, coconuts and all.",
      next: "Next world: <b>Snowy Peak</b> (coming soon). Keep going for more Gears!",
    },
  }));
})();
