LST.utils = {
  clamp: (v, min, max) => Math.max(min, Math.min(max, v)),
  rand: (min, max) => min + Math.random() * (max - min),
  randInt: (min, max) => Math.floor(min + Math.random() * (max - min + 1)),
  dist2: (ax, ay, bx, by) => (ax - bx) ** 2 + (ay - by) ** 2,

  // Weighted random pick: pick([["a", 3], ["b", 1]]) returns "a" 75% of the time.
  pick(weighted) {
    const total = weighted.reduce((s, [, w]) => s + w, 0);
    let r = Math.random() * total;
    for (const [item, w] of weighted) {
      if ((r -= w) <= 0) return item;
    }
    return weighted[weighted.length - 1][0];
  },

  formatNumber(n) {
    n = Math.floor(n);
    if (n >= 1e6) return (n / 1e6).toFixed(1) + "M";
    if (n >= 1e4) return (n / 1e3).toFixed(1) + "k";
    return String(n);
  },

  // localStorage can throw (private mode, disabled storage), so wrap it.
  storage: {
    get(key, fallback) {
      try {
        const v = localStorage.getItem(key);
        return v === null ? fallback : JSON.parse(v);
      } catch (e) {
        return fallback;
      }
    },
    set(key, value) {
      try { localStorage.setItem(key, JSON.stringify(value)); } catch (e) { /* ignore */ }
    },
  },
};
