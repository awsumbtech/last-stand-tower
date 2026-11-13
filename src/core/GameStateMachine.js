// GameStateMachine: owns the run-flow state objects and which one is current. game.state is
// a getter/setter over it, so `game.state = "upgrade"` enters ShopState and `game.state` reads
// "upgrade". States register themselves (LST.GameStateMachine.register) when their file loads.
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
