// ClearedState ("cleared"): the World cleared! screen. Enter continues in endless mode.
LST.ClearedState = LST.GameStateMachine.register(class ClearedState extends LST.GameState {
  static get id() { return "cleared"; }
  onKey(game, code) {
    if (code === "Enter") { game.continueEndless(); return true; }
    return false;
  }
});
