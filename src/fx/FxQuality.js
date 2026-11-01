// FxQuality: decides how much effect the device gets.
//   reduced  prefers-reduced-motion, the in-game "Shake & flashes" setting, or ?motion=0
//            -> no shake, no flashes, fewer particles
//   low      frame time stays high (or ?fx=low) -> lower particle caps, no projectile glow
// `scale` multiplies every emitter count and the pools' soft caps.

LST.FxQuality = class FxQuality {
  constructor(cfg, settings, win) {
    this.cfg = cfg;
    this.settings = settings;
    const q = win && win.location ? new URLSearchParams(win.location.search) : null;
    this.forceLow = !!(q && q.get("fx") === "low");
    this.forceReduced = !!(q && q.get("motion") === "0");
    this.mq = win && win.matchMedia ? win.matchMedia("(prefers-reduced-motion: reduce)") : null;
    this.ema = 16.7;
    this.slowFor = 0;
    this.okFor = 0;
    this.auto = false; // governor switched to low
    this.switches = 0;
  }

  get reduced() {
    return this.forceReduced || !!(this.mq && this.mq.matches) || (this.settings && this.settings.get("motion") === false);
  }

  get low() { return this.forceLow || this.auto; }

  get scale() {
    let s = 1;
    if (this.low) s *= this.cfg.lowScale;
    if (this.reduced) s *= this.cfg.reducedScale;
    return s;
  }

  // frameMs: real time between frames (ms). Background tabs give huge gaps: ignore those.
  sample(frameMs, dtS) {
    if (!(frameMs > 0) || frameMs > 250) return;
    this.ema += (frameMs - this.ema) * 0.08;
    const c = this.cfg;
    if (!this.auto) {
      this.slowFor = this.ema > c.slowFrameMs ? this.slowFor + dtS : 0;
      if (this.slowFor >= c.slowHoldS) { this.auto = true; this.okFor = 0; this.switches++; }
    } else {
      this.okFor = this.ema < c.okFrameMs ? this.okFor + dtS : 0;
      if (this.okFor >= c.okHoldS) { this.auto = false; this.slowFor = 0; this.switches++; }
    }
  }
};
