// DrawRecorder: records every canvas call and property write, and every call to a stubbed
// object (theme, FX director, world renderers), as one flat list of strings. Two runs of
// different code on the same inputs drew the same frame, in the same order, exactly when
// their lists are equal. Objects print as their `name` (or a tag in first-seen order), numbers
// print exactly. Used by tools/render-test.js.
class DrawRecorder {
  constructor() {
    this.log = [];
    this.tags = new Map();
  }

  fmt(v) {
    if (v === null || v === undefined || typeof v === "number" || typeof v === "boolean") return String(v);
    if (typeof v === "string") return JSON.stringify(v);
    if (typeof v === "function") return "fn";
    if (Array.isArray(v)) return "[" + v.map((x) => this.fmt(x)).join(",") + "]";
    if (v.name && typeof v.name === "string") return "<" + v.name + ">";
    if (!this.tags.has(v)) this.tags.set(v, "#" + this.tags.size);
    return this.tags.get(v);
  }

  // A 2D context: every method call and property write is logged. Gradients are recorded too.
  ctx(name) {
    const rec = this, props = { name };
    return new Proxy(props, {
      get(t, k) {
        if (k in t) return t[k];
        if (k === "createRadialGradient" || k === "createLinearGradient") {
          return (...a) => { const g = { name: name + ".grad" + rec.log.length }; rec.log.push(`${name}.${String(k)}(${a.map((x) => rec.fmt(x)).join(",")})`);
            g.addColorStop = (o, c) => rec.log.push(`${g.name}.addColorStop(${o},${c})`); return g; };
        }
        return (...a) => { rec.log.push(`${name}.${String(k)}(${a.map((x) => rec.fmt(x)).join(",")})`); };
      },
      set(t, k, v) { rec.log.push(`${name}.${String(k)}=${rec.fmt(v)}`); t[k] = v; return true; },
    });
  }

  // A stub whose listed methods log their call and run `impl` (if given) for a return value.
  stub(name, methods, fields = {}) {
    const o = Object.assign({ name }, fields), rec = this;
    for (const [m, impl] of Object.entries(methods)) {
      o[m] = (...a) => { rec.log.push(`${name}.${m}(${a.map((x) => rec.fmt(x)).join(",")})`); return impl ? impl(...a) : undefined; };
    }
    return o;
  }
}

module.exports = DrawRecorder;
