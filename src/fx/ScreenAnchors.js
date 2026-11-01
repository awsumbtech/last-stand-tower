// ScreenAnchors: where on screen (CSS px) a UI thing is, for effects drawn above menus.
// Reads the DOM only; never changes it.

LST.ScreenAnchors = class ScreenAnchors {
  constructor(doc) { this.doc = doc; this.pt = { x: 0, y: 0 }; }

  center(selector) {
    const el = this.doc && this.doc.querySelector(selector);
    if (!el) return null;
    const r = el.getBoundingClientRect();
    if (!r.width && !r.height) return null;
    this.pt.x = r.left + r.width / 2;
    this.pt.y = r.top + r.height / 2;
    return this.pt;
  }

  card(index) { return this.center(`#card-row [data-slot="${index}"]`) || this.center("#card-row"); }
  workshop(id) { return this.center(`[data-upgrade="${id}"]`) || this.center(`[data-card="${id}"]`) || this.center(`[data-ability="${id}"]`); }
  screenCenter() {
    const w = this.doc && this.doc.defaultView;
    this.pt.x = w ? w.innerWidth / 2 : 0; this.pt.y = w ? w.innerHeight / 2 : 0;
    return this.pt;
  }
};
