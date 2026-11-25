#!/usr/bin/env node
// Game flow test (node, no browser): node tools/flow-test.js
//   1. Every run-flow state is its own GameState class in its own file, registered by id.
//   2. Game has no compat state getter / setter (removed in PR 9): game.flow (is / set / id) is the
//      only way to read or set the run state; unknown ids throw. State classes use game.flow.
//   3. The run clock counts in exactly playing / celebrate / upgrade / victory.
//   4. InputController does what the old main.js keydown chain did, for every state x key x
//      resultsDelay x Workshop-open combination (the reference is src/main.js@99ea184, loaded with git show).
//   5. Hiding the tab pauses only while playing (and matches main.js@99ea184).
//   6. FlowStateSweep finds 0 compat state sites in src/, tools/, sw.js and index.html.
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
    vm.runInContext(this.read("src/core/SkipClickGuard.js"), sb, { filename: "SkipClickGuard.js" });
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
      this.ok(!/\bgame\.state\b/.test(this.read(file)), `flow: ${C.name} uses game.flow (no compat state reads)`);
    }
    this.ok(["src/core/GameState.js", "src/core/GameStateMachine.js", "src/core/SkipClickGuard.js", "src/core/InputController.js"].every((f) => html.includes(`src="${f}"`) && sw.includes(`"${f}"`)), "flow: GameState, GameStateMachine, SkipClickGuard, InputController are loaded and cached");
    this.ok(html.indexOf("SkipClickGuard.js") < html.indexOf("InputController.js"), "flow: SkipClickGuard loads before InputController");
    this.ok(html.indexOf('src="src/core/states/ClearedState.js"') < html.indexOf('src="src/game.js"') && html.indexOf('src="src/core/GameStateMachine.js"') < html.indexOf('src="src/core/states/MenuState.js"'), "flow: script order machine -> states -> game.js");
    this.ok(game.flow.id === "menu" && game.flow.current instanceof LST.MenuState && game.flow.is("menu") && !game.flow.is("playing"), "flow: a new game starts in MenuState; flow.is(\"menu\") and flow.id read \"menu\"");
    game.flow.set("upgrade"); this.ok(game.flow.current instanceof LST.ShopState && game.flow.id === "upgrade", "flow: flow.set(\"upgrade\") enters ShopState");
    { let threw = false; try { game.flow.set("nope"); } catch (e) { threw = true; } this.ok(threw && game.flow.id === "upgrade", "flow: an unknown state id throws and leaves the state as it was"); }
    this.ok(!("state" in game) && Object.getOwnPropertyDescriptor(LST.Game.prototype, "state") === undefined, "flow: the compat state getter / setter is gone (\"state\" in game is false)");
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
    { game.flow.set("celebrate"); let fin = 0; const k = game.finishCelebration; game.finishCelebration = () => { fin++; game.flow.set("upgrade"); }; game.celebrateTimer = 1.6; const st = game.flow.current; this.ok(st.skipWait(game) && fin === 1 && game.celebrateTimer === 0, "flow: a skipWait during celebrate opens the shop immediately"); game.finishCelebration = k; }
    { game.flow.set("gameover"); let shown = 0; const k = game.showResults; game.showResults = () => { shown++; game.resultsDelay = 0; }; game.resultsDelay = 1.1; const st = game.flow.current; this.ok(st.skipWait(game) && shown === 1 && game.resultsDelay === 0, "flow: a skipWait during the death wait shows the results immediately"); game.update(0.2); this.ok(shown === 1, "flow: skipWait does not show the results twice"); game.showResults = k; }
    { const ic = new this.LST.InputController(game); game.flow.set("celebrate"); let fin = 0; const k = game.finishCelebration; game.finishCelebration = () => { fin++; game.celebrateTimer = 0; }; game.celebrateTimer = 1.6; ic.pointerDown({ target: { closest: () => null } }); this.ok(fin === 1, "input: a canvas tap skips the wave-clear wait"); ic.pointerDown({ target: { closest: (s) => s.includes("button") ? {} : null } }); this.ok(fin === 1, "input: a button tap does not skip again"); game.finishCelebration = k; }
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


  // A window stub that records capture and bubble listeners so a skip's trailing click can be dispatched.
  fakeWin() {
    const listeners = [];
    return {
      addEventListener(type, fn, opts) {
        listeners.push({ type, fn, capture: opts === true || !!(opts && opts.capture) });
      },
      fire(type, e) {
        for (const l of listeners) { if (l.type === type && l.capture) { l.fn(e); if (e._stop) return; } }
        for (const l of listeners) { if (l.type === type && !l.capture) { l.fn(e); if (e._stop) return; } }
      },
    };
  }
  pointerEv(timeStamp) {
    return {
      target: { closest: () => null },
      timeStamp: timeStamp == null ? 0 : timeStamp,
      preventDefault() { this.pd = true; },
      stopPropagation() { this._stop = true; },
      stopImmediatePropagation() { this._stop = true; },
    };
  }

  // Skip taps must not click through to the shop or results. These fail without SkipClickGuard.
  checkSkipClicks() {
    const { game, LST } = this;

    { // skip-then-shop: the trailing click does not hit the shop; a second tap does
      game.flow.set("celebrate"); game.celebrateTimer = 1.6;
      const k = game.finishCelebration;
      game.finishCelebration = () => { game.celebrateTimer = 0; game.flow.set("upgrade"); };
      const win = this.fakeWin();
      let shopClicks = 0;
      win.addEventListener("click", () => { shopClicks++; });
      const ic = new LST.InputController(game);
      ic.attach(win);
      this.ok(ic.pointerDown(this.pointerEv()) && game.flow.is("upgrade"), "input: a canvas tap skips the wave-clear wait and opens the shop");
      win.fire("click", this.pointerEv());
      this.ok(shopClicks === 0, "input: a click following a celebrate skip does not hit the shop");
      win.fire("click", this.pointerEv());
      this.ok(shopClicks === 1, "input: a second tap on the shop works after the skip");
      game.finishCelebration = k;
    }

    { // skip-then-results: the trailing click does not hit Play again; a second tap does
      game.flow.set("gameover"); game.resultsDelay = 1.1;
      const k = game.showResults;
      game.showResults = () => { game.resultsDelay = 0; };
      const win = this.fakeWin();
      let resultClicks = 0;
      win.addEventListener("click", () => { resultClicks++; });
      const ic = new LST.InputController(game);
      ic.attach(win);
      this.ok(ic.pointerDown(this.pointerEv()) && game.resultsDelay === 0, "input: a canvas tap skips the death wait and shows the results");
      win.fire("click", this.pointerEv());
      this.ok(resultClicks === 0, "input: a click following a death-wait skip does not hit the results");
      win.fire("click", this.pointerEv());
      this.ok(resultClicks === 1, "input: a second tap on the results works after the skip");
      game.showResults = k;
    }

    { // a tap on results after the delay works normally (guard is not armed)
      game.flow.set("gameover"); game.resultsDelay = 0.1;
      const k = game.showResults;
      game.showResults = () => { game.resultsDelay = 0; };
      const win = this.fakeWin();
      let clicks = 0;
      win.addEventListener("click", () => { clicks++; });
      const ic = new LST.InputController(game);
      ic.attach(win);
      game.update(0.2);
      this.ok(game.resultsDelay === 0, "input: the death wait can end on its own");
      win.fire("click", this.pointerEv());
      this.ok(clicks === 1, "input: a tap on results after the delay works normally");
      game.showResults = k;
    }

    { // a tap mid-transition (shop already open, trailing click of the skip gesture)
      game.flow.set("celebrate"); game.celebrateTimer = 1.6;
      const k = game.finishCelebration;
      game.finishCelebration = () => { game.celebrateTimer = 0; game.flow.set("upgrade"); };
      const win = this.fakeWin();
      let clicks = 0;
      win.addEventListener("click", () => { clicks++; });
      const ic = new LST.InputController(game);
      ic.attach(win);
      ic.pointerDown(this.pointerEv());
      this.ok(game.flow.is("upgrade"), "input: mid-transition the shop is already open");
      win.fire("click", this.pointerEv());
      this.ok(clicks === 0, "input: a tap mid-transition is swallowed");
      game.finishCelebration = k;
    }

    { // a skip never places a tower or presses a button
      game.flow.set("celebrate"); game.celebrateTimer = 1.6;
      const k = game.finishCelebration;
      game.finishCelebration = () => { game.celebrateTimer = 0; game.flow.set("upgrade"); };
      let placed = 0, pressed = 0;
      game.placeTower = () => { placed++; };
      const win = this.fakeWin();
      win.addEventListener("click", () => { pressed++; });
      const ic = new LST.InputController(game);
      ic.attach(win);
      ic.pointerDown(this.pointerEv());
      win.fire("click", this.pointerEv());
      this.ok(placed === 0 && pressed === 0, "input: a skip never places a tower or presses a button");
      delete game.placeTower;
      game.finishCelebration = k;
    }

    { // InputController (the real input path) skips the death wait
      game.flow.set("gameover"); game.resultsDelay = 1.1;
      let shown = 0;
      const k = game.showResults;
      game.showResults = () => { shown++; game.resultsDelay = 0; };
      const ic = new LST.InputController(game);
      ic.pointerDown(this.pointerEv());
      this.ok(shown === 1 && game.resultsDelay === 0, "input: InputController skips the death wait");
      game.showResults = k;
    }

    { // finishRun runs exactly once on the skip path
      const g = this.game;
      g.reset();
      let n = 0;
      const rec = g.runRecorder;
      const k = rec.finishRun.bind(rec);
      rec.finishRun = (opts) => { n++; return k(opts); };
      g.flow.set("playing");
      g.tower.hp = 0;
      g.waveFlow.afterStep();
      this.ok(g.flow.is("gameover") && n === 1, "input: falling the tower starts one finishRun");
      const ic = new LST.InputController(g);
      ic.pointerDown(this.pointerEv());
      this.ok(n === 1 && g.resultsDelay === 0, "input: finishRun runs exactly once on the skip path");
      rec.finishRun = k;
    }

    { // skip, no click, window passes: the next click is delivered (card taken, Next pressed)
      game.flow.set("celebrate"); game.celebrateTimer = 1.6;
      const kFin = game.finishCelebration, kTake = game.takeCard, kLeave = game.leaveShop;
      game.finishCelebration = () => { game.celebrateTimer = 0; game.flow.set("upgrade"); };
      let taken = 0, next = 0;
      game.takeCard = () => { taken++; };
      game.leaveShop = () => { next++; };
      const win = this.fakeWin();
      win.addEventListener("click", () => { game.takeCard(); game.leaveShop(); });
      const ic = new LST.InputController(game);
      ic.attach(win);
      this.ok(ic.pointerDown(this.pointerEv(0)) && game.flow.is("upgrade"), "input: a skip with no trailing click still opens the shop");
      win.fire("click", this.pointerEv(LST.SkipClickGuard.windowMs));
      this.ok(taken === 1 && next === 1, "input: after the skip window, a shop card is taken and Next is pressed");
      game.finishCelebration = kFin; game.takeCard = kTake; game.leaveShop = kLeave;
    }

    { // skip, then pointercancel: the guard disarms and the next click is delivered
      game.flow.set("celebrate"); game.celebrateTimer = 1.6;
      const kFin = game.finishCelebration, kTake = game.takeCard, kLeave = game.leaveShop;
      game.finishCelebration = () => { game.celebrateTimer = 0; game.flow.set("upgrade"); };
      let taken = 0, next = 0;
      game.takeCard = () => { taken++; };
      game.leaveShop = () => { next++; };
      const win = this.fakeWin();
      win.addEventListener("click", () => { game.takeCard(); game.leaveShop(); });
      const ic = new LST.InputController(game);
      ic.attach(win);
      ic.pointerDown(this.pointerEv(0));
      win.fire("pointercancel", this.pointerEv(16));
      win.fire("click", this.pointerEv(32));
      this.ok(taken === 1 && next === 1, "input: pointercancel after a skip disarms the guard so the next click is delivered");
      game.finishCelebration = kFin; game.takeCard = kTake; game.leaveShop = kLeave;
    }

    { // skip, then a click within the window is still swallowed
      game.flow.set("celebrate"); game.celebrateTimer = 1.6;
      const kFin = game.finishCelebration, kTake = game.takeCard, kLeave = game.leaveShop;
      game.finishCelebration = () => { game.celebrateTimer = 0; game.flow.set("upgrade"); };
      let taken = 0, next = 0;
      game.takeCard = () => { taken++; };
      game.leaveShop = () => { next++; };
      const win = this.fakeWin();
      win.addEventListener("click", () => { game.takeCard(); game.leaveShop(); });
      const ic = new LST.InputController(game);
      ic.attach(win);
      ic.pointerDown(this.pointerEv(1000));
      win.fire("click", this.pointerEv(1000 + LST.SkipClickGuard.windowMs - 1));
      this.ok(taken === 0 && next === 0, "input: a click within the skip window is still swallowed");
      game.finishCelebration = kFin; game.takeCard = kTake; game.leaveShop = kLeave;
    }
  }

  // 6. no compat site left anywhere (PR 9 removed the getter / setter)
  checkSweep() {
    const { flow, stub, rows } = new FlowStateSweep(this.root).check();
    for (const s of flow) console.log(`  compat site: ${s.file}:${s.line} ${s.key ? s.receiver : s.receiver + ".state"}`);
    this.ok(!flow.length, `sweep: 0 compat state sites in src/, tools/, sw.js and index.html (found ${flow.length})`);
    this.ok(stub.length === 1 && stub[0].file === "tools/flow-test.js", "sweep: the only \"state\" key left is this file's oracle stub (old main.js reads it)");
    this.ok(!rows.length, `sweep: docs/OO-MIGRATION.md lists no compat rows (${rows.join(", ") || "none"})`);
  }

  run() {
    this.load();
    this.checkClasses();
    this.checkUpdates();
    this.loadOracle();
    this.checkKeys();
    this.checkHiddenTab();
    this.checkSkipClicks();
    this.checkSweep();
    console.log(this.fails ? `\n${this.fails} FAILED (${this.passes} passed)` : `\nALL PASS (${this.passes} passed)`);
    return this.fails ? 1 : 0;
  }
}

process.exit(new FlowTest().run());
