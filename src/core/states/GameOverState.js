// GameOverState ("gameover"): the tower fell. After resultsDelay the results screen shows;
// then W opens the Workshop and Enter starts a new run.
LST.GameOverState = LST.GameStateMachine.register(class GameOverState extends LST.GameState {
  static get id() { return "gameover"; }
  update(game, dt) {
    if (game.resultsDelay > 0) {
      game.resultsDelay -= dt;
      if (game.resultsDelay <= 0) game.showResults();
    }
  }
  onKey(game, code) {
    if (game.resultsDelay) return false;
    if (code === "KeyW") { game.openWorkshop("results"); return true; }
    if (code === "Enter") { game.newGame(); return true; }
    return false;
  }
});
