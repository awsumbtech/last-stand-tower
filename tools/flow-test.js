#!/usr/bin/env node
// Game flow test (node, no browser): node tools/flow-test.js
//   1. Every run-flow state is its own GameState class in its own file, registered by id.
//   2. The game.state compat getter/setter reads / sets the GameStateMachine; unknown ids throw.
//      State classes use game.flow (is / set), not the compat API.
//   3. The run clock counts in exactly playing / celebrate / upgrade / victory.
//   4. InputController does what the old main.js keydown chain did, for every state x key x
//      resultsDelay x Workshop-open combination (the reference is src/main.js@99ea184, loaded with git show).
//   5. Hiding the tab pauses only while playing (and matches main.js@99ea184).
//   6. Every remaining compat game.state / scene.state site is listed in docs/OO-MIGRATION.md (FlowStateSweep).
const fs = require("fs"), path = require("path"), vm = require("vm"), childProcess = require("child_process");
const FlowStateSweep = require("./flow-state-sweep.js");

class FlowTest {
  constructor(root = path.join(__dirname, "..")) {
    this.root = root;
    this.passes = 0;
    this.fails = 0;
    this.IDS = ["menu", "playing", "paused", "celebrate", "upgrade", "gotcha", "gameover", "workshop", "victory", "cleared"];
    this.CLOCK = ["playing", "celebrate", "upgrade", "victory"];
    this.ORACLE_REV = "99ea184";
    this.ACTIONS = ["closeWorkshop", "togglePause", "openWorkshop", "toggleSpeed", "useAbility", "continueEndless", "dismissGotcha", "newGame", "leaveShop", "takeCard", "rerollShop", "repairTower"];
    this.KEYS = ["Escape", "KeyW", "Space", "KeyP", "KeyF", "KeyQ", "KeyE", "Enter", "Digit1", "Digit2", "Digit3", "Digit4", "Numpad1", "Numpad3", "KeyR", "KeyH", "KeyM", "KeyA", "ArrowUp"];
  }

  ok(c, m) { if (c) this.passes++; else { this.fails++; console.log("FAIL " + m); } }
  read(rel) { return fs.readFileSync(path.join(this.root, rel), "utf8"); }

  // The game in a node sandbox, with the UI / audio / haptics stubbed.
  load() {
    const FILES = JSON.parse(fs.readFileSync(path.join(__dirname, "sim.js"), "utf8").match(/const FILES = (\[[^\]]*\])/)[1]);
    const store = {};
    const sb = { Math, console, localStorage: { getItem: (k) => (k in store ? store[k] : null), setItem: (k, v) => { store[k] = String(v); } } };
    sb.window = sb; vm.createContext(sb);
    for (const f of FILES) vm.runInContext(this.read("src/" + f), sb, { filename: f });
    vm.runInContext(this.read("src/core/InputController.js"), sb, { filename: "InputController.js" });
    const LST = sb.LST;
    LST.UI = class { show() {} updateHud() {} renderShop() {} };
    LST.audio = { play() {}, startMusic() {}, stopMusic() {}, duckMusic() {}, setTension() {} };
    LST.haptics = { buzz() {} };
    this.LST = LST;
    this.game = new LST.Game({ halfW: 310, halfH: 650 });
    this.game.reset();
  }

  // 1-2. classes, files, registry, compat getter/setter, state classes on the flow API
  checkClasses() {
    const { LST, game, IDS } = this, html = this.read("index.html"), sw = this.read("sw.js");
    const types = LST.GameStateMachine.types;
    this.ok(Object.keys(types).sort().join() === [...IDS].sort().join(), "flow: exactly these states are registered: " + IDS.join(", "));
    for (const id of IDS) {
      const C = types[id], file = "src/core/states/" + C.name + ".js";
      this.ok(C.prototype instanceof LST.GameState && C.id === id, `flow: ${id} is a GameState subclass (${C.name})`);
      this.ok(fs.existsSync(path.join(this.root, file)) && html.includes(`src="${file}"`) && sw.includes(`"${file}"`), `flow: ${C.name} has its own file, loaded by index.html and cached by sw.js`);
      this.ok(!/\bgame\.state\b/.test(this.read(file)), `flow: ${C.name} uses game.flow, not the game.state compat API`);
    }
    this.ok(["src/core/GameState.js", "src/core/GameStateMachine.js", "src/core/InputController.js"].every((f) => html.includes(`src="${f}"`) && sw.includes(`"${f}"`)), "flow: GameState, GameStateMachine, InputController are loaded and cached");
    this.ok(html.indexOf('src="src/core/states/ClearedState.js"') < html.indexOf('src="src/game.js"') && html.indexOf('src="src/core/GameStateMachine.js"') < html.indexOf('src="src/core/states/MenuState.js"'), "flow: script order machine -> states -> game.js");
    this.ok(game.state === "menu" && game.flow.current instanceof LST.MenuState && game.flow.is("menu") && !game.flow.is("playing"), "flow: a new game starts in MenuState; flow.is(\"menu\") and the compat game.state read \"menu\"");
    game.state = "upgrade"; this.ok(game.flow.current instanceof LST.ShopState && game.state === "upgrade", "flow: the compat setter game.state = \"upgrade\" enters ShopState");
    { let threw = false; try { game.state = "nope"; } catch (e) { threw = true; } this.ok(threw && game.state === "upgrade", "flow: an unknown state id throws and leaves the state as it was"); }
    this.ok(!Object.prototype.hasOwnProperty.call(game, "state"), "flow: state is not a loose field on Game (compat getter over the machine)");
    const main = this.read("src/main.js");
    this.ok(!/game\.state\s*===/.test(main) && !/addEventListener\("keydown"/.test(main) && /new LST\.InputController/.test(main), "flow: main.js has no state switch or keydown handler; it creates an InputController");
    const gsrc = this.read("src/game.js");
    const upd = gsrc.slice(gsrc.indexOf("  update(dt) {"), gsrc.indexOf("  step(dt) {"));
    this.ok(!/this\.state\s*[!=]==/.test(upd) && /this\.flow\.update\(this, dt\)/.test(upd), "flow: Game.update has no state string checks; it calls flow.update");
  }

  // 3. run clock (states stubbed so only the clock moves) and the per-state updates
  checkUpdates() {
    const { game, IDS, CLOCK } = this;
    for (const id of IDS) {
      const s = game.flow.get(id), keep = s.update; s.update = () => {};
      game.flow.set(id); game.runTime = 0; game.hitStop = 0; game.update(0.5); s.update = keep;
      this.ok((game.runTime === 0.5) === CLOCK.includes(id), `flow: run clock ${CLOCK.includes(id) ? "counts" : "stops"} in ${id}`);
    }
    { game.flow.set("playing"); game.runTime = 0; game.hitStop = 0.2; game.update(0.1); this.ok(game.runTime === 0 && Math.abs(game.hitStop - 0.1) < 1e-12, "flow: hit-stop freezes the run clock and states"); game.hitStop = 0; }
    { game.flow.set("gameover"); let shown = 0; const k = game.showResults; game.showResults = () => { shown++; }; game.resultsDelay = 0.3; game.update(0.2); this.ok(shown === 0, "flow: gameover waits out resultsDelay"); game.update(0.2); this.ok(shown === 1, "flow: gameover shows the results once resultsDelay runs out"); game.update(0.2); this.ok(shown === 1, "flow: results show once"); game.showResults = k; }
    { game.flow.set("celebrate"); let fin = 0; const k = game.finishCelebration; game.finishCelebration = () => { fin++; }; game.celebrateTimer = 0.15; game.update(0.1); game.update(0.1); this.ok(fin === 1, "flow: celebrate calls finishCelebration when its timer ends"); game.finishCelebration = k; }
    { game.flow.set("victory"); game.victoryTimer = 0.05; game.update(0.1); this.ok(game.flow.is("cleared"), "flow: victory moves to cleared when its timer ends"); }
  }

  // The oracle is the real old code: the keydown + visibilitychange listeners of src/main.js at
  // main 99ea184 (the last main before PR 7), loaded with `git show` and run against stub DOM /
  // game objects. Nothing is copied.
  loadOracle() {
    const rev = this.ORACLE_REV;
    let src;
    try { src = childProcess.execFileSync("git", ["show", rev + ":src/main.js"], { cwd: this.root, encoding: "utf8", stdio: ["ignore", "pipe", "pipe"] }); }
    catch (err) { console.log(`FAIL oracle: git show ${rev}:src/main.js failed (needs full git history, e.g. actions/checkout fetch-depth: 0)`); process.exit(1); }
    const cur = { g: null, ws: false, settings: null, hidden: false }, listeners = {}, docListeners = {};
    const proxyGame = new Proxy({}, { get: (t, k) => cur.g[k], set: (t, k, v) => { cur.g[k] = v; return true; } });
    const sb = {
      URLSearchParams, location: { search: "" }, performance: { now: () => 0 }, requestAnimationFrame() {},
      document: {
        getElementById: (id) => (id === "screen-workshop" ? { classList: { contains: (c) => c === "hidden" && !cur.ws } } : {}),
        addEventListener: (ev, fn) => { docListeners[ev] = fn; }, get hidden() { return cur.hidden; },
      },
      LST: {
        ThemeSelector: { pick: () => ({}) }, CONFIG: { MAX_DT: 0.05 },
        Renderer: class { resize() {} }, Game: function () { return proxyGame; },
        audio: { startMusic() {}, unlock() {}, unlocked: true },
        settings: { toggle: (k) => cur.settings.toggle(k) },
      },
    };
    sb.window = { addEventListener: (ev, fn, capture) => { if (!capture) listeners[ev] = fn; }, removeEventListener() {} };
    vm.createContext(sb);
    vm.runInContext(src, sb, { filename: `main.js@${rev}` });
    if (!listeners.keydown || !docListeners.visibilitychange) { console.log(`FAIL oracle: main.js@${rev} registered no keydown / visibilitychange listener`); process.exit(1); }
    this.oracle = {
      keyDown(game, e, inWorkshop, settings) { cur.g = game; cur.ws = inWorkshop; cur.settings = settings; listeners.keydown(e); },
      visibility(game, hidden) { cur.g = game; cur.hidden = hidden; docListeners.visibilitychange(); },
    };
    this.ok(true, `oracle: loaded the keydown + visibilitychange listeners from src/main.js@${rev} via git show`);
  }

  // A stub game that logs the actions it is asked to do. The old main.js reads game.state, so the
  // stub keeps that one getter for the oracle.
  spyGame(id, resultsDelay) {
    const log = [], g = { flow: new this.LST.GameStateMachine(), resultsDelay };
    Object.defineProperty(g, "state", { get() { return this.flow.id; } });
    g.flow.set(id);
    for (const a of this.ACTIONS) g[a] = (...args) => { log.push(a + "(" + args.join(",") + ")"); };
    return { g, log };
  }

  // 4. InputController == the old main.js keydown chain
  checkKeys() {
    let combos = 0, same = 0;
    for (const id of this.IDS) for (const code of this.KEYS) for (const rd of [0, 0.5]) for (const ws of [false, true]) {
      const A = this.spyGame(id, rd), B = this.spyGame(id, rd), sa = [], sb2 = [];
      const ea = { code, preventDefault() { sa.push("pd"); } }, eb = { code, preventDefault() { sb2.push("pd"); } };
      this.oracle.keyDown(A.g, ea, ws, { toggle: (k) => A.log.push("toggle(" + k + ")") });
      new this.LST.InputController(B.g, { settings: { toggle: (k) => B.log.push("toggle(" + k + ")") }, isWorkshopOpen: () => ws }).keyDown(eb);
      combos++;
      const eq = A.log.join() === B.log.join() && sa.join() === sb2.join();
      if (eq) same++; else console.log(`  differs: ${id} ${code} resultsDelay=${rd} workshop=${ws}: old [${A.log}] new [${B.log}]`);
    }
    this.ok(same === combos, `input: InputController matches the old keydown chain in all ${combos} state x key x resultsDelay x workshop cases`);
  }

  // 5. hidden tab
  checkHiddenTab() {
    const IC = this.LST.InputController;
    for (const id of this.IDS) { const { g, log } = this.spyGame(id, 0); new IC(g, {}).visibilityChanged(true); this.ok((log.join() === "togglePause()") === (id === "playing"), `input: hiding the tab ${id === "playing" ? "pauses" : "does nothing"} in ${id}`); }
    for (const id of this.IDS) for (const hidden of [true, false]) { const A = this.spyGame(id, 0), B = this.spyGame(id, 0); this.oracle.visibility(A.g, hidden); new IC(B.g, {}).visibilityChanged(hidden); this.ok(A.log.join() === B.log.join(), `input: tab ${hidden ? "hidden" : "shown"} in ${id} matches main.js@${this.ORACLE_REV}`); }
    { const { g, log } = this.spyGame("playing", 0); new IC(g, {}).visibilityChanged(false); this.ok(!log.length, "input: showing the tab again does nothing"); }
  }

  // 6. every compat site is listed in the doc
  checkSweep() {
    const { flow, unlisted } = new FlowStateSweep(this.root).check();
    for (const s of unlisted) console.log(`  unlisted: ${s.file}:${s.line} ${s.key ? s.receiver : s.receiver + ".state"}`);
    this.ok(flow.length > 0 && !unlisted.length, `sweep: all ${flow.length} compat game.state / scene.state sites are listed with file:line in docs/OO-MIGRATION.md`);
  }

  run() {
    this.load();
    this.checkClasses();
    this.checkUpdates();
    this.loadOracle();
    this.checkKeys();
    this.checkHiddenTab();
    this.checkSweep();
    console.log(this.fails ? `\n${this.fails} FAILED (${this.passes} passed)` : `\nALL PASS (${this.passes} passed)`);
    return this.fails ? 1 : 0;
  }
}

process.exit(new FlowTest().run());
