// AbilitySystem: the run's active ability (game.ability = { id, cd, max, flash }). It decides
// when the ability can be used (the current GameState's allowsAbility, and the cooldown), runs
// the cooldown, and hands the effect to the Ability subclass (src/abilities/*.js).
LST.AbilitySystem = class AbilitySystem {
  constructor(game) { this.game = game; }

  // A fresh, ready ability record for `id`.
  equip(id) { return { id, cd: 0, max: LST.CONFIG.abilities[id].cooldown, flash: 0 }; }

  ready() { return this.game.flow.current.allowsAbility && this.game.ability.cd <= 0; }

  use() {
    const g = this.game;
    if (!this.ready()) { if (g.flow.current.allowsAbility) LST.audio.play("deny"); return false; }
    const ab = g.ability, ability = LST.Ability.get(ab.id);
    ab.cd = ab.max = LST.CONFIG.abilities[ab.id].cooldown;
    ab.flash = 1;
    ability.activate(g);
    LST.audio.play(ab.id);
    LST.haptics.buzz([30, 30, 60]);
    g.ui.updateHud();
    return true;
  }

  tick(dt) {
    const ab = this.game.ability;
    ab.cd = Math.max(0, ab.cd - dt);
    ab.flash = Math.max(0, ab.flash - dt * 2);
  }
};
