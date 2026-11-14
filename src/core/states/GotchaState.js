// GotchaState ("gotcha"): a trap card's reveal. Enter dismisses it.
LST.GotchaState = LST.GameStateMachine.register(class GotchaState extends LST.GameState {
  static get id() { return "gotcha"; }
  onKey(game, code) {
    if (code === "Enter") { game.dismissGotcha(); return true; }
    return false;
  }
});
