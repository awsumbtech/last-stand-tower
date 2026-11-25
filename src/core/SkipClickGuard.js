// SkipClickGuard: one-shot swallow of the click that follows a skip tap, so that
// click cannot land on the shop or results that just appeared. InputController
// owns the instance, arms it after a successful skip, and attaches it in
// capture phase ahead of ShopScreen / ResultsScreen click handlers.
// Armed for a 400 ms window (event timeStamp, so tests are deterministic). A
// click inside the window is swallowed; pointercancel, or a later event once
// the window has passed, always disarms so the next real tap is delivered.
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
    if (this.stale(this.time(e))) this.disarm();
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
