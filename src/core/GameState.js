// GameState: base class for one state of a run's flow (menu, playing, shop, ...). The
// GameStateMachine holds one instance per id and calls update() once per frame.
//   id            the state's name; game.flow.is(id) / game.flow.set(id) use it
//   runClock      true while the run timer (game.runTime) counts
//   pausesWhenHidden  true when hiding the tab should pause (InputController)
//   update(game, dt)  this state's per-frame work (after hit-stop and effects)
//   onKey(game, code, ev)  a key for this state; return true when handled
//   allowsAbility     the active ability can be used (AbilitySystem)
//   allowsWorldPick   the world can be changed (WorkshopController.selectWorld)
//   sceneFlags        what render.js / FxDirector may show (SceneFlags)
//   togglePause(game) the pause key / button: PlayingState pauses, PausedState resumes
//   screen            the UI screen this state shows (UI.show key; null = none, just the HUD)
//   showScreen(game)  show that screen (the callers that enter a state call it)
//   hudLive           the HUD shows the ability button and boss bar (a run is on screen)
//   runPaused         the pause panel is the in-run Pause menu (else it is Settings)
//   closePauseMenu(game)  Resume / Done on that panel: PausedState resumes, GameOverState goes
//                     back to the results, every other state to the start screen
LST.GameState = class GameState {
  static get id() { return null; }
  get id() { return this.constructor.id; }
  get runClock() { return false; }
  get pausesWhenHidden() { return false; }
  get allowsAbility() { return false; }
  get allowsWorldPick() { return false; }
  get sceneFlags() { return LST.SceneFlags.NONE; }
  togglePause(game) {}
  get screen() { return null; }
  showScreen(game) { game.ui.show(this.screen); }
  get hudLive() { return false; }
  get runPaused() { return false; }
  closePauseMenu(game) { game.ui.show("start"); }
  update(game, dt) {}
  onKey(game, code, ev) { return false; }
};
