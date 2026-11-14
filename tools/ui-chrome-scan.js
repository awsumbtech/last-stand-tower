#!/usr/bin/env node
// UiChromeScanner: lists every style.css rule that draws UI chrome in code (backgrounds,
// borders, gradients, box-shadows, rounded corners, outlines, filters, text outlines), and
// checks that docs/OO-MIGRATION.md section F lists each selector (in backticks): with an owner
// object and an image plan (F6), as an allowed code-styled control (F7 chips, F9 text outlines
// and focus rings), or as a banned recolor (F8). It prints the count per category.
//   node tools/ui-chrome-scan.js          check coverage (exit 1 on a missing selector)
//   node tools/ui-chrome-scan.js --json   print the rules as JSON
const fs = require("fs"), path = require("path");

class UiChromeScanner {
  constructor(root = path.join(__dirname, "..")) {
    this.root = root;
    this.none = /^(none|transparent|inherit|initial|unset|0|0 none)( !important)?$/;
  }

  // style.css with comments blanked out (line numbers kept).
  css() {
    return fs.readFileSync(path.join(this.root, "style.css"), "utf8").replace(/\/\*[\s\S]*?\*\//g, (c) => c.replace(/[^\n]/g, " "));
  }

  // The chrome kinds one declaration block paints.
  kindsOf(body) {
    const kinds = new Set();
    for (const d of body.split(";")) {
      const i = d.indexOf(":"); if (i < 0) continue;
      const k = d.slice(0, i).trim(), v = d.slice(i + 1).trim().replace(/\s+/g, " ");
      if (this.none.test(v)) continue;
      if (/^background(-color|-image)?$/.test(k)) kinds.add(/gradient/.test(v) ? "gradient" : "background");
      else if (/^border(-(top|bottom|left|right))?$|^border-color$/.test(k)) kinds.add("border");
      else if (k === "box-shadow") kinds.add("shadow");
      else if (k === "border-radius") kinds.add("radius");
      else if (k === "outline") kinds.add("outline");
      else if (k === "filter") kinds.add("filter");
      else if (k === "text-shadow" || k === "-webkit-text-stroke") kinds.add("text-outline");
    }
    return kinds;
  }

  // [{ line, sel, kinds }] for every chrome rule (keyframe steps and at-rules skipped).
  rules() {
    const css = this.css(), out = [];
    for (const m of css.matchAll(/([^{}]+)\{([^{}]*)\}/g)) {
      const sel = m[1].trim().replace(/\s+/g, " ");
      if (!sel || sel.startsWith("@") || /^(from|to|\d+%)/.test(sel)) continue;
      const line = css.slice(0, m.index + m[1].length - m[1].trimStart().length).split("\n").length;
      const kinds = this.kindsOf(m[2]);
      if (kinds.size) out.push({ line, sel, kinds: [...kinds] });
    }
    return out;
  }

  // Section F of docs/OO-MIGRATION.md split by subsection: { "F": text before F6, F6, F7, F8, F9 }.
  sections() {
    const doc = fs.readFileSync(path.join(this.root, "docs/OO-MIGRATION.md"), "utf8");
    const start = doc.indexOf("### F. UI art"), end = doc.indexOf("\n---", start);
    const f = start < 0 ? "" : doc.slice(start, end < 0 ? undefined : end);
    const out = {}, parts = f.split(/^#### (F\d+)\./m);
    out.F = parts[0];
    for (let i = 1; i < parts.length; i += 2) out[parts[i]] = parts[i + 1];
    return out;
  }

  // selector -> category. F6 (and F1-F5): image art; F7 chips and F9 text outlines / focus
  // rings: allowed code-styled controls (Decisions 11 and 13); F8: banned recolor.
  categories() {
    const CAT = { F: "image-art", F6: "image-art", F7: "allowed-code", F8: "banned-recolor", F9: "allowed-code" };
    const map = new Map();
    for (const [sec, text] of Object.entries(this.sections())) {
      for (const m of text.matchAll(/`([^`]+)`/g)) {
        const set = map.get(m[1]) || new Set();
        set.add(CAT[sec] || "image-art");
        map.set(m[1], set);
      }
    }
    return map;
  }

  run(argv) {
    const rules = this.rules();
    if (argv.includes("--json")) { console.log(JSON.stringify(rules, null, 1)); return 0; }
    const cats = this.categories(), sels = [...new Set(rules.map((r) => r.sel))], fails = [];
    const lineOf = (s) => rules.find((r) => r.sel === s).line;
    const count = { "image-art": 0, "allowed-code": 0, "banned-recolor": 0 };
    for (const sel of sels) {
      const c = cats.get(sel);
      if (!c) { fails.push("style.css `" + sel + "` (line " + lineOf(sel) + ") is not listed in docs/OO-MIGRATION.md section F"); continue; }
      if (c.size > 1) { fails.push("style.css `" + sel + "` is in more than one category: " + [...c].join(", ")); continue; }
      count[[...c][0]]++;
    }
    // Text outlines and focus rings (rules that only paint those) are allowed code (Decision 13).
    for (const r of rules) {
      const only = r.kinds.every((k) => k === "text-outline") || (/:focus-visible$/.test(r.sel) && r.kinds.every((k) => k === "outline" || k === "radius"));
      const c = cats.get(r.sel);
      if (only && c && !c.has("allowed-code")) fails.push("style.css `" + r.sel + "` (line " + r.line + ") is a text outline / focus ring but not an allowed code-styled control (F9)");
    }
    const f9 = this.sections().F9 || "";
    if (!/allowed code-styled control/.test(f9)) fails.push("F9 does not mark text outlines / focus rings as allowed code-styled controls");
    for (const f of fails) console.log("FAIL ui-chrome: " + f);
    console.log(fails.length ? `\n${fails.length} FAILED` : `ALL PASS (${rules.length} chrome rules, ${sels.length} selectors: ${count["image-art"]} image art, ${count["allowed-code"]} allowed code-styled, ${count["banned-recolor"]} banned recolor)`);
    return fails.length ? 1 : 0;
  }
}

module.exports = UiChromeScanner;
if (require.main === module) process.exit(new UiChromeScanner().run(process.argv.slice(2)));
