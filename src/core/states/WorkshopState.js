// WorkshopState ("workshop"): the between-runs card unlock screen. Enter starts a run
// (Escape / W close it: InputController, which checks the screen itself).
LST.WorkshopState = LST.GameStateMachine.register(class WorkshopState extends LST.GameState {
  static get id() { return "workshop"; }
  onKey(game, code) {
    if (code === "Enter") { game.newGame(); return true; }
    return false;
  }
});
