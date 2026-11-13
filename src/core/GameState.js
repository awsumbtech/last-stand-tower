// GameState: base class for one state of a run's flow (menu, playing, shop, ...). The
// GameStateMachine holds one instance per id and calls update() once per frame.
//   id            the state's name; game.state reads it (UI, render and tests compare it)
//   runClock      true while the run timer (game.runTime) counts
//   pausesWhenHidden  true when hiding the tab should pause (InputController)
//   update(game, dt)  this state's per-frame work (after hit-stop and effects)
//   onKey(game, code, ev)  a key for this state; return true when handled
LST.GameState = class GameState {
  static get id() { return null; }
  get id() { return this.constructor.id; }
  get runClock() { return false; }
  get pausesWhenHidden() { return false; }
  update(game, dt) {}
  onKey(game, code, ev) { return false; }
};
