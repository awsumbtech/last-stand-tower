// SkipClickGuard: one-shot swallow of the click that follows a skip tap, so that
// click cannot land on the shop or results that just appeared. InputController
// owns the instance and attaches it in capture phase ahead of ShopScreen /
// ResultsScreen click handlers.
//
// By construction:
//   - arming records the skip's pointerId and pointerdown time;
//   - only the first pointerup of that pointerId restarts the 400 ms window;
//     every other pointerup is ignored;
//   - ANY later pointerdown, of any pointer, disarms the guard before the
//     game handles it (a new gesture means the skip click is never coming);
//   - a click is swallowed only if it is still armed and not stale against
//     the current mark (the skip pointerup, or the skip pointerdown if no
//     pointerup came); pointercancel always disarms.
// Event timeStamp keeps tests deterministic.
LST.SkipClickGuard = class SkipClickGuard {
  static get windowMs() { return 400; }
  constructor() {
    this.armed = false;
    this.armedAt = 0;
    this.pointerId = null;
    this.gotUp = false;
    this.onClick = (e) => this.consume(e);
    this.onPointerDown = (e) => this.laterPointerDown(e);
    this.onPointerUp = (e) => this.pointerEnded(e);
    this.onPointerCancel = (e) => this.cancel(e);
  }
  attach(target) {
    target.addEventListener("pointerdown", this.onPointerDown, true);
    target.addEventListener("click", this.onClick, true);
    target.addEventListener("pointerup", this.onPointerUp, true);
    target.addEventListener("pointercancel", this.onPointerCancel, true);
    return this;
  }
  time(e) { return e && e.timeStamp != null ? e.timeStamp : 0; }
  id(e) { return e && e.pointerId != null ? e.pointerId : null; }
  arm(at, pointerId) {
    this.armed = true;
    this.armedAt = at == null ? 0 : at;
    this.pointerId = pointerId != null ? pointerId : null;
    this.gotUp = false;
  }
  disarm() {
    this.armed = false;
    this.pointerId = null;
    this.gotUp = false;
  }
  stale(t) { return this.armed && (t - this.armedAt) >= LST.SkipClickGuard.windowMs; }
  laterPointerDown() {
    if (this.armed) this.disarm();
    return false;
  }
  cancel() {
    if (this.armed) this.disarm();
    return false;
  }
  pointerEnded(e) {
    if (!this.armed || this.gotUp) return false;
    if (this.pointerId != null && this.id(e) !== this.pointerId) return false;
    this.gotUp = true;
    this.armedAt = this.time(e);
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
