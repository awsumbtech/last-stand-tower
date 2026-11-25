// CelebrateState ("celebrate"): the wave-clear party, then finishCelebration opens the shop.
// A tap (InputController) skips the rest of the timer. skipHint is canvas text ("Tap to skip").
LST.CelebrateState = LST.GameStateMachine.register(class CelebrateState extends LST.GameState {
  static get id() { return "celebrate"; }
  get runClock() { return true; }
  get sceneFlags() { return LST.SceneFlags.CELEBRATE; }
  skipWait(game) {
    if (game.celebrateTimer <= 0) return false;
    game.celebrateTimer = 0;
    game.skipHint = false;
    game.finishCelebration();
    return true;
  }
  update(game, dt) {
    game.skipHint = game.celebrateTimer > 0;
    game.celebrateTimer -= dt;
    if (game.celebrateTimer <= 0) { game.skipHint = false; game.finishCelebration(); }
  }
});
