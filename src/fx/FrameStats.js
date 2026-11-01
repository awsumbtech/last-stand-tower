// FrameStats: ring buffers of frame time and FX/total draw time (ms) for perf logging.
// summary() is for QA / the console (LST.fxDirector.stats.summary()); it sorts a copy.

LST.FrameStats = class FrameStats {
  constructor(size = 600) {
    this.size = size;
    this.frame = new Float32Array(size);
    this.draw = new Float32Array(size);
    this.n = 0;
    this.i = 0;
  }

  record(frameMs, drawMs) {
    this.frame[this.i] = frameMs;
    this.draw[this.i] = drawMs;
    this.i = (this.i + 1) % this.size;
    if (this.n < this.size) this.n++;
  }

  reset() { this.n = 0; this.i = 0; }

  summary() {
    const q = (arr) => {
      const a = Array.from(arr.subarray(0, this.n)).sort((x, y) => x - y);
      const at = (p) => (a.length ? +a[Math.min(a.length - 1, Math.floor(p * a.length))].toFixed(2) : null);
      return { median: at(0.5), p95: at(0.95), max: a.length ? +a[a.length - 1].toFixed(2) : null };
    };
    return { frames: this.n, frameMs: q(this.frame), drawMs: q(this.draw) };
  }
};
