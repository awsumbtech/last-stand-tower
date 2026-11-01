// FxCamera: screen shake plus a few fixed "pulse" slots (expanding ring + soft bloom + short
// flash) for impacts. Slots are preallocated and reused, so impacts allocate nothing.

LST.FxCamera = class FxCamera {
  constructor(slots = 4) {
    this.shake = 0;
    this.pulses = [];
    for (let i = 0; i < slots; i++) {
      this.pulses.push({ active: false, space: "world", x: 0, y: 0, t: 0, life: 0, ring: 0, bloom: 0, flash: 0, color: "#ffffff", bornFrame: -1, drawnFrame: -1 });
    }
    this.next = 0;
  }

  // Returns the pulse slot used (for sync bookkeeping).
  pulse(space, x, y, ring, bloom, flash, color, life, frame) {
    let p = this.pulses.find((q) => !q.active);
    if (!p) { p = this.pulses[this.next]; this.next = (this.next + 1) % this.pulses.length; }
    p.active = true; p.space = space; p.x = x; p.y = y; p.t = 0; p.life = life;
    p.ring = ring; p.bloom = bloom; p.flash = flash; p.color = color; p.bornFrame = frame; p.drawnFrame = -1;
    return p;
  }

  addShake(amount) { this.shake = Math.min(1, this.shake + amount); }

  update(dt) {
    this.shake = Math.max(0, this.shake - dt * 2.2);
    for (const p of this.pulses) {
      if (!p.active) continue;
      p.t += dt;
      if (p.t >= p.life) p.active = false;
    }
  }

  anyActive(space) {
    for (const p of this.pulses) if (p.active && p.space === space) return true;
    return false;
  }

  clear() { this.shake = 0; for (const p of this.pulses) p.active = false; }
};
