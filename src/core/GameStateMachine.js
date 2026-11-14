// GameStateMachine: owns the run-flow state objects and which one is current. is(id) asks
// which state is on and set(id) enters one. (Game keeps a compat getter/setter over it until
// PR 9; state classes use the machine directly.) States register themselves
// (LST.GameStateMachine.register) when their file loads.
// update(game, dt) is the per-frame step: the run clock, then the current state's own update.
LST.GameStateMachine = class GameStateMachine {
  static register(cls) { (this.types || (this.types = {}))[cls.id] = cls; return cls; }
  constructor() {
    this.states = {};
    for (const [id, Cls] of Object.entries(LST.GameStateMachine.types || {})) this.states[id] = new Cls();
    this.current = null;
  }
  get id() { return this.current ? this.current.id : undefined; }
  has(id) { return !!this.states[id]; }
  is(id) { return !!this.current && this.current.id === id; }
  get(id) { return this.states[id] || null; }
  set(id) {
    const s = this.states[id];
    if (!s) throw new Error("GameStateMachine: unknown state " + id);
    this.current = s;
  }
  update(game, dt) {
    const s = this.current;
    if (!s) return;
    if (s.runClock) game.runTime += dt;
    s.update(game, dt);
  }
};
