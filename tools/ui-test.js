#!/usr/bin/env node
// UI test (node, no browser): node tools/ui-test.js
// PR 9 split ui.js into one object per screen (src/ui/screens/*.js), switched by the state
// objects. This checks that:
//   1. Each UI object is one class in its own file (no loose functions), loaded in order by
//      index.html and cached by sw.js; UI (src/ui.js) only builds and switches them.
//   2. No UI file compares the run-flow state: the states say what the UI shows
//      (GameState.screen / showScreen, hudLive, runPaused, closePauseMenu), and every
//      ui.show() outside src/ui goes through a state's showScreen, except the two moments that
//      are not a state's own screen ("dying", and the Workshop opened over the results).
//   3. UpdateNotifier (was the pwa.js IIFE) registers the worker, offers the update through
//      its Toast, and reloads once on a later controller change.
// The DOM of every screen is compared with 2fb06e6 by tools/screen-snapshot-test.py.
const fs = require("fs"), path = require("path"), vm = require("vm");

class UiTest {
  constructor(root = path.join(__dirname, "..")) {
    this.root = root;
    this.passes = 0;
    this.fails = 0;
    this.FILES = ["ui/UiIcons.js", "ui/screens/Toast.js", "ui/UpdateNotifier.js", "ui/screens/Screen.js", "ui/screens/StartScreen.js", "ui/screens/ShopScreen.js",
      "ui/screens/PauseScreen.js", "ui/screens/ConfirmScreen.js", "ui/screens/ResultsScreen.js", "ui/screens/workshop/CardsTab.js", "ui/screens/workshop/UpgradesTab.js",
      "ui/screens/workshop/DeckTab.js", "ui/screens/workshop/CodexTab.js", "ui/screens/WorkshopScreen.js", "ui/screens/GotchaScreen.js", "ui/screens/ClearedScreen.js",
      "ui/screens/AbilityButton.js", "ui/screens/BossBar.js", "ui/screens/Hud.js", "ui/screens/SettingsToggles.js", "ui.js"];
    this.IDS = ["menu", "playing", "paused", "celebrate", "upgrade", "gotcha", "gameover", "workshop", "victory", "cleared"];
  }

  ok(c, m) { if (c) this.passes++; else { this.fails++; console.log("FAIL " + m); } }
  read(rel) { return fs.readFileSync(path.join(this.root, rel), "utf8"); }

  checkFiles() {
    const html = this.read("index.html"), sw = this.read("sw.js"), scripts = [...html.matchAll(/<script src="([^"]+)"/g)].map((m) => m[1]);
    for (const f of this.FILES) {
      const src = this.read("src/" + f), classes = [...src.matchAll(/\bclass (\w+)(?: extends [\w.]+)? \{/g)].map((c) => c[1]);
      const name = f === "ui.js" ? "UI" : path.basename(f, ".js");
      this.ok(classes.length === 1 && classes[0] === name && !/^(function |const \w+ = (\(|function)|\(function)/m.test(src) && !/^const /m.test(src), `files: src/${f} holds one class, ${name}, and no loose function or constant`);
      this.ok(scripts.includes("src/" + f) && sw.includes(`"src/${f}"`), `files: src/${f} is loaded by index.html and cached by sw.js`);
    }
    const at = (f) => scripts.indexOf("src/" + f);
    this.ok(this.FILES.every((f, i) => i === 0 || at(this.FILES[i - 1]) < at(f)) && at("ui.js") < at("game.js") && at("ui/UpdateNotifier.js") < at("pwa.js"), "files: Screen loads before the screens, the tabs before WorkshopScreen, AbilityButton / BossBar before Hud, all before ui.js and game.js");
    const styles = this.read("styles.html");
    this.ok(styles.indexOf('src="src/ui/screens/Toast.js"') < styles.indexOf('src="src/ui/UpdateNotifier.js"') && styles.indexOf('src="src/ui/UpdateNotifier.js"') < styles.indexOf('src="src/pwa.js"'), "files: styles.html loads Toast and UpdateNotifier before pwa.js");
    this.ok(this.read("src/pwa.js").split("\n").filter((l) => l.trim() && !l.startsWith("//")).join() === "new LST.UpdateNotifier(window).start();", "pwa.js: only starts the UpdateNotifier (the IIFE is gone)");
    const ui = this.read("src/ui.js");
    for (const m of ["renderStart", "renderShop", "renderWorkshop", "updateHud", "updateToggles", "toast"]) this.ok(new RegExp(`^  ${m}\\([^)]*\\) \\{ [^\\n]* \\}$`, "m").test(ui), `ui.js: UI.${m} is a one-line hand-off to its object`);
    this.ok(!/innerHTML|textContent|addEventListener\("click", \(\) => game\./.test(ui.replace(/document\.addEventListener\("click"[\s\S]*?\}\);/, "")), "ui.js: UI builds no screen markup and wires no screen buttons (the screen objects do)");
  }

  checkNoStateChecks() {
    const flowRead = /\b(game|g|this\.game|scene)\.state\b|flow\.(is|id)\b/;
    for (const f of this.FILES) this.ok(!flowRead.test(this.read("src/" + f)), `state: src/${f} does not compare the run-flow state (reads flow.current's flags)`);
    const shows = [];
    const walk = (d) => { for (const e of fs.readdirSync(path.join(this.root, d), { withFileTypes: true })) { const p = d + "/" + e.name; if (e.isDirectory()) walk(p); else if (p.endsWith(".js") && !p.startsWith("src/ui")) this.read(p).split("\n").forEach((l, i) => { if (/\bui\.show\(/.test(l)) shows.push([p, i + 1, l.trim()]); }); } };
    walk("src");
    const allowed = shows.filter(([p, , l]) => /showScreen\(game\) \{ game\.ui\.show\(this\.screen\); \}|closePauseMenu\(game\) \{ game\.ui\.show\("start"\); \}|ui\.show\("dying"\)|ui\.show\("workshop"\)/.test(l));
    this.ok(shows.length === allowed.length && shows.length === 4, `state: outside src/ui, ui.show() is only GameState.showScreen / closePauseMenu and the "dying" and Workshop-over-results moments (${shows.map(([p, n]) => p + ":" + n).join(", ")})`);
  }

  checkStates() {
    const sb = { console, Math }; sb.window = sb; vm.createContext(sb);
    for (const f of ["config.js", "core/SceneFlags.js", "core/GameState.js", "core/GameStateMachine.js"]) vm.runInContext(this.read("src/" + f), sb, { filename: f });
    for (const f of fs.readdirSync(path.join(this.root, "src/core/states"))) vm.runInContext(this.read("src/core/states/" + f), sb, { filename: f });
    sb.LST.audio = { duckMusic() {} };
    const flow = new sb.LST.GameStateMachine(), shown = [];
    const game = { flow, ui: { show: (n) => shown.push(n) }, togglePause() { flow.current.togglePause(game); } };
    const want = { menu: "start", playing: null, paused: "pause", celebrate: null, upgrade: "upgrade", gotcha: "gotcha", gameover: "results", workshop: "workshop", victory: null, cleared: "cleared" };
    for (const id of this.IDS) {
      flow.set(id); shown.length = 0;
      flow.current.showScreen(game);
      const live = id === "playing" || id === "paused";
      this.ok(shown.map(String).join() === String(want[id]) && flow.current.hudLive === live && flow.current.runPaused === (id === "paused"), `state: ${id} shows ${want[id]}, hudLive ${live}, runPaused ${id === "paused"} (old ui.js:555 / 190 checks)`);
      shown.length = 0; flow.current.closePauseMenu(game);
      const after = id === "paused" ? "playing" : id;
      const close = id === "paused" ? "null" : id === "gameover" ? "results" : "start";
      this.ok(flow.id === after && shown.map(String).join() === close, `state: Resume / Done in ${id} -> ${close} (old ui.js:132), state ${flow.id}`);
    }
  }

  checkUpdateNotifier() {
    const sb = { console, Math }; sb.window = sb; vm.createContext(sb);
    vm.runInContext("var LST = window.LST = {};", sb);
    for (const f of ["ui/screens/Toast.js", "ui/UpdateNotifier.js"]) vm.runInContext(this.read("src/" + f), sb, { filename: f });
    const make = (controller) => {
      const ev = {}, log = [];
      const on = (o) => (o.addEventListener = (k, fn) => { (ev[k] = ev[k] || []).push(fn); }, o);
      const waiting = { postMessage: (m) => log.push("post " + m.type) };
      const reg = on({ waiting, installing: null, update: () => ({ catch() {} }) });
      const sw = on({ controller, register: (u, o) => { log.push("register " + u + " " + o.scope); return { then: (fn) => { fn(reg); return { catch() {} }; } }; } });
      const win = on({ navigator: { serviceWorker: sw }, location: { protocol: "https:", reload: () => log.push("reload") }, document: on({ hidden: false }) });
      const toast = { offer: (t, l, fn) => { log.push(`offer ${t} ${l}`); fn(); } };
      return { ev, log, win, toast, fire: (k) => (ev[k] || []).forEach((fn) => fn()) };
    };
    { const t = make(null); new sb.LST.UpdateNotifier(t.win, t.toast).start(); t.fire("load"); t.fire("controllerchange"); t.fire("controllerchange");
      this.ok(t.log.join("|") === "register sw.js ./|reload", `pwa: first visit registers sw.js, skips the first controller change, reloads on the next (${t.log.join("|")})`); }
    { const t = make({}); new sb.LST.UpdateNotifier(t.win, t.toast).start(); t.fire("load"); t.fire("controllerchange"); t.fire("controllerchange");
      this.ok(t.log.join("|") === "register sw.js ./|offer New version available! Refresh|post SKIP_WAITING|reload", `pwa: a waiting worker is offered through the Toast; Refresh posts SKIP_WAITING; one reload (${t.log.join("|")})`); }
    { const t = make({}); t.win.location.protocol = "file:"; new sb.LST.UpdateNotifier(t.win, t.toast).start(); this.ok(!t.ev.load, "pwa: does nothing on file:"); }
  }

  run() {
    this.checkFiles();
    this.checkNoStateChecks();
    this.checkStates();
    this.checkUpdateNotifier();
    console.log(this.fails ? `\n${this.fails} FAILED (${this.passes} passed)` : `\nALL PASS (${this.passes} passed)`);
    return this.fails ? 1 : 0;
  }
}

module.exports = UiTest;
if (require.main === module) process.exit(new UiTest().run());
