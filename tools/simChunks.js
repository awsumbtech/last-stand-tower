#!/usr/bin/env node
// Chunked, resumable balance sims for Last Stand Tower.
//
// A long sim job is split into short chunks. Each `next` command runs ONE chunk (stops
// after its time budget, default 45 s), saves it to tools/out/<job>/chunk-N.json and
// exits, so no single command runs long enough to get cut off. Running `next` again
// resumes after the last finished chunk; `merge` summarizes all chunks.
//
//   node tools/simChunks.js init <job> --kind runs --strategies casual,skilled --seeds 60
//   node tools/simChunks.js init <job> --kind campaign --strategies casual --seeds 8 --hours 4
//   node tools/simChunks.js next <job>        # one chunk (repeat until it says "done")
//   node tools/simChunks.js status <job>
//   node tools/simChunks.js merge <job>       # -> tools/out/<job>/summary.json
//
// init options: --budget <sec per chunk, default 45>, --max-units <per chunk>,
//               --sim "<extra tools/sim.js flags, e.g. --unlocked starter --phone>"
//
// Parts (one job each):
//   JobKind    what a unit of work is, how to run one, how to summarize them (RunsKind, CampaignKind)
//   SimJob     a saved job spec: kind + its ordered list of units + sim flags
//   ResultStore files under tools/out/<job>/: job.json, chunk-N.json (atomic writes), summary.json
//   ChunkRunner runs the next units in a time budget and hands the chunk to the store
//   Summarizer merges every chunk's results and asks the JobKind for the summary
"use strict";
const fs = require("fs");
const path = require("path");

const OUT_ROOT = path.join(__dirname, "out");
const quantile = (arr, p) => { const a = arr.slice().sort((x, y) => x - y); return a.length ? a[Math.min(a.length - 1, Math.floor(p * a.length))] : null; };
const round = (x, d = 2) => (x == null ? null : +x.toFixed(d));
const stats = (arr) => ({ n: arr.length, median: quantile(arr, 0.5), p25: quantile(arr, 0.25), p75: quantile(arr, 0.75), p90: quantile(arr, 0.9), max: arr.length ? Math.max(...arr) : null });

// ---------- JobKind: one class per kind of sim work ----------
class JobKind {
  constructor(sim) { this.sim = sim; } // the loaded tools/sim.js module
  units(/* spec */) { throw new Error("units() not implemented"); }
  run(/* unit, spec */) { throw new Error("run() not implemented"); }
  summarize(/* results, spec */) { throw new Error("summarize() not implemented"); }
}

// Single runs: one unit = one seeded run of one strategy (no meta progression).
class RunsKind extends JobKind {
  units(spec) { return spec.strategies.flatMap((strategy) => Array.from({ length: spec.seeds }, (_, i) => ({ strategy, seed: i + 1 }))); }
  run(u) {
    const r = this.sim.playRun(u.strategy, u.seed);
    const bossWaves = r.waves.filter((w) => w.bossKilled !== undefined).map((w) => [w.wave, w.bossKilled ? 1 : 0, Math.round(w.seconds)]);
    return { strategy: u.strategy, seed: u.seed, wave: r.deathWave, minutes: round(r.realMinutes, 2), gears: r.gears, bossWaves, bossEscapes: r.bossEscapes,
      reachedFinale: r.reachedFinale, finaleWon: r.finaleWon };
  }
  summarize(results) {
    return groupBy(results, "strategy", (rs) => ({
      runs: rs.length, deathWave: stats(rs.map((r) => r.wave)), minutes: stats(rs.map((r) => r.minutes)),
      bigRed: bossTable(rs.flatMap((r) => r.bossWaves)), bossEscapesPerRun: round(avg(rs.map((r) => r.bossEscapes))),
      finaleReached: round(rs.filter((r) => r.reachedFinale).length / rs.length), finaleWon: round(rs.filter((r) => r.finaleWon).length / rs.length),
    }));
  }
}

// Campaigns: one unit = one player's whole campaign (real Gears, unlocks, Workshop, Head Start) for `hours`.
class CampaignKind extends JobKind {
  units(spec) { return spec.strategies.flatMap((strategy) => Array.from({ length: spec.seeds }, (_, i) => ({ strategy, seed: i + 1 }))); }
  run(u, spec) {
    const c = this.sim.campaign(u.strategy, u.seed, spec.hours);
    return { strategy: u.strategy, seed: u.seed, events: c.events, best: c.best,
      runs: c.runs.map((r) => ({ at: r.at, start: r.start, wave: r.wave, minutes: r.minutes, gears: r.gears, finaleWon: r.finaleWon, finaleSec: r.finaleSec, bossEscapes: r.bossEscapes, bossWaves: r.bossWaves })) };
  }
  summarize(results, spec) {
    return groupBy(results, "strategy", (cs) => {
      const runs = cs.flatMap((c) => c.runs);
      const ev = (id) => { const ms = cs.map((c) => (c.events[id] ? c.events[id].minutes : Infinity)); return { median: medianOrNull(ms), runMedian: medianOrNull(cs.map((c) => (c.events[id] ? c.events[id].run : Infinity))), reachedBy: `${ms.filter(isFinite).length}/${cs.length}` }; };
      const finale = runs.filter((r) => r.finaleSec != null);
      const order = Object.keys(cs[0].events).filter((k) => !/^wave\d+$|^finale$|^reach20$/.test(k));
      return {
        campaigns: cs.length, hours: spec.hours, totalRuns: runs.length,
        firstRun: { wave: quantile(cs.map((c) => c.runs[0].wave), 0.5), minutes: quantile(cs.map((c) => c.runs[0].minutes), 0.5), gears: quantile(cs.map((c) => c.runs[0].gears), 0.5) },
        milestonesMinutes: Object.fromEntries(["reach20", "finale", "wave30", "wave40", "wave50"].map((m) => [m, ev(m)])),
        unlocksMinutes: Object.fromEntries(order.map((id) => [id, ev(id)])),
        runMinutes: stats(runs.map((r) => r.minutes)), over10: `${runs.filter((r) => r.minutes > 10).length}/${runs.length}`,
        runsReachingFinale: { minutes: stats(finale.map((r) => r.minutes)), over10: `${finale.filter((r) => r.minutes > 10).length}/${finale.length}` },
        kingMole: { fightSecAll: stats(finale.map((r) => r.finaleSec)), fightSecWon: stats(finale.filter((r) => r.finaleWon).map((r) => r.finaleSec)),
          fightSecLost: stats(finale.filter((r) => !r.finaleWon).map((r) => r.finaleSec)), winRate: round(finale.filter((r) => r.finaleWon).length / Math.max(1, finale.length)) },
        bigRed: bossTable(runs.flatMap((r) => r.bossWaves)), bossEscapesPerRun: round(avg(runs.map((r) => r.bossEscapes))),
      };
    });
  }
}

const avg = (a) => (a.length ? a.reduce((x, y) => x + y, 0) / a.length : null);
const medianOrNull = (a) => { const m = quantile(a, 0.5); return isFinite(m) ? m : null; };
function groupBy(rows, key, fn) { const by = {}; for (const r of rows) (by[r[key]] = by[r[key]] || []).push(r); return Object.fromEntries(Object.entries(by).map(([k, v]) => [k, fn(v)])); }
// [wave, killed(0/1), seconds] -> kill rate and median wave length per mini-boss wave
function bossTable(rows) {
  const by = {};
  for (const [w, k, sec] of rows) { const b = (by[w] = by[w] || { n: 0, k: 0, secs: [] }); b.n++; b.k += k; b.secs.push(sec); }
  return Object.fromEntries(Object.entries(by).map(([w, b]) => [w, { waves: b.n, killRate: round(b.k / b.n), medianWaveSec: quantile(b.secs, 0.5) }]));
}

const KINDS = { runs: RunsKind, campaign: CampaignKind };

// ---------- SimJob: the saved spec ----------
class SimJob {
  constructor(spec) { this.spec = spec; }
  static create(name, o) {
    if (!KINDS[o.kind]) throw new Error(`unknown --kind ${o.kind} (use: ${Object.keys(KINDS).join(", ")})`);
    return new SimJob({ name, kind: o.kind, strategies: String(o.strategies || "casual,skilled").split(","), seeds: +(o.seeds || 20),
      hours: +(o.hours || 4), budgetSec: +(o.budget || 45), maxUnits: o["max-units"] ? +o["max-units"] : null, // null = no cap
      simArgs: o.sim ? String(o.sim).split(/\s+/).filter(Boolean) : [], created: new Date().toISOString() });
  }
  // tools/sim.js reads its flags from process.argv when it loads, so set them first.
  loadKind() {
    process.argv = [process.argv[0], path.join(__dirname, "sim.js"), ...this.spec.simArgs];
    return new KINDS[this.spec.kind](require("./sim.js"));
  }
  units() { return KINDS[this.spec.kind].prototype.units.call(null, this.spec); }
}

// ---------- ResultStore: everything on disk for one job ----------
class ResultStore {
  static STALE_LOCK_MS = 10 * 60 * 1000;
  constructor(name) { this.dir = path.join(OUT_ROOT, name); }
  file(f) { return path.join(this.dir, f); }
  write(f, data) { fs.mkdirSync(this.dir, { recursive: true }); const tmp = this.file(f + ".tmp"); fs.writeFileSync(tmp, JSON.stringify(data)); fs.renameSync(tmp, this.file(f)); }
  read(f) { return JSON.parse(fs.readFileSync(this.file(f), "utf8")); }
  exists() { return fs.existsSync(this.file("job.json")); }
  saveJob(job) { this.write("job.json", job.spec); }
  loadJob() { if (!this.exists()) throw new Error(`no job at ${this.dir} (run init first)`); return new SimJob(this.read("job.json")); }
  chunkFiles() { return fs.existsSync(this.dir) ? fs.readdirSync(this.dir).filter((f) => /^chunk-\d+\.json$/.test(f)).sort((a, b) => parseInt(a.slice(6)) - parseInt(b.slice(6))) : []; }
  chunks() { return this.chunkFiles().map((f) => this.read(f)); }
  nextUnit() { return this.chunks().reduce((m, c) => Math.max(m, c.to), 0); } // resume point
  saveChunk(chunk) { this.write(`chunk-${chunk.index}.json`, chunk); }
  // One chunk at a time per job: a lock file guards against two `next` commands at once.
  // A lock older than STALE_LOCK_MS (a killed command) is taken over.
  lock() {
    fs.mkdirSync(this.dir, { recursive: true });
    const f = this.file("lock");
    if (fs.existsSync(f) && Date.now() - fs.statSync(f).mtimeMs > ResultStore.STALE_LOCK_MS) fs.unlinkSync(f);
    try { fs.closeSync(fs.openSync(f, "wx")); } catch (e) { throw new Error(`job is busy (another chunk is running; ${f})`); }
    return () => { try { fs.unlinkSync(f); } catch (e) { /* already gone */ } };
  }
  // Chunks in unit order with any overlap dropped (so a duplicate chunk can never double-count).
  orderedChunks() {
    let covered = 0;
    return this.chunks().sort((a, b) => a.from - b.from).filter((c) => (c.from >= covered ? ((covered = c.to), true) : false));
  }
  saveSummary(s) { this.write("summary.json", s); }
}

// ---------- ChunkRunner: one chunk per command ----------
class ChunkRunner {
  constructor(job, store) { this.job = job; this.store = store; }
  runNext() {
    const unlock = this.store.lock();
    try { return this.runChunk(); } finally { unlock(); }
  }
  runChunk() {
    const units = this.job.units(), from = this.store.nextUnit();
    if (from >= units.length) return { done: true, total: units.length };
    const kind = this.job.loadKind(), t0 = Date.now(), results = [];
    const budgetSec = this.job.spec.budgetSec, maxUnits = this.job.spec.maxUnits || Infinity;
    let i = from;
    while (i < units.length && results.length < maxUnits && (Date.now() - t0) / 1000 < budgetSec) results.push(kind.run(units[i++], this.job.spec));
    const chunk = { index: this.store.chunkFiles().length + 1, from, to: i, seconds: round((Date.now() - t0) / 1000, 1), results };
    this.store.saveChunk(chunk);
    return { done: i >= units.length, chunk, total: units.length };
  }
}

// ---------- Summarizer: merge all chunks ----------
class Summarizer {
  constructor(job, store) { this.job = job; this.store = store; }
  merge() {
    const chunks = this.store.orderedChunks(), results = chunks.flatMap((c) => c.results), total = this.job.units().length;
    const summary = { job: this.job.spec.name, kind: this.job.spec.kind, units: `${results.length}/${total}`, complete: results.length >= total,
      chunks: chunks.length, simSeconds: round(chunks.reduce((a, c) => a + c.seconds, 0), 1), sim: this.job.spec.simArgs.join(" "),
      byStrategy: this.job.loadKind().summarize(results, this.job.spec) };
    this.store.saveSummary(summary);
    return summary;
  }
}

// ---------- CLI ----------
function parseFlags(argv) {
  const o = {};
  for (let i = 0; i < argv.length; i++) if (argv[i].startsWith("--")) { const v = argv[i + 1]; o[argv[i].slice(2)] = v === undefined || v.startsWith("--") && argv[i] !== "--sim" ? true : (i++, v); }
  return o;
}

if (require.main === module) {
  const [cmd, name, ...rest] = process.argv.slice(2);
  if (!cmd || !name) { console.log(fs.readFileSync(__filename, "utf8").split("\n").slice(1, 17).map((l) => l.replace(/^\/\/ ?/, "")).join("\n")); process.exit(1); }
  const store = new ResultStore(name);
  if (cmd === "init") {
    if (store.exists() && !rest.includes("--force")) { console.error(`job ${name} exists (add --force to overwrite; chunks are kept)`); process.exit(1); }
    const job = SimJob.create(name, parseFlags(rest));
    store.saveJob(job);
    console.log(`job ${name}: ${job.spec.kind}, ${job.units().length} units, ~${job.spec.budgetSec}s per chunk -> ${store.dir}`);
  } else if (cmd === "next") {
    let r;
    try { r = new ChunkRunner(store.loadJob(), store).runNext(); } catch (e) { console.error(e.message); process.exit(2); }
    if (!r.chunk) console.log(`done: all ${r.total} units finished (run merge)`);
    else console.log(`chunk ${r.chunk.index}: units ${r.chunk.from}-${r.chunk.to - 1} in ${r.chunk.seconds}s, ${r.chunk.to}/${r.total}${r.done ? " - done (run merge)" : " - run next again"}`);
  } else if (cmd === "status") {
    const job = store.loadJob(), n = store.nextUnit(), total = job.units().length;
    console.log(`${name}: ${n}/${total} units in ${store.chunkFiles().length} chunks${n >= total ? " (complete)" : ""}`);
  } else if (cmd === "merge") {
    const s = new Summarizer(store.loadJob(), store).merge();
    console.log(JSON.stringify(s, null, 1));
  } else { console.error(`unknown command ${cmd} (init | next | status | merge)`); process.exit(1); }
}

module.exports = { JobKind, RunsKind, CampaignKind, SimJob, ResultStore, ChunkRunner, Summarizer };
