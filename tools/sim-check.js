#!/usr/bin/env node
// Backyard sim byte-identity check against committed hashes (CI-friendly, no main checkout needed).
//   node tools/sim-check.js            # all four configs from tools/sim-expected.json (~50 s)
//   node tools/sim-check.js phone      # just the named config(s)
// Each config is a seeded tools/sim.js run (the same ones tools/sim-ab.sh compares). Its JSON
// output must hash to the committed md5. Exit 1 on any difference or a missing / failed run.
const fs = require("fs"), path = require("path"), os = require("os"), crypto = require("crypto");
const { spawnSync } = require("child_process");
const ROOT = path.join(__dirname, "..");
const expected = JSON.parse(fs.readFileSync(path.join(__dirname, "sim-expected.json"), "utf8"));
const only = process.argv.slice(2);
const runs = expected.runs.filter((r) => !only.length || only.includes(r.name));
if (!runs.length) { console.log("FAIL no sim configs selected (" + only.join(",") + ")"); process.exit(1); }
const dir = fs.mkdtempSync(path.join(os.tmpdir(), "sim-check-"));
let fails = 0;
for (const r of runs) {
  const out = path.join(dir, r.name + ".json"), t0 = Date.now();
  const p = spawnSync(process.execPath, [path.join(__dirname, "sim.js"), ...r.args, "--out", out], { cwd: ROOT, stdio: ["ignore", "ignore", "pipe"], timeout: 300000 });
  const secs = ((Date.now() - t0) / 1000).toFixed(1);
  if (p.status !== 0 || !fs.existsSync(out)) { fails++; console.log(`FAIL ${r.name}: sim exited ${p.status}${p.error ? " " + p.error.message : ""} ${String(p.stderr || "").slice(0, 400)}`); continue; }
  const md5 = crypto.createHash("md5").update(fs.readFileSync(out)).digest("hex");
  const same = md5 === r.md5;
  if (!same) fails++;
  console.log(`${same ? "IDENTICAL" : "DIFF"} ${r.name} ${md5.slice(0, 12)}${same ? "" : " (expected " + r.short + ")"} ${secs}s`);
}
console.log(fails ? `sim-check: FAILED ${fails}` : `sim-check: ALL IDENTICAL (${runs.length} configs vs ${expected.baseline})`);
process.exit(fails ? 1 : 0);
