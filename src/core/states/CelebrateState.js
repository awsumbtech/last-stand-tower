// CelebrateState ("celebrate"): the wave-clear party, then finishCelebration opens the shop.
LST.CelebrateState = LST.GameStateMachine.register(class CelebrateState extends LST.GameState {
  static get id() { return "celebrate"; }
  get runClock() { return true; }
  update(game, dt) {
    game.celebrateTimer -= dt;
    if (game.celebrateTimer <= 0) game.finishCelebration();
  }
});
