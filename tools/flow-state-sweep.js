#!/usr/bin/env node
// FlowStateSweep: finds every read or write of the run-flow state id through the compat API
// (`game.state`, `g.state`, `this.game.state`, `scene.state`, `this.state` in Game / DemoScene)
// in src/, tools/, sw.js and index.html, and checks that each one is listed with file:line in
// docs/OO-MIGRATION.md under "`game.state` is a compat getter/setter". Other `.state` fields
// (meta.state, Coconut, ShellShield, AudioContext, ServiceWorker) are classified and skipped.
// It also fails on a stale row (a listed line that no longer has a site), and on any site in a
// file PR 8 / 8b cleared (`cleared`: render.js, FxDirector, DemoScene, the game-system objects,
// and PR 8b's world objects, render layers and FX drawers;
// game.js keeps only the constructor's compat write, game.js:32, until PR 9).
//   node tools/flow-state-sweep.js          check (exit 1 on an unlisted, stale or cleared-file site)
//   node tools/flow-state-sweep.js --list   print every `.state` site with its class
//                                            (flow | meta | comment | other)
const fs = require("fs"), path = require("path");

class FlowStateSweep {
  constructor(root = path.join(__dirname, "..")) {
    this.root = root;
    this.flowReceivers = new Set(["game", "g", "this.game", "scene"]);
    this.flowThisFiles = new Set(["src/game.js", "src/demo.js"]);
    this.metaReceivers = /(^|\.)(meta|m|api)$/;
    // Files with no compat site left after PR 8 / 8b (src/game.js: only the constructor line).
    this.cleared = ["src/render.js", "src/fx/FxDirector.js", "src/demo.js", "src/core/SceneFlags.js",
      "src/abilities/Ability.js", "src/abilities/Shockwave.js", "src/abilities/Freeze.js", "src/abilities/Overdrive.js",
      "src/abilities/AbilitySystem.js", "src/shop/ShopController.js", "src/core/RewardRules.js", "src/core/KillFeedback.js",
      "src/bosses/BossEventRouter.js", "src/bosses/FinaleController.js", "src/core/RunRecorder.js",
      "src/core/WorkshopController.js", "src/core/WaveFlow.js",
      // PR 8b
      "src/world.js", "src/core/EnemySpawner.js", "src/core/DamageSystem.js", "src/fx/FxSpawner.js", "src/fx/FxRenderer.js",
      "src/fx/draw/GlowSprites.js", "src/fx/draw/TowerGroundGlow.js", "src/fx/draw/ProjectileTrails.js", "src/fx/draw/ChainArcs.js",
      "src/fx/draw/TextGlows.js", "src/fx/draw/ParticleBatch.js", "src/fx/draw/ImpactPulses.js", "src/fx/draw/ImpactFlashes.js",
      "src/render/RenderLayer.js", "src/render/OverdriveRing.js", "src/render/BackdropLayer.js", "src/render/EnemyLayer.js",
      "src/render/TowerLayer.js", "src/render/FxLayer.js", "src/render/HudCanvasLayer.js", "src/render/OverlayLayer.js",
      "src/render/RenderPipeline.js",
      // PR 9
      "src/ui.js", "src/pwa.js",
      "src/ui/UiIcons.js", "src/ui/screens/Toast.js", "src/ui/UpdateNotifier.js", "src/ui/screens/Screen.js",
      "src/ui/screens/StartScreen.js", "src/ui/screens/ShopScreen.js", "src/ui/screens/PauseScreen.js", "src/ui/screens/ConfirmScreen.js",
      "src/ui/screens/ResultsScreen.js", "src/ui/screens/workshop/CardsTab.js", "src/ui/screens/workshop/UpgradesTab.js", "src/ui/screens/workshop/DeckTab.js",
      "src/ui/screens/workshop/CodexTab.js", "src/ui/screens/WorkshopScreen.js", "src/ui/screens/GotchaScreen.js", "src/ui/screens/ClearedScreen.js",
      "src/ui/screens/AbilityButton.js", "src/ui/screens/BossBar.js", "src/ui/screens/Hud.js", "src/ui/screens/SettingsToggles.js"];
    this.gameJsAllowed = [32];
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

  // { flow, unlisted, stale: ["file:line"], inCleared } (sites are { file, line, ... })
  check() {
    const doc = fs.readFileSync(path.join(this.root, "docs/OO-MIGRATION.md"), "utf8");
    const listed = this.listed(doc), flow = this.sites().filter((s) => s.kind === "flow");
    const unlisted = flow.filter((s) => !(listed.get(s.file) || new Set()).has(s.line));
    const at = new Set(flow.map((s) => s.file + ":" + s.line)), stale = [];
    for (const [file, lines] of listed) for (const n of lines) if (!at.has(file + ":" + n)) stale.push(file + ":" + n);
    const inCleared = flow.filter((s) => this.cleared.includes(s.file) || (s.file === "src/game.js" && !this.gameJsAllowed.includes(s.line)));
    return { flow, unlisted, stale, inCleared };
  }

  run(argv) {
    if (argv.includes("--list")) { for (const s of this.sites()) console.log(`${s.kind.padEnd(7)} ${s.file}:${s.line}  ${s.key ? s.receiver : s.receiver + ".state"}`); return 0; }
    const { flow, unlisted, stale, inCleared } = this.check();
    for (const s of unlisted) console.log(`FAIL flow-state: ${s.file}:${s.line} reads/writes ${s.key ? s.receiver : s.receiver + ".state"} but is not listed in docs/OO-MIGRATION.md`);
    for (const f of stale) console.log(`FAIL flow-state: docs/OO-MIGRATION.md lists ${f}, but that line has no compat site (stale row)`);
    for (const s of inCleared) console.log(`FAIL flow-state: ${s.file}:${s.line} uses the compat API in a file PR 8 / 8b cleared (use game.flow / SceneFlags)`);
    const bad = unlisted.length + stale.length + inCleared.length;
    console.log(bad ? `\n${bad} FAILED` : `ALL PASS (${flow.length} compat game.state / scene.state sites, all listed with file:line; 0 stale rows; 0 in the ${this.cleared.length} cleared files)`);
    return bad ? 1 : 0;
  }
}

module.exports = FlowStateSweep;
if (require.main === module) process.exit(new FlowStateSweep().run(process.argv.slice(2)));
