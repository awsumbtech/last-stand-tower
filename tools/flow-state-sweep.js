#!/usr/bin/env node
// FlowStateSweep: finds every read or write of the run-flow state id through the compat API
// (`game.state`, `g.state`, `this.game.state`, `scene.state`, `this.state` in Game / DemoScene)
// in src/, tools/, sw.js and index.html, and checks that each one is listed with file:line in
// docs/OO-MIGRATION.md under "`game.state` is a compat getter/setter". Other `.state` fields
// (meta.state, Coconut, ShellShield, AudioContext, ServiceWorker) are classified and skipped.
//   node tools/flow-state-sweep.js          check (exit 1 on an unlisted site)
//   node tools/flow-state-sweep.js --list   print every `.state` site with its class
//                                            (flow | meta | comment | other)
const fs = require("fs"), path = require("path");

class FlowStateSweep {
  constructor(root = path.join(__dirname, "..")) {
    this.root = root;
    this.flowReceivers = new Set(["game", "g", "this.game", "scene"]);
    this.flowThisFiles = new Set(["src/game.js", "src/demo.js"]);
    this.metaReceivers = /(^|\.)(meta|m|api)$/;
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

  // file -> Set(line) listed in the doc's compat table.
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

  // { flow: [...sites], unlisted: [...sites] }
  check() {
    const doc = fs.readFileSync(path.join(this.root, "docs/OO-MIGRATION.md"), "utf8");
    const listed = this.listed(doc), flow = this.sites().filter((s) => s.kind === "flow");
    const unlisted = flow.filter((s) => !(listed.get(s.file) || new Set()).has(s.line));
    return { flow, unlisted };
  }

  run(argv) {
    if (argv.includes("--list")) { for (const s of this.sites()) console.log(`${s.kind.padEnd(7)} ${s.file}:${s.line}  ${s.key ? s.receiver : s.receiver + ".state"}`); return 0; }
    const { flow, unlisted } = this.check();
    for (const s of unlisted) console.log(`FAIL flow-state: ${s.file}:${s.line} reads/writes ${s.key ? s.receiver : s.receiver + ".state"} but is not listed in docs/OO-MIGRATION.md`);
    console.log(unlisted.length ? `\n${unlisted.length} FAILED` : `ALL PASS (${flow.length} compat game.state / scene.state sites, all listed with file:line)`);
    return unlisted.length ? 1 : 0;
  }
}

module.exports = FlowStateSweep;
if (require.main === module) process.exit(new FlowStateSweep().run(process.argv.slice(2)));
