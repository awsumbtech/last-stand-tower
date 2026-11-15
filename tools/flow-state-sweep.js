#!/usr/bin/env node
// FlowStateSweep: finds every read or write of the run-flow state id through the old compat API
// (`game.state`, `g.state`, `this.game.state`, `scene.state`, `this.state` in Game / DemoScene, and the
// "state" key on a game object) in src/, tools/, sw.js and index.html. PR 9 removed the compat
// getter/setter (game.js:40-41 at 2fb06e6), so the sweep expects 0 sites and fails on any: read or
// set the state with game.flow (is / set / id / current) and the SceneFlags.
// Other `.state` fields (meta.state, Coconut, ShellShield, AudioContext, ServiceWorker) are classified
// and skipped. One site is not a Game: flow-test's spyGame stub defines its own "state" getter because
// the keyboard oracle it feeds is the old src/main.js@99ea184, which reads game.state. That one line is
// allowed by its exact text (`oracleStub`), and only in tools/flow-test.js.
// It also fails if docs/OO-MIGRATION.md still lists a compat row (file:line) under
// "`game.state` is a compat getter/setter".
//   node tools/flow-state-sweep.js          check (exit 1 on any compat site or listed row)
//   node tools/flow-state-sweep.js --list   print every `.state` site with its class
//                                            (flow | meta | comment | other)
const fs = require("fs"), path = require("path");

class FlowStateSweep {
  constructor(root = path.join(__dirname, "..")) {
    this.root = root;
    this.flowReceivers = new Set(["game", "g", "this.game", "scene"]);
    this.flowThisFiles = new Set(["src/game.js", "src/demo.js"]);
    this.metaReceivers = /(^|\.)(meta|m|api)$/;
    // The old-main.js oracle's stub game (not a Game): its own getter, so the old code can read it.
    this.oracleStub = { file: "tools/flow-test.js", text: 'Object.defineProperty(g, "state", { get() { return this.flow.id; } });' };
  }

  files() {
    const out = [], walk = (dir) => {
      for (const e of fs.readdirSync(path.join(this.root, dir), { withFileTypes: true })) {
        const rel = dir + "/" + e.name;
        if (e.isDirectory()) walk(rel);
        else if (/\.(js|py)$/.test(e.name)) out.push(rel);
      }
    };
    walk("src"); walk("tools");
    // This file only names the patterns it looks for.
    return out.concat(["sw.js", "index.html"]).filter((f) => f !== "tools/flow-state-sweep.js").sort();
  }

  // Every `<receiver>.state` on every line, with its class: flow | meta | other.
  sites() {
    const out = [];
    for (const file of this.files()) {
      const lines = fs.readFileSync(path.join(this.root, file), "utf8").split("\n");
      lines.forEach((text, i) => {
        for (const m of text.matchAll(/((?:[A-Za-z_$][\w$]*\.)*[A-Za-z_$][\w$]*)\.state\b(?![\w$])/g)) {
          out.push({ file, line: i + 1, receiver: m[1], kind: this.classify(file, m[1], text, m.index), text: text.trim() });
        }
        // The "state" key by name (Object.defineProperty / hasOwnProperty on a game object).
        for (const m of text.matchAll(/\b(game|g),\s*"state"/g)) out.push({ file, line: i + 1, receiver: m[1] + '["state"]', key: true, kind: "flow", text: text.trim() });
      });
    }
    return out;
  }

  classify(file, receiver, text, at) {
    const after = text.slice(at + receiver.length + 6), before = text.slice(0, at);
    if (/\/\/|^\s*\*|^\s*#/.test(before)) return "comment"; // prose, not a read or write
    if (this.metaReceivers.test(receiver) || /meta$/.test(receiver) || (receiver === "this" && file === "src/meta.js")) return "meta";
    if (/^\s*[.[]/.test(after)) return "other"; // a field of some other state object
    if (this.flowReceivers.has(receiver)) return "flow";
    if (receiver === "this" && this.flowThisFiles.has(file)) return "flow";
    return "other";
  }

  // file -> Set(line) listed in the doc's compat table (there should be none left).
  listed(docText) {
    const start = docText.indexOf("#### `game.state` is a compat getter/setter");
    const end = docText.indexOf("\n### ", start + 1);
    const table = start < 0 ? "" : docText.slice(start, end < 0 ? undefined : end);
    const map = new Map();
    for (const row of table.split("\n").filter((l) => l.startsWith("| `"))) {
      const first = row.split("|")[1];
      for (const m of first.matchAll(/`([^`:]+):([\d,\s-]+)`/g)) {
        const file = /^(tools|src)\//.test(m[1]) ? m[1] : "src/" + m[1];
        const set = map.get(file) || new Set();
        for (const part of m[2].split(",").map((p) => p.trim()).filter(Boolean)) {
          const [a, b] = part.split("-").map(Number);
          for (let n = a; n <= (b || a); n++) set.add(n);
        }
        map.set(file, set);
      }
    }
    return map;
  }

  isOracleStub(site) { return site.file === this.oracleStub.file && site.text === this.oracleStub.text; }

  // { flow: every compat site (must be empty), stub: the oracle stub lines, rows: ["file:line"] still listed }
  check() {
    const doc = fs.readFileSync(path.join(this.root, "docs/OO-MIGRATION.md"), "utf8");
    const all = this.sites().filter((s) => s.kind === "flow");
    const stub = all.filter((s) => this.isOracleStub(s)), flow = all.filter((s) => !this.isOracleStub(s));
    const rows = [];
    for (const [file, lines] of this.listed(doc)) for (const n of lines) rows.push(file + ":" + n);
    return { flow, stub, rows };
  }

  run(argv) {
    if (argv.includes("--list")) { for (const s of this.sites()) console.log(`${s.kind.padEnd(7)} ${s.file}:${s.line}  ${s.key ? s.receiver : s.receiver + ".state"}${this.isOracleStub(s) ? "  (oracle stub, allowed)" : ""}`); return 0; }
    const { flow, stub, rows } = this.check();
    for (const s of flow) console.log(`FAIL flow-state: ${s.file}:${s.line} uses ${s.key ? s.receiver : s.receiver + ".state"}; the compat API is gone (use game.flow / SceneFlags)`);
    if (stub.length > 1) console.log(`FAIL flow-state: the oracle stub line appears ${stub.length} times (allowed once)`);
    for (const r of rows) console.log(`FAIL flow-state: docs/OO-MIGRATION.md still lists ${r} as a compat site`);
    const bad = flow.length + (stub.length > 1 ? 1 : 0) + rows.length;
    console.log(bad ? `\n${bad} FAILED` : `ALL PASS (0 compat game.state / scene.state sites in src/, tools/, sw.js and index.html; ${stub.length} oracle stub for main.js@99ea184 allowed; 0 compat rows in docs/OO-MIGRATION.md)`);
    return bad ? 1 : 0;
  }
}

module.exports = FlowStateSweep;
if (require.main === module) process.exit(new FlowStateSweep().run(process.argv.slice(2)));
