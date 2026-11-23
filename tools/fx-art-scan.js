#!/usr/bin/env node
// FX art scan (node, no browser): node tools/fx-art-scan.js
// PR 10a turned OverdriveRing, ChainArcs, ImpactFlashes, TowerGroundGlow, ImpactPulses and
// TextGlows into assets/fx/fx.json entries drawn by one generic SpriteEffect, and deleted
// GlowSprites. PR 10b did the same for ParticleBatch (motes, glows, streaks), ProjectileTrails and
// OverlayLayer (low-HP vignette, screen flash), and the finale dim in HudCanvasLayer. This scan fails if any of those files (or the manifest objects) draws a shape or
// gradient, sets a colour, tints / filters an image, or branches on an effect kind, and if
// fx.json names a colour or a tinting blend for an effect. It also proves it can see each banned
// call by scanning a planted line for every rule, and fails on near-white pixels in any PNG under
// assets/fx (white is banned in effect art), with a planted PNG as its self-test.
const fs = require("fs"), path = require("path"), zlib = require("zlib");

class FxArtScan {
  constructor(root = path.join(__dirname, "..")) {
    this.root = root;
    this.FILES = ["src/render/OverdriveRing.js", "src/fx/draw/ChainArcs.js", "src/fx/draw/ImpactFlashes.js", "src/fx/draw/TowerGroundGlow.js",
      "src/fx/draw/ImpactPulses.js", "src/fx/draw/TextGlows.js", "src/fx/SpriteEffect.js", "src/fx/FxManifest.js", "src/fx/EffectPlayer.js",
      "src/fx/draw/ParticleBatch.js", "src/fx/draw/ProjectileTrails.js", "src/render/OverlayLayer.js"];
    this.RULES = [
      ["canvas shape / path call", /\.(arc|arcTo|ellipse|rect|roundRect|fill|stroke|fillRect|strokeRect|lineTo|moveTo|beginPath|closePath|bezierCurveTo|quadraticCurveTo|fillText|strokeText)\s*\(/],
      ["gradient / pattern", /create(Radial|Linear|Conic)Gradient|createPattern|addColorStop/],
      ["colour / style write", /\b(fillStyle|strokeStyle|shadowColor|shadowBlur|lineWidth)\s*=/],
      ["tint / filter", /\bfilter\s*=|getImageData|putImageData|"(source-atop|multiply|color|hue|saturation|luminosity|overlay|difference|exclusion)"|\btint\b|hue-rotate|saturate\(/],
      ["colour literal", /#[0-9a-fA-F]{3,8}\b|\brgba?\s*\(|\bhsla?\s*\(/],
      ["kind / type branch", /switch\s*\(|\.(kind|type)\s*[!=]==|[!=]==\s*"(coin|crit|hit|bonus)"/],
      ["glow sprite cache", /GlowSprites/],
    ];
    this.fails = [];
    this.passes = 0;
  }

  read(rel) { return fs.readFileSync(path.join(this.root, rel), "utf8"); }
  ok(c, m) { if (c) this.passes++; else this.fails.push(m); }

  // Code lines only: comments are stripped so the files can still say what they replaced.
  static code(src) {
    return src.replace(/\/\*[\s\S]*?\*\//g, "").split("\n").map((l) => l.replace(/(^|[^:"'])\/\/.*$/, "$1"));
  }

  scan(rel, src) {
    const hits = [];
    FxArtScan.code(src).forEach((line, i) => { for (const [name, re] of this.RULES) if (re.test(line)) hits.push(`${rel}:${i + 1} ${name}: ${line.trim()}`); });
    return hits;
  }

  run() {
    // 0. The scan sees every rule (one planted line each).
    const planted = ["ctx.arc(0, 0, 5, 0, 7);", "const g = ctx.createRadialGradient(0,0,0,0,0,1);", "ctx.fillStyle = c;", "ctx.globalCompositeOperation = \"source-atop\";", "const c = \"#ffd23f\";", "if (t.kind === \"coin\") x();", "new LST.GlowSprites(doc);"];
    this.ok(planted.every((l, i) => this.scan("planted", l).some((h) => h.includes(this.RULES[i][0]))), "self-test: each rule catches its planted line");
    // 1. The converted files.
    for (const f of this.FILES) {
      const hits = this.scan(f, this.read(f));
      this.ok(!hits.length, hits.join("\n     "));
      this.ok(/drawImage|effects\.draw|\.draw\(/.test(this.read(f)) || f.endsWith("EffectPlayer.js") || f.endsWith("FxManifest.js"), `${f}: draws through images / fx.json effects`);
    }
    // 1b. HudCanvasLayer still asks the theme for its banners (PR 17), but draws no dim of its own.
    const hud = FxArtScan.code(this.read("src/render/HudCanvasLayer.js")).join("\n");
    this.ok(!/\b(fillRect|fillStyle|strokeStyle|createRadialGradient|createLinearGradient)\b|rgba?\(/.test(hud) && /effects\.draw\("finaleDim"/.test(hud), "src/render/HudCanvasLayer.js: the finale dim is the fx.json effect finaleDim (no fill, style or colour of its own)");
    // 2. GlowSprites is gone everywhere it was loaded or used.
    this.ok(!fs.existsSync(path.join(this.root, "src/fx/draw/GlowSprites.js")), "src/fx/draw/GlowSprites.js is deleted");
    const users = ["index.html", "styles.html", "sw.js", ...this.walk("src")].filter((f) => /GlowSprites/.test(FxArtScan.code(this.read(f)).join("\n")));
    this.ok(!users.length, "nothing loads or uses GlowSprites: " + users.join(", "));
    // 3. fx.json: effects name sheets, not colours; blends are plain (no tinting composite ops).
    const data = JSON.parse(this.read("assets/fx/fx.json"));
    for (const [id, e] of Object.entries(data.effects)) {
      const json = JSON.stringify(e);
      this.ok(!/#[0-9a-f]{3,8}\b|rgba?\(|"(color|colour|tint|hue)"/i.test(json.replace(/"what":"[^"]*"/, "")), `fx.json ${id}: no colour, tint or hue setting`);
      this.ok(["source-over", "screen", "lighter", undefined].includes(e.blend), `fx.json ${id}: blend ${e.blend} is a plain composite (source-over / screen / lighter)`);
      for (const s of [].concat(e.sheet)) this.ok(data.sheets[s], `fx.json ${id}: sheet ${s} is listed in "sheets"`);
    }
    // 3b. PR 10b: presets, impacts and themes name particle variants, never a colour.
    for (const k of ["presets", "impacts", "themes"]) this.ok(data[k] && !/#[0-9a-f]{3,8}\b|rgba?\(|hsla?\(/i.test(JSON.stringify(data[k]).replace(/"what":"[^"]*"/g, "")), `fx.json ${k}: variant names only, no colour literal`);
    // 4. No near-white pixels in any shipped effect PNG (white is banned in effects; Decision 12).
    const white = FxArtScan.png(FxArtScan.makePng(2, 1, [255, 255, 255, 255, 255, 200, 120, 255]));
    this.ok(FxArtScan.nearWhite(white) === 1, "self-test: the PNG reader decodes a planted image and finds its one near-white pixel");
    const pngs = this.walkAll("assets/fx").filter((f) => f.endsWith(".png"));
    let checked = 0;
    for (const f of pngs) {
      let img;
      try { img = FxArtScan.png(fs.readFileSync(path.join(this.root, f))); } catch (err) { this.ok(false, `${f}: cannot read (${err.message})`); continue; }
      const n = FxArtScan.nearWhite(img);
      this.ok(n === 0, `${f}: ${n} near-white pixels (R, G and B >= ${FxArtScan.WHITE}, alpha >= ${FxArtScan.WHITE_ALPHA}); white is banned in effect art`);
      checked++;
    }
    this.pngCount = checked;
    for (const f of this.fails) console.log("FAIL fx-art: " + f);
    console.log(this.fails.length ? `\n${this.fails.length} FAILED (${this.passes} passed)` : `ALL PASS (${this.passes} passed: ${this.FILES.length} files, ${Object.keys(data.effects).length} fx.json effects, ${this.pngCount} PNGs with 0 near-white pixels, 0 fill / stroke / arc / gradient / colour / tint / kind-branch calls)`);
    return this.fails.length ? 1 : 0;
  }

  walkAll(dir) {
    const out = [];
    for (const e of fs.readdirSync(path.join(this.root, dir), { withFileTypes: true })) {
      const rel = dir + "/" + e.name;
      if (e.isDirectory()) out.push(...this.walkAll(rel)); else out.push(rel);
    }
    return out;
  }

  // Pixels whose R, G and B are all >= WHITE with alpha >= WHITE_ALPHA.
  static nearWhite({ w, h, px }) {
    let n = 0;
    for (let i = 0; i < w * h * 4; i += 4) if (px[i] >= FxArtScan.WHITE && px[i + 1] >= FxArtScan.WHITE && px[i + 2] >= FxArtScan.WHITE && px[i + 3] >= FxArtScan.WHITE_ALPHA) n++;
    return n;
  }

  // Minimal PNG reader: 8-bit RGBA / RGB, not interlaced (what the art pipeline writes). Returns { w, h, px } (RGBA).
  static png(buf) {
    if (buf.readUInt32BE(0) !== 0x89504e47) throw new Error("not a PNG");
    let o = 8, w = 0, h = 0, ch = 0;
    const idat = [];
    while (o < buf.length) {
      const len = buf.readUInt32BE(o), type = buf.toString("ascii", o + 4, o + 8), d = buf.subarray(o + 8, o + 8 + len);
      if (type === "IHDR") {
        w = d.readUInt32BE(0); h = d.readUInt32BE(4);
        const depth = d[8], ct = d[9], il = d[12];
        if (depth !== 8 || (ct !== 6 && ct !== 2) || il) throw new Error(`unsupported PNG (depth ${depth}, colour type ${ct}, interlace ${il})`);
        ch = ct === 6 ? 4 : 3;
      } else if (type === "IDAT") idat.push(d);
      else if (type === "IEND") break;
      o += 12 + len;
    }
    const raw = zlib.inflateSync(Buffer.concat(idat)), stride = w * ch, px = new Uint8Array(w * h * 4);
    let prev = new Uint8Array(stride), cur = new Uint8Array(stride);
    for (let y = 0; y < h; y++) {
      const ft = raw[y * (stride + 1)], line = raw.subarray(y * (stride + 1) + 1, (y + 1) * (stride + 1));
      for (let x = 0; x < stride; x++) {
        const a = x >= ch ? cur[x - ch] : 0, b = prev[x], c = x >= ch ? prev[x - ch] : 0;
        let v = line[x];
        if (ft === 1) v += a; else if (ft === 2) v += b; else if (ft === 3) v += (a + b) >> 1;
        else if (ft === 4) { const p = a + b - c, pa = Math.abs(p - a), pb = Math.abs(p - b), pc = Math.abs(p - c); v += pa <= pb && pa <= pc ? a : pb <= pc ? b : c; }
        cur[x] = v & 255;
      }
      for (let x = 0; x < w; x++) { const s = x * ch, t = (y * w + x) * 4; px[t] = cur[s]; px[t + 1] = cur[s + 1]; px[t + 2] = cur[s + 2]; px[t + 3] = ch === 4 ? cur[s + 3] : 255; }
      [prev, cur] = [cur, prev];
    }
    return { w, h, px };
  }

  // A tiny RGBA PNG (self-test only): rgba = [r, g, b, a, ...] row-major.
  static makePng(w, h, rgba) {
    const crcT = []; for (let n = 0; n < 256; n++) { let c = n; for (let k = 0; k < 8; k++) c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1; crcT[n] = c >>> 0; }
    const crc = (b) => { let c = 0xffffffff; for (const x of b) c = crcT[(c ^ x) & 255] ^ (c >>> 8); return (c ^ 0xffffffff) >>> 0; };
    const chunk = (t, d) => { const l = Buffer.alloc(4); l.writeUInt32BE(d.length); const td = Buffer.concat([Buffer.from(t, "ascii"), d]); const c = Buffer.alloc(4); c.writeUInt32BE(crc(td)); return Buffer.concat([l, td, c]); };
    const ihdr = Buffer.alloc(13); ihdr.writeUInt32BE(w, 0); ihdr.writeUInt32BE(h, 4); ihdr[8] = 8; ihdr[9] = 6;
    const rows = []; for (let y = 0; y < h; y++) rows.push(Buffer.from([0, ...rgba.slice(y * w * 4, (y + 1) * w * 4)]));
    return Buffer.concat([Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]), chunk("IHDR", ihdr), chunk("IDAT", zlib.deflateSync(Buffer.concat(rows))), chunk("IEND", Buffer.alloc(0))]);
  }

  walk(dir) {
    const out = [];
    for (const e of fs.readdirSync(path.join(this.root, dir), { withFileTypes: true })) {
      const rel = dir + "/" + e.name;
      if (e.isDirectory()) out.push(...this.walk(rel)); else if (rel.endsWith(".js")) out.push(rel);
    }
    return out;
  }
}

FxArtScan.WHITE = 245;       // near-white: R, G and B all at least this
FxArtScan.WHITE_ALPHA = 26;  // ... on a pixel at least 10% opaque

module.exports = FxArtScan;
if (require.main === module) process.exit(new FxArtScan().run());
