// SkipClickGuard: one-shot swallow of the click that follows a skip tap, so that
// click cannot land on the shop or results that just appeared. InputController
// owns the instance, arms it after a successful skip, and attaches it in
// capture phase ahead of ShopScreen / ResultsScreen click handlers.
// Armed from pointerdown; the skip's own pointerup restarts a 400 ms window
// (event timeStamp, so tests are deterministic) instead of expiring the guard.
// A click inside that window is swallowed; a click stale against the current
// mark (pointerup, or pointerdown if no pointerup ever comes) is delivered.
// pointercancel always disarms.
LST.SkipClickGuard = class SkipClickGuard {
  static get windowMs() { return 400; }
  constructor() {
    this.armed = false;
    this.armedAt = 0;
    this.onClick = (e) => this.consume(e);
    this.onPointerUp = (e) => this.pointerEnded(e);
    this.onPointerCancel = (e) => this.cancel(e);
  }
  attach(target) {
    target.addEventListener("click", this.onClick, true);
    target.addEventListener("pointerup", this.onPointerUp, true);
    target.addEventListener("pointercancel", this.onPointerCancel, true);
    return this;
  }
  time(e) { return e && e.timeStamp != null ? e.timeStamp : 0; }
  arm(at) {
    this.armed = true;
    this.armedAt = at == null ? 0 : at;
  }
  disarm() { this.armed = false; }
  stale(t) { return this.armed && (t - this.armedAt) >= LST.SkipClickGuard.windowMs; }
  cancel() {
    if (this.armed) this.disarm();
    return false;
  }
  pointerEnded(e) {
    if (!this.armed) return false;
    this.arm(this.time(e)); // restart the window; do not expire on this pointerup
    return false;
  }
  consume(e) {
    if (!this.armed) return false;
    if (this.stale(this.time(e))) { this.disarm(); return false; }
    this.disarm();
    if (e && e.preventDefault) e.preventDefault();
    if (e && e.stopPropagation) e.stopPropagation();
    if (e && e.stopImmediatePropagation) e.stopImmediatePropagation();
    return true;
  }
};
