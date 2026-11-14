#!/usr/bin/env node
// UiChromeScanner: lists every style.css rule that draws UI chrome in code (backgrounds,
// borders, gradients, box-shadows, rounded corners, outlines, filters, text outlines), and
// checks that docs/OO-MIGRATION.md section F lists each selector (in backticks): with an owner
// object and an image plan (F6), as an allowed code-styled chip (F7), as a banned recolor (F8)
// or as an open question (F9).
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

  // Backticked names in docs/OO-MIGRATION.md section F.
  listed() {
    const doc = fs.readFileSync(path.join(this.root, "docs/OO-MIGRATION.md"), "utf8");
    const start = doc.indexOf("### F. UI art"), end = doc.indexOf("\n---", start);
    const section = start < 0 ? "" : doc.slice(start, end < 0 ? undefined : end);
    return new Set([...section.matchAll(/`([^`]+)`/g)].map((m) => m[1]));
  }

  run(argv) {
    const rules = this.rules();
    if (argv.includes("--json")) { console.log(JSON.stringify(rules, null, 1)); return 0; }
    const listed = this.listed(), sels = [...new Set(rules.map((r) => r.sel))];
    const missing = sels.filter((s) => !listed.has(s));
    for (const s of missing) console.log("FAIL ui-chrome: style.css `" + s + "` (line " + rules.find((r) => r.sel === s).line + ") is not listed in docs/OO-MIGRATION.md section F");
    console.log(missing.length ? `\n${missing.length} FAILED` : `ALL PASS (${rules.length} chrome rules, ${sels.length} selectors, all listed in section F)`);
    return missing.length ? 1 : 0;
  }
}

module.exports = UiChromeScanner;
if (require.main === module) process.exit(new UiChromeScanner().run(process.argv.slice(2)));
