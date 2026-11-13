// VictoryState ("victory"): the finale boss is down. Confetti for victoryTimer, then the
// World cleared! screen.
LST.VictoryState = LST.GameStateMachine.register(class VictoryState extends LST.GameState {
  static get id() { return "victory"; }
  get runClock() { return true; }
  update(game, dt) {
    game.victoryTimer -= dt;
    if (Math.random() < dt * 6) game.spawnConfetti(LST.utils.rand(-200, 200), LST.utils.rand(-200, 100), 30);
    if (game.victoryTimer <= 0) { game.state = "cleared"; game.ui.show("cleared"); LST.audio.play("unlock"); }
  }
});
