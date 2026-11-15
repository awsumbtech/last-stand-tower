// GlowSprites: the FX glow sprite cache. One small radial-gradient canvas per CSS color, made
// once, so a frame of effects is plain drawImage calls with no allocation. (Same sprites as
// before; no new art.)
LST.GlowSprites = class GlowSprites {
  constructor(doc) {
    this.doc = doc;
    this.cache = new Map(); // CSS color -> canvas
  }

  get(color) {
    let c = this.cache.get(color);
    if (c) return c;
    const S = 64;
    c = this.doc.createElement("canvas");
    c.width = c.height = S;
    const g = c.getContext("2d");
    const [r, gg, b] = LST.GlowSprites.rgb(color);
    const grad = g.createRadialGradient(S / 2, S / 2, 0, S / 2, S / 2, S / 2);
    grad.addColorStop(0, "rgba(255,255,255,1)");
    grad.addColorStop(0.18, `rgba(${r},${gg},${b},0.9)`);
    grad.addColorStop(0.5, `rgba(${r},${gg},${b},0.32)`);
    grad.addColorStop(1, `rgba(${r},${gg},${b},0)`);
    g.fillStyle = grad;
    g.fillRect(0, 0, S, S);
    this.cache.set(color, c);
    return c;
  }

  static rgb(hex) {
    const h = hex.replace("#", "");
    const n = parseInt(h.length === 3 ? h.split("").map((x) => x + x).join("") : h, 16);
    return [(n >> 16) & 255, (n >> 8) & 255, n & 255];
  }
};
