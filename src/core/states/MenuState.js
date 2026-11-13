// MenuState ("menu"): the start screen. W opens the Workshop, Enter starts a run.
LST.MenuState = LST.GameStateMachine.register(class MenuState extends LST.GameState {
  static get id() { return "menu"; }
  onKey(game, code) {
    if (code === "KeyW") { game.openWorkshop("start"); return true; }
    if (code === "Enter") { game.newGame(); return true; }
    return false;
  }
});
