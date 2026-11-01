// FxOverlay: a click-through canvas above the menus (shop, Workshop) for screen-space
// effects, e.g. the burst on the card you just picked. It only draws while something is
// live, and clears once when the last effect ends.

LST.FxOverlay = class FxOverlay {
  constructor(doc) {
    this.doc = doc;
    this.canvas = null;
    this.ctx = null;
    this.dirty = false;
  }

  ensure() {
    if (this.canvas) return;
    const c = this.doc.createElement("canvas");
    c.className = "fx-overlay";
    c.setAttribute("aria-hidden", "true");
    this.doc.body.appendChild(c);
    this.canvas = c;
    this.ctx = c.getContext("2d");
  }

  // draw(ctx) is called in CSS px coordinates.
  render(active, draw) {
    if (!active && !this.dirty) return;
    this.ensure();
    const win = this.doc.defaultView;
    const dpr = Math.min(win.devicePixelRatio || 1, 2);
    const w = win.innerWidth, h = win.innerHeight;
    if (this.canvas.width !== Math.round(w * dpr) || this.canvas.height !== Math.round(h * dpr)) {
      this.canvas.width = Math.round(w * dpr);
      this.canvas.height = Math.round(h * dpr);
    }
    const ctx = this.ctx;
    ctx.setTransform(1, 0, 0, 1, 0, 0);
    ctx.clearRect(0, 0, this.canvas.width, this.canvas.height);
    this.dirty = active;
    if (!active) return;
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    draw(ctx);
  }
};
