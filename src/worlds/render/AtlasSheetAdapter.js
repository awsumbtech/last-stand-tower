// AtlasSheetAdapter: World 2's sole art-format boundary. Loads immutable Game Art & Motion
// TexturePacker grids (including gutters), aliases animation slots, and presents the same
// strips interface as LookSheetLibrary. No repacking, painting, tints, or generated art.
// Created by World2Sheets; lazy preload on world selection, retained for the page lifetime.
LST.AtlasSheetAdapter = class AtlasSheetAdapter extends LST.LookSheetLibrary {
  static build(data, image, aliases = {}) {
    const strips = {}, meta = data.meta;
    for (const [name, anim] of Object.entries(data.animations)) {
      const frames = anim.frames.map((id) => data.frames[id]);
      const first = frames[0].frame;
      const a = new LST.SheetAnimation({ image: meta.image, frame: { w: first.w, h: first.h },
        count: frames.length, fps: anim.fps, loop: anim.loop }, meta.pivot, meta.body.r);
      a.image = image || null;
      a.releaseFrame = meta.throwTiming && meta.throwTiming.releaseFrame;
      a.placement = meta.placement || null;
      a.draw = function (ctx, index, x, y, bodyR) {
        if (!this.image) return false;
        const f = frames[Math.max(0, Math.min(frames.length - 1, index | 0))];
        const r = f.frame, src = f.sourceSize || r, at = f.spriteSourceSize || { x: 0, y: 0 };
        const k = bodyR / this.refBodyR;
        const pv = f.pivot ? { x: f.pivot.x * src.w, y: f.pivot.y * src.h } : meta.pivot;
        ctx.drawImage(this.image, r.x, r.y, r.w, r.h,
          x - (pv.x - at.x) * k, y - (pv.y - at.y) * k, r.w * k, r.h * k);
        return true;
      };
      strips[aliases[name] || name] = a;
    }
    return { strips };
  }

  async load(name, sources) {
    const list = Array.isArray(sources) ? sources : [sources];
    const parts = await Promise.all(list.map(async (source) => {
      const spec = typeof source === "string" ? { url: source } : source;
      const res = await fetch(spec.url);
      if (!res.ok) throw new Error(`${spec.url}: ${res.status}`);
      const data = await res.json(), base = spec.url.slice(0, spec.url.lastIndexOf("/") + 1);
      const image = await LST.SpriteAtlas.loadImage(base + (data.meta.quantizedCopy ? data.meta.quantizedCopy.image : data.meta.image));
      return LST.AtlasSheetAdapter.build(data, image, spec.aliases);
    }));
    const sheet = { strips: Object.assign({}, ...parts.map((p) => p.strips)) };
    this.sheets[name] = sheet;
    return sheet;
  }

  // Same stub-image surface as LookSheetLibrary, plus real atlas fixtures for unit tests.
  install(name, data, images, aliases = {}) {
    if (!data.frames) return super.install(name, data, images);
    const sheet = LST.AtlasSheetAdapter.build(data, images.atlas, aliases);
    if (images.atlas) this.sheets[name] = sheet; else delete this.sheets[name];
    return sheet;
  }
};
