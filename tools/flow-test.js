#!/usr/bin/env node
// Game flow test (node, no browser): node tools/flow-test.js
//   1. Every run-flow state is its own GameState class in its own file, registered by id.
//   2. game.state reads / sets the GameStateMachine; unknown ids throw.
//   3. The run clock counts in exactly playing / celebrate / upgrade / victory.
//   4. InputController does what the old main.js keydown chain did, for every state x key x
//      resultsDelay x Workshop-open combination (the old chain is kept below as the reference).
//   5. Hiding the tab pauses only while playing.
const fs = require("fs"), path = require("path"), vm = require("vm");
const ROOT = path.join(__dirname, "..");
const FILES = JSON.parse(fs.readFileSync(path.join(__dirname, "sim.js"), "utf8").match(/const FILES = (\[[^\]]*\])/)[1]);
let fails = 0, passes = 0;
const ok = (c, m) => { if (c) passes++; else { fails++; console.log("FAIL " + m); } };

function load() {
  const store = {};
  const sb = { Math, console, localStorage: { getItem: (k) => (k in store ? store[k] : null), setItem: (k, v) => { store[k] = String(v); } } };
  sb.window = sb; vm.createContext(sb);
  for (const f of FILES) vm.runInContext(fs.readFileSync(path.join(ROOT, "src", f), "utf8"), sb, { filename: f });
  vm.runInContext(fs.readFileSync(path.join(ROOT, "src/core/InputController.js"), "utf8"), sb, { filename: "InputController.js" });
  const LST = sb.LST;
  LST.UI = class { show() {} updateHud() {} renderShop() {} };
  LST.audio = { play() {}, startMusic() {}, stopMusic() {}, duckMusic() {}, setTension() {} };
  LST.haptics = { buzz() {} };
  const game = new LST.Game({ halfW: 310, halfH: 650 });
  game.reset();
  return { LST, game };
}
const { LST, game } = load();
const IDS = ["menu", "playing", "paused", "celebrate", "upgrade", "gotcha", "gameover", "workshop", "victory", "cleared"];

// 1-2. classes, files, registry, getter/setter
const html = fs.readFileSync(path.join(ROOT, "index.html"), "utf8"), sw = fs.readFileSync(path.join(ROOT, "sw.js"), "utf8");
const types = LST.GameStateMachine.types;
ok(Object.keys(types).sort().join() === [...IDS].sort().join(), "flow: exactly these states are registered: " + IDS.join(", "));
for (const id of IDS) {
  const C = types[id], file = "src/core/states/" + C.name + ".js";
  ok(C.prototype instanceof LST.GameState && C.id === id, `flow: ${id} is a GameState subclass (${C.name})`);
  ok(fs.existsSync(path.join(ROOT, file)) && html.includes(`src="${file}"`) && sw.includes(`"${file}"`), `flow: ${C.name} has its own file, loaded by index.html and cached by sw.js`);
}
ok(["src/core/GameState.js", "src/core/GameStateMachine.js", "src/core/InputController.js"].every((f) => html.includes(`src="${f}"`) && sw.includes(`"${f}"`)), "flow: GameState, GameStateMachine, InputController are loaded and cached");
ok(html.indexOf('src="src/core/states/ClearedState.js"') < html.indexOf('src="src/game.js"') && html.indexOf('src="src/core/GameStateMachine.js"') < html.indexOf('src="src/core/states/MenuState.js"'), "flow: script order machine -> states -> game.js");
ok(game.state === "menu" && game.flow.current instanceof LST.MenuState, "flow: a new game starts in MenuState and game.state reads \"menu\"");
game.state = "upgrade"; ok(game.flow.current instanceof LST.ShopState && game.state === "upgrade", "flow: game.state = \"upgrade\" enters ShopState");
{ let threw = false; try { game.state = "nope"; } catch (e) { threw = true; } ok(threw && game.state === "upgrade", "flow: an unknown state id throws and leaves the state as it was"); }
ok(!Object.prototype.hasOwnProperty.call(game, "state"), "flow: state is not a loose field on Game (getter over the machine)");
const main = fs.readFileSync(path.join(ROOT, "src/main.js"), "utf8");
ok(!/game\.state\s*===/.test(main) && !/addEventListener\("keydown"/.test(main) && /new LST\.InputController/.test(main), "flow: main.js has no state switch or keydown handler; it creates an InputController");
const gsrc = fs.readFileSync(path.join(ROOT, "src/game.js"), "utf8");
const upd = gsrc.slice(gsrc.indexOf("  update(dt) {"), gsrc.indexOf("  step(dt) {"));
ok(!/this\.state\s*[!=]==/.test(upd) && /this\.flow\.update\(this, dt\)/.test(upd), "flow: Game.update has no state string checks; it calls flow.update");

// 3. run clock (states stubbed so only the clock moves)
for (const id of IDS) {
  const s = game.flow.get(id), keep = s.update; s.update = () => {};
  game.state = id; game.runTime = 0; game.hitStop = 0; game.update(0.5); s.update = keep;
  ok((game.runTime === 0.5) === ["playing", "celebrate", "upgrade", "victory"].includes(id), `flow: run clock ${["playing", "celebrate", "upgrade", "victory"].includes(id) ? "counts" : "stops"} in ${id}`);
}
{ game.state = "playing"; game.runTime = 0; game.hitStop = 0.2; game.update(0.1); ok(game.runTime === 0 && Math.abs(game.hitStop - 0.1) < 1e-12, "flow: hit-stop freezes the run clock and states"); game.hitStop = 0; }
{ game.state = "gameover"; let shown = 0; const k = game.showResults; game.showResults = () => { shown++; }; game.resultsDelay = 0.3; game.update(0.2); ok(shown === 0, "flow: gameover waits out resultsDelay"); game.update(0.2); ok(shown === 1, "flow: gameover shows the results once resultsDelay runs out"); game.update(0.2); ok(shown === 1, "flow: results show once"); game.showResults = k; }
{ game.state = "celebrate"; let fin = 0; const k = game.finishCelebration; game.finishCelebration = () => { fin++; }; game.celebrateTimer = 0.15; game.update(0.1); game.update(0.1); ok(fin === 1, "flow: celebrate calls finishCelebration when its timer ends"); game.finishCelebration = k; }
{ game.state = "victory"; game.victoryTimer = 0.05; game.update(0.1); ok(game.state === "cleared", "flow: victory moves to cleared when its timer ends"); }

// 4. InputController == the old main.js keydown chain
function oldChain(game, e, inWorkshop, settings) {
  if (inWorkshop && (e.code === "Escape" || e.code === "KeyW")) {
    game.closeWorkshop();
  } else if (e.code === "Space" || e.code === "KeyP" || e.code === "Escape") {
    e.preventDefault();
    game.togglePause();
  } else if (e.code === "KeyW" && (game.state === "menu" || (game.state === "gameover" && !game.resultsDelay))) {
    game.openWorkshop(game.state === "gameover" ? "results" : "start");
  } else if (e.code === "KeyF") {
    game.toggleSpeed();
  } else if (e.code === "KeyQ" || e.code === "KeyE") {
    game.useAbility();
  } else if (e.code === "Enter" && game.state === "cleared") {
    game.continueEndless();
  } else if (e.code === "Enter" && game.state === "gotcha") {
    game.dismissGotcha();
  } else if (e.code === "Enter") {
    if (game.state === "menu" || game.state === "workshop" || (game.state === "gameover" && !game.resultsDelay)) game.newGame();
    else if (game.state === "upgrade") game.leaveShop();
  } else if (game.state === "upgrade" && /^(Digit|Numpad)[1-3]$/.test(e.code)) {
    game.takeCard(+e.code.slice(-1) - 1);
  } else if (game.state === "upgrade" && e.code === "KeyR") {
    game.rerollShop();
  } else if (game.state === "upgrade" && e.code === "KeyH") {
    game.repairTower();
  } else if (e.code === "KeyM") {
    settings.toggle("music");
  }
}
const ACTIONS = ["closeWorkshop", "togglePause", "openWorkshop", "toggleSpeed", "useAbility", "continueEndless", "dismissGotcha", "newGame", "leaveShop", "takeCard", "rerollShop", "repairTower"];
const KEYS = ["Escape", "KeyW", "Space", "KeyP", "KeyF", "KeyQ", "KeyE", "Enter", "Digit1", "Digit2", "Digit3", "Digit4", "Numpad1", "Numpad3", "KeyR", "KeyH", "KeyM", "KeyA", "ArrowUp"];
function spyGame(id, resultsDelay) {
  const log = [], g = { flow: new LST.GameStateMachine(), resultsDelay };
  Object.defineProperty(g, "state", { get() { return this.flow.id; } });
  g.flow.set(id);
  for (const a of ACTIONS) g[a] = (...args) => { log.push(a + "(" + args.join(",") + ")"); };
  return { g, log };
}
let combos = 0, same = 0;
for (const id of IDS) for (const code of KEYS) for (const rd of [0, 0.5]) for (const ws of [false, true]) {
  const A = spyGame(id, rd), B = spyGame(id, rd), sa = [], sb2 = [];
  const ea = { code, preventDefault() { sa.push("pd"); } }, eb = { code, preventDefault() { sb2.push("pd"); } };
  oldChain(A.g, ea, ws, { toggle: (k) => A.log.push("toggle(" + k + ")") });
  new LST.InputController(B.g, { settings: { toggle: (k) => B.log.push("toggle(" + k + ")") }, isWorkshopOpen: () => ws }).keyDown(eb);
  combos++;
  const eq = A.log.join() === B.log.join() && sa.join() === sb2.join();
  if (eq) same++; else console.log(`  differs: ${id} ${code} resultsDelay=${rd} workshop=${ws}: old [${A.log}] new [${B.log}]`);
}
ok(same === combos, `input: InputController matches the old keydown chain in all ${combos} state x key x resultsDelay x workshop cases`);

// 5. hidden tab
for (const id of IDS) { const { g, log } = spyGame(id, 0); new LST.InputController(g, {}).visibilityChanged(true); ok((log.join() === "togglePause()") === (id === "playing"), `input: hiding the tab ${id === "playing" ? "pauses" : "does nothing"} in ${id}`); }
{ const { g, log } = spyGame("playing", 0); new LST.InputController(g, {}).visibilityChanged(false); ok(!log.length, "input: showing the tab again does nothing"); }

console.log(fails ? `\n${fails} FAILED (${passes} passed)` : `\nALL PASS (${passes} passed)`);
process.exit(fails ? 1 : 0);
