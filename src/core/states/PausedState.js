// PausedState ("paused"): nothing moves until resume() goes back to PlayingState.
LST.PausedState = LST.GameStateMachine.register(class PausedState extends LST.GameState {
  static get id() { return "paused"; }
  get sceneFlags() { return LST.SceneFlags.PAUSED; }
  togglePause(game) { this.resume(game); }
  resume(game) {
    game.flow.set("playing");
    game.ui.show(null);
    LST.audio.duckMusic(false);
  }
});
