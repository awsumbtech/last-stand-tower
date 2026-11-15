// WorkshopController: the between-runs screens. World pick (only where the current GameState
// allowsWorldPick: menu and Workshop), the Workshop (WorkshopState, or over the results in
// GameOverState), its purchases (upgrades, abilities, card unlocks, bench), progress reset,
// and going back to the menu (MenuState).
LST.WorkshopController = class WorkshopController {
  constructor(game) { this.game = game; }

  // Start screen pick. Returns false for a locked world.
  selectWorld(id) {
    const g = this.game;
    if (!g.flow.current.allowsWorldPick) return false;
    const w = LST.WorldRegistry.select(id);
    if (!w) return false;
    if (w !== g.world) g.useWorld(w);
    return true;
  }

  open(from = "start") {
    const g = this.game;
    if (g.flow.is("gameover") && g.resultsDelay > 0) return;
    g.workshopFrom = from;
    if (!g.flow.is("gameover")) g.flow.set("workshop");
    LST.meta.state.seenWorkshop = true;
    LST.meta.state.armorNotice = false;
    LST.meta.save();
    g.ui.show("workshop");
  }

  close() {
    const g = this.game;
    if (g.workshopFrom === "results" && g.flow.is("gameover")) g.flow.current.showScreen(g); // the results
    else { g.flow.set("menu"); g.flow.current.showScreen(g); }
  }

  buyUpgrade(id) {
    const g = this.game;
    if (!LST.meta.buyUpgrade(id)) { LST.audio.play("deny"); return false; }
    LST.audio.play("upgrade", { pitch: 1 + Math.min(0.6, LST.meta.level(id) * 0.02) });
    LST.haptics.buzz(20);
    g.ui.renderWorkshop({ bought: id });
    g.events.emit(LST.EVENTS.WORKSHOP_UPGRADE, { id, level: LST.meta.level(id) });
    return true;
  }

  // Equip an ability, or unlock it with Gears.
  pickAbility(id) {
    const g = this.game, m = LST.meta;
    if (m.abilityUnlocked(id)) {
      if (m.state.ability === id) return true;
      m.equipAbility(id);
      LST.audio.play("bench");
    } else {
      if (!m.unlockAbility(id)) { LST.audio.play("deny"); return false; }
      LST.audio.play("unlock");
      LST.haptics.buzz([20, 40, 60]);
      g.events.emit(LST.EVENTS.UNLOCK, { kind: "ability", id });
    }
    g.ability = g.abilitySystem.equip(id);
    g.ui.renderWorkshop({ ability: id });
    return true;
  }

  toggleBench(id) {
    if (!LST.meta.toggleBench(id)) { LST.audio.play("deny"); return false; }
    LST.audio.play(LST.meta.isBenched(id) ? "bench" : "unbench");
    this.game.ui.renderWorkshop({ benched: id });
    return true;
  }

  resetProgress() {
    const g = this.game;
    LST.meta.resetAll();
    g.useWorld(LST.WorldRegistry.selected());
    g.bestWave = 0;
    this.toMenu();
  }

  unlockCard(id) {
    const g = this.game;
    if (!LST.meta.unlock(id)) { LST.audio.play("deny"); return false; }
    LST.audio.play("unlock");
    LST.haptics.buzz([20, 40, 60]);
    g.ui.renderWorkshop({ unlocked: id });
    g.events.emit(LST.EVENTS.UNLOCK, { kind: "card", id });
    return true;
  }

  toMenu() {
    const g = this.game;
    if (g.devRun) { LST.DevRunGuard.end(); g.devRun = false; } // quit mid door run: put the save back
    g.reset();
    g.flow.set("menu");
    g.flow.current.showScreen(g);
    LST.audio.duckMusic(false);
    LST.audio.startMusic();
  }
};
