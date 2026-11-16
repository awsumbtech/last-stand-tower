#!/usr/bin/env node
// FX art scan (node, no browser): node tools/fx-art-scan.js
// PR 10a turned OverdriveRing, ChainArcs, ImpactFlashes, TowerGroundGlow, ImpactPulses and
// TextGlows into assets/fx/fx.json entries drawn by one generic SpriteEffect, and deleted
// GlowSprites. This scan fails if any of those files (or the manifest objects) draws a shape or
// gradient, sets a colour, tints / filters an image, or branches on an effect kind, and if
// fx.json names a colour or a tinting blend for an effect. It also proves it can see each banned
// call by scanning a planted line for every rule.
const fs = require("fs"), path = require("path");

class FxArtScan {
  constructor(root = path.join(__dirname, "..")) {
    this.root = root;
    this.FILES = ["src/render/OverdriveRing.js", "src/fx/draw/ChainArcs.js", "src/fx/draw/ImpactFlashes.js", "src/fx/draw/TowerGroundGlow.js",
      "src/fx/draw/ImpactPulses.js", "src/fx/draw/TextGlows.js", "src/fx/SpriteEffect.js", "src/fx/FxManifest.js", "src/fx/EffectPlayer.js"];
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
    for (const f of this.fails) console.log("FAIL fx-art: " + f);
    console.log(this.fails.length ? `\n${this.fails.length} FAILED (${this.passes} passed)` : `ALL PASS (${this.passes} passed: ${this.FILES.length} files, ${Object.keys(data.effects).length} fx.json effects, 0 fill / stroke / arc / gradient / colour / tint / kind-branch calls)`);
    return this.fails.length ? 1 : 0;
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

module.exports = FxArtScan;
if (require.main === module) process.exit(new FxArtScan().run());
