// InputController: keyboard shortcuts and auto-pause on a hidden tab. Keys every state shares
// live here; keys for one state live on that state (GameState.onKey). Order matters and
// matches the old main.js chain: Workshop close, pause, the current state's keys, then speed,
// ability and music.
LST.InputController = class InputController {
  constructor(game, { doc, settings, isWorkshopOpen } = {}) {
    this.game = game;
    this.doc = doc || null;
    this.settings = settings || LST.settings;
    this.isWorkshopOpen = isWorkshopOpen || (() => !!this.doc && !this.doc.getElementById("screen-workshop").classList.contains("hidden"));
    this.onKeyDown = (e) => this.keyDown(e);
    this.onPointerDown = (e) => this.pointerDown(e);
    this.onVisibility = () => this.visibilityChanged(!!(this.doc && this.doc.hidden));
    this.skipGuard = new LST.SkipClickGuard();
  }
  attach(win) {
    win.addEventListener("keydown", this.onKeyDown);
    win.addEventListener("pointerdown", this.onPointerDown);
    this.skipGuard.attach(win);
    if (this.doc) this.doc.addEventListener("visibilitychange", this.onVisibility);
    return this;
  }
  // Skip an unskippable wait on a tap that is not already a button or a screen control.
  // Consume the pointer and arm the one-shot click guard so the trailing click cannot
  // hit the shop or results that just appeared.
  pointerDown(e) {
    const t = e.target;
    if (t && t.closest && t.closest("button, a, input, .card, .screen, .setting")) return false;
    const state = this.game.flow.current;
    if (state && state.skipWait && state.skipWait(this.game)) {
      if (e && e.preventDefault) e.preventDefault();
      if (e && e.stopPropagation) e.stopPropagation();
      this.skipGuard.arm();
      return true;
    }
    return false;
  }
  // Returns true when the key did something.
  keyDown(e) {
    const game = this.game, code = e.code;
    if (this.isWorkshopOpen() && (code === "Escape" || code === "KeyW")) { game.closeWorkshop(); return true; }
    if (code === "Space" || code === "KeyP" || code === "Escape") {
      if (e.preventDefault) e.preventDefault();
      game.togglePause();
      return true;
    }
    const state = game.flow.current;
    if (state && state.onKey(game, code, e)) return true;
    if (code === "KeyF") { game.toggleSpeed(); return true; }
    if (code === "KeyQ" || code === "KeyE") { game.useAbility(); return true; }
    if (code === "Enter") return false; // no Enter action in this state
    if (code === "KeyM") { this.settings.toggle("music"); return true; }
    return false;
  }
  visibilityChanged(hidden) {
    const state = this.game.flow.current;
    if (hidden && state && state.pausesWhenHidden) this.game.togglePause();
  }
};
