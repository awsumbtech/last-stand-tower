// World 1, the Backyard: exactly the game as it was before worlds existed. Classic waves
// (src/waves.js via ClassicWaveDirector), King Mole at wave 20, x1 everything, the theme's lawn.
LST.WorldRegistry.register(new LST.WorldDefinition({
  id: "backyard", name: "Backyard", order: 1,
  scaling: { hp: 1, damage: 1, gears: 1, coins: 1 },
  plan: null,
  enemies: ["basic", "fast", "tank"], miniBoss: "boss",
  finale: {
    boss: "mole",
    create(mult, game) {
      const m = new LST.KingMole(mult);
      if (game.renderer.halfW > game.renderer.halfH * 1.15) { m.x = -m.y; m.y = 0; } // landscape: from the side
      return m;
    },
    arrive(game, m) { game.onMoleRise(m); LST.audio.play("boss"); },
  },
  art: { background: null, card: "assets/sprites/world2/cards/card_backyard.png" },
  unlock: null,
  copy: {
    finaleSub: "King Mole rises!",
    clearedTitle: "Backyard cleared!", clearedSub: "King Mole has been sent back underground.",
    next: "Next world: <b>the Beach</b> is open! Pick it on the start screen.",
  },
  best: "legacy", headStartBeforeClear: true,
}));
