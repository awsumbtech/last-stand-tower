// SkipClickGuard: one-shot swallow of the click that follows a skip tap, so that
// click cannot land on the shop or results that just appeared. InputController
// owns the instance, arms it after a successful skip, and attaches it in
// capture phase ahead of ShopScreen / ResultsScreen click handlers.
LST.SkipClickGuard = class SkipClickGuard {
  constructor() {
    this.armed = false;
    this.onClick = (e) => this.consume(e);
  }
  attach(target) {
    target.addEventListener("click", this.onClick, true);
    return this;
  }
  arm() { this.armed = true; }
  consume(e) {
    if (!this.armed) return false;
    this.armed = false;
    if (e && e.preventDefault) e.preventDefault();
    if (e && e.stopPropagation) e.stopPropagation();
    if (e && e.stopImmediatePropagation) e.stopImmediatePropagation();
    return true;
  }
};
