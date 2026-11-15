// PausedState ("paused"): nothing moves until resume() goes back to PlayingState.
LST.PausedState = LST.GameStateMachine.register(class PausedState extends LST.GameState {
  static get id() { return "paused"; }
  get sceneFlags() { return LST.SceneFlags.PAUSED; }
  get screen() { return "pause"; }
  get hudLive() { return true; }
  get runPaused() { return true; }
  closePauseMenu(game) { game.togglePause(); }
  togglePause(game) { this.resume(game); }
  resume(game) {
    game.flow.set("playing");
    game.flow.current.showScreen(game);
    LST.audio.duckMusic(false);
  }
});
