// ui-chrome-scan: lists every style.css rule that draws UI chrome in code (backgrounds,
// borders, gradients, box-shadows, rounded corners, outlines, filters, text outlines), and
// checks that docs/OO-MIGRATION.md section F lists each selector (in backticks) with an owner
// object and an image plan, or under the allowed code-styled controls (Brian, Nov 13).
//   node tools/ui-chrome-scan.js          check coverage (exit 1 on a missing selector)
//   node tools/ui-chrome-scan.js --json   print the rules as JSON
const fs = require("fs"), path = require("path");
const ROOT = path.join(__dirname, "..");
const css = fs.readFileSync(path.join(ROOT, "style.css"), "utf8").replace(/\/\*[\s\S]*?\*\//g, (c) => c.replace(/[^\n]/g, " "));
const NONE = /^(none|transparent|inherit|initial|unset|0|0 none)( !important)?$/;
const rules = [];
for (const m of css.matchAll(/([^{}]+)\{([^{}]*)\}/g)) {
  const sel = m[1].trim().replace(/\s+/g, " ");
  if (!sel || sel.startsWith("@") || /^(from|to|\d+%)/.test(sel)) continue;
  const line = css.slice(0, m.index + m[1].length - m[1].trimStart().length).split("\n").length;
  const kinds = new Set();
  for (const d of m[2].split(";")) {
    const i = d.indexOf(":"); if (i < 0) continue;
    const k = d.slice(0, i).trim(), v = d.slice(i + 1).trim().replace(/\s+/g, " ");
    if (NONE.test(v)) continue;
    if (/^background(-color|-image)?$/.test(k)) kinds.add(/gradient/.test(v) ? "gradient" : "background");
    else if (/^border(-(top|bottom|left|right))?$|^border-color$/.test(k)) kinds.add("border");
    else if (k === "box-shadow") kinds.add("shadow");
    else if (k === "border-radius") kinds.add("radius");
    else if (k === "outline") kinds.add("outline");
    else if (k === "filter") kinds.add("filter");
    else if (k === "text-shadow" || k === "-webkit-text-stroke") kinds.add("text-outline");
  }
  if (kinds.size) rules.push({ line, sel, kinds: [...kinds] });
}
if (process.argv.includes("--json")) { console.log(JSON.stringify(rules, null, 1)); process.exit(0); }
const doc = fs.readFileSync(path.join(ROOT, "docs/OO-MIGRATION.md"), "utf8");
const start = doc.indexOf("### F. UI art"), end = doc.indexOf("\n---", start);
const section = start < 0 ? "" : doc.slice(start, end < 0 ? undefined : end);
const listed = new Set([...section.matchAll(/`([^`]+)`/g)].map((m) => m[1].replace(/:\d+(-\d+)?$/, "")));
const missing = [...new Set(rules.map((r) => r.sel))].filter((s) => !listed.has(s));
for (const s of missing) console.log("FAIL ui-chrome: style.css `" + s + "` (line " + rules.find((r) => r.sel === s).line + ") is not listed in docs/OO-MIGRATION.md section F");
console.log(missing.length ? `\n${missing.length} FAILED` : `ALL PASS (${rules.length} chrome rules, ${new Set(rules.map((r) => r.sel)).size} selectors, all listed in section F)`);
process.exit(missing.length ? 1 : 0);
