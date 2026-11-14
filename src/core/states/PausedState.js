// PausedState ("paused"): nothing moves until togglePause resumes play.
LST.PausedState = LST.GameStateMachine.register(class PausedState extends LST.GameState {
  static get id() { return "paused"; }
});
