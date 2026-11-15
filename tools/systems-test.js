#!/usr/bin/env node
// Game systems test (node, no browser): node tools/systems-test.js
// PR 8 moved the run's systems out of Game into one object each. This checks that:
//   1. Each system is one class in its own file, loaded by index.html, cached by sw.js and
//      loaded by the sim, and Game's public methods only hand off to it.
//   2. Each object owns its behaviour: driven directly (not through Game) it does the job.
//   3. SceneFlags give render.js / FxDirector exactly what the old state-string checks did, for
//      every state (the old checks are read from render.js / FxDirector.js at 738409a with
//      `git show`, not retyped), and DemoScene has no state field of its own.
//   4. PR 8b's World split: EnemySpawner, DamageSystem and FxSpawner own spawning, slam / splash
//      damage and the shared feedback; World only hands off, and a scripted run of the old
//      world.js (git show 24349b8) leaves exactly the same world as the new objects.
// The render pipeline and FX drawers are checked by tools/render-test.js.
const fs = require("fs"), path = require("path"), vm = require("vm"), childProcess = require("child_process");

class SystemsTest {
  constructor(root = path.join(__dirname, "..")) {
    this.root = root;
    this.passes = 0;
    this.fails = 0;
    // [class name, file, Game property]
    this.SYSTEMS = [
      ["Ability", "src/abilities/Ability.js", null], ["Shockwave", "src/abilities/Shockwave.js", null],
      ["Freeze", "src/abilities/Freeze.js", null], ["Overdrive", "src/abilities/Overdrive.js", null],
      ["AbilitySystem", "src/abilities/AbilitySystem.js", "abilitySystem"],
      ["ShopController", "src/shop/ShopController.js", "shopController"],
      ["RewardRules", "src/core/RewardRules.js", "rewards"], ["KillFeedback", "src/core/KillFeedback.js", "killFeedback"],
      ["BossEventRouter", "src/bosses/BossEventRouter.js", "bossEvents"], ["FinaleController", "src/bosses/FinaleController.js", "finaleController"],
      ["RunRecorder", "src/core/RunRecorder.js", "runRecorder"], ["WorkshopController", "src/core/WorkshopController.js", "workshopController"],
      ["WaveFlow", "src/core/WaveFlow.js", "waveFlow"], ["SceneFlags", "src/core/SceneFlags.js", null],
      ["EnemySpawner", "src/core/EnemySpawner.js", "spawner"], ["DamageSystem", "src/core/DamageSystem.js", "damageSystem"],
      ["FxSpawner", "src/fx/FxSpawner.js", "fxSpawner"],
    ];
    // World method -> [World property, object method]: World only hands these off (PR 8b).
    this.WORLD_HANDOFFS = {
      spawnEnemy: ["spawner", "spawn"], spawnMinions: ["spawner", "minions"], onBossSlam: ["damageSystem", "bossSlam"], splashDamage: ["damageSystem", "splash"],
      onHit: ["fxSpawner", "hit"], onEnemyKilled: ["fxSpawner", "kill"], onTowerHit: ["fxSpawner", "towerHit"], onBossSpawn: ["fxSpawner", "bossSpawn"],
      spawnCorpse: ["fxSpawner", "corpse"], spawnConfetti: ["fxSpawner", "confetti"], spawnHitSparks: ["fxSpawner", "sparks"], spawnExplosion: ["fxSpawner", "explosion"],
    };
    this.STATE_REV = "738409a"; // last render.js / FxDirector.js with state-string checks
    this.WORLD_REV = "24349b8"; // last world.js before the PR 8b split
    // Game method -> [Game property, system method]: Game only hands these off.
    this.HANDOFFS = {
      selectWorld: ["workshopController", "selectWorld"], startNextWave: ["waveFlow", "startNextWave"], endWave: ["waveFlow", "endWave"],
      finishCelebration: ["waveFlow", "finishCelebration"], dismissGotcha: ["waveFlow", "dismissGotcha"],
      abilityReady: ["abilitySystem", "ready"], useAbility: ["abilitySystem", "use"],
      beginHeadStart: ["shopController", "beginHeadStart"], advanceDraft: ["shopController", "advanceDraft"], autoDraft: ["shopController", "autoDraft"],
      openShop: ["shopController", "deal"], shopPrice: ["shopController", "price"], takeCard: ["shopController", "takeCard"],
      openMysteryBox: ["shopController", "openMysteryBox"], returnableTrap: ["shopController", "returnableTrap"], returnTrap: ["shopController", "returnTrap"],
      rerollShop: ["shopController", "reroll"], repairTower: ["shopController", "repair"], canLeaveShop: ["shopController", "canLeave"], leaveShop: ["shopController", "leave"],
      gameOver: ["runRecorder", "gameOver"], finishRun: ["runRecorder", "finishRun"], showResults: ["runRecorder", "showResults"], saveBest: ["runRecorder", "saveBest"],
      openWorkshop: ["workshopController", "open"], closeWorkshop: ["workshopController", "close"], buyUpgrade: ["workshopController", "buyUpgrade"],
      pickAbility: ["workshopController", "pickAbility"], toggleBench: ["workshopController", "toggleBench"], resetProgress: ["workshopController", "resetProgress"],
      unlockCard: ["workshopController", "unlockCard"], toMenu: ["workshopController", "toMenu"],
      onFinaleWon: ["finaleController", "won"], continueEndless: ["finaleController", "continueEndless"], retireToWorkshop: ["finaleController", "retireToWorkshop"],
      onSlamWindup: ["bossEvents", "windup"], onBossCharge: ["bossEvents", "charge"], onMoleRise: ["bossEvents", "moleRise"], onMoleBurrow: ["bossEvents", "moleBurrow"],
      onMolePhase: ["bossEvents", "molePhase"], onBossPhase: ["bossEvents", "bossPhase"], onCrabclawArrive: ["bossEvents", "crabclawArrive"],
      onCoconutThrow: ["bossEvents", "coconutThrow"], onCoconutHit: ["bossEvents", "coconutHit"],
    };
    // Hand-offs whose answer Game passes back.
    this.RETURNS = ["selectWorld", "abilityReady", "useAbility", "advanceDraft", "shopPrice", "takeCard", "openMysteryBox", "returnableTrap", "returnTrap",
      "rerollShop", "repairTower", "canLeaveShop", "buyUpgrade", "pickAbility", "toggleBench", "unlockCard"];
    this.IDS = ["menu", "playing", "paused", "celebrate", "upgrade", "gotcha", "gameover", "workshop", "victory", "cleared"];
  }

  ok(c, m) { if (c) this.passes++; else { this.fails++; console.log("FAIL " + m); } }
  read(rel) { return fs.readFileSync(path.join(this.root, rel), "utf8"); }
  show(rev, file) {
    try { return childProcess.execFileSync("git", ["show", rev + ":" + file], { cwd: this.root, encoding: "utf8", stdio: ["ignore", "pipe", "pipe"] }); }
    catch (e) { console.log(`FAIL oracle: git show ${rev}:${file} failed (needs full git history, e.g. actions/checkout fetch-depth: 0)`); process.exit(1); }
  }

  // The game in a node sandbox (the sim's file list), UI / audio / haptics stubbed and logged.
  load() {
    this.FILES = JSON.parse(this.read("tools/sim.js").match(/const FILES = (\[[^\]]*\])/)[1]);
    const store = {};
    const sb = { Math, console, localStorage: { getItem: (k) => (k in store ? store[k] : null), setItem: (k, v) => { store[k] = String(v); } } };
    sb.window = sb; vm.createContext(sb);
    for (const f of this.FILES) vm.runInContext(this.read("src/" + f), sb, { filename: f });
    vm.runInContext(this.read("src/demo.js"), sb, { filename: "demo.js" });
    const LST = sb.LST, sounds = (this.sounds = []);
    this.shown = [];
    LST.UI = class { show(s) { sb.__shown.push(s); } updateHud() {} renderShop() {} renderWorkshop() {} };
    sb.__shown = this.shown;
    LST.audio = { play: (n) => sounds.push(n), startMusic() {}, stopMusic() {}, duckMusic() {}, setTension() {} };
    LST.haptics = { buzz() {} };
    this.LST = LST;
    this.game = new LST.Game({ halfW: 310, halfH: 650 });
  }

  fresh() { const g = this.game; g.reset(); g.flow.set("menu"); this.sounds.length = 0; this.shown.length = 0; return g; }
  enemy(type, x, y) { const e = new this.LST.Enemy(type, x, y, { hp: 1, speed: 1, damage: 1, coins: 1 }); this.game.enemies.push(e); return e; }

  // 1. files, loading, hand-offs
  checkFiles() {
    const html = this.read("index.html"), sw = this.read("sw.js"), scripts = [...html.matchAll(/<script src="([^"]+)"/g)].map((m) => m[1]);
    for (const [name, file, prop] of this.SYSTEMS) {
      const src = this.read(file), classes = [...src.matchAll(/\bclass (\w+)(?: extends [\w.]+)? \{/g)].map((c) => c[1]);
      this.ok(classes.length === 1 && classes[0] === name && this.LST[name], `files: ${file} holds one class, ${name}`);
      this.ok(!/^(function |const \w+ = (\(|function))/m.test(src), `files: ${file} has no loose module-level function`);
      this.ok(scripts.includes(file) && sw.includes(`"${file}"`) && this.FILES.includes(file.slice(4)), `files: ${name} is loaded by index.html, cached by sw.js and loaded by tools/sim.js`);
      this.ok(scripts.indexOf(file) < scripts.indexOf("src/game.js") || !prop, `files: ${name} loads before game.js`);
      if (prop) this.ok(this.game[prop] instanceof this.LST[name] && (this.game[prop].game || this.game[prop].world) === this.game, `files: game.${prop} is the run's ${name}`);
    }
    this.ok(/const VERSION = "v28"/.test(sw), "files: sw.js VERSION is v28");
    for (const [m, [prop, fn]] of Object.entries(this.HANDOFFS)) {
      const g = this.game, sys = g[prop], keep = sys[fn], seen = [];
      sys[fn] = (...a) => { seen.push(a); return "ret:" + fn; };
      const ret = g[m]("a1", "a2");
      sys[fn] = keep;
      const body = g[m].toString();
      this.ok(seen.length === 1 && (!keep.length || seen[0][0] === "a1") && body.split("\n").length === 1, `handoff: Game.${m} only hands off to ${prop}.${fn}`);
      if (this.RETURNS.includes(m)) this.ok(ret === "ret:" + fn, `handoff: Game.${m} returns ${prop}.${fn}'s answer`);
    }
    const gsrc = this.read("src/game.js");
    const gone = { 'ability branches (id === "shockwave")': /=== "(shockwave|freeze|overdrive)"/, "Mystery Box": /mysteryBox/, "boss kill bonus": /BOSS BONUS|killCoins/,
      "pop pitch map": /basic: 1, fast/, "finale intro": /finaleIntro|createFinaleBoss/, "Gears payout": /gearsFor|recordRun/, "Workshop": /seenWorkshop|unlockAbility/,
      "phase banners": /PHASE 2|phaseBanner = \{/, "wave clear": /celebrateTimer = 1\.6|gotchaQueue\.push/, "shop prices": /shopRules/ };
    for (const [what, re] of Object.entries(gone)) this.ok(!re.test(gsrc), `game.js: no ${what} code left (moved to its system)`);
    this.ok((gsrc.match(/this\.state\b/g) || []).length === 1 && /^\s+this\.state = "menu";/m.test(gsrc), "game.js: the only compat state use left is the constructor's (PR 9)");
    const ui = this.read("src/ui.js");
    this.ok(!/ABILITY_(NAME|DESC|ICON)/.test(ui) && /LST\.Ability\.get\([^)]+\)\.icon/.test(ui), "ui.js: ability names, descriptions and icons come from the Ability classes");
  }

  // 2a. AbilitySystem + Shockwave / Freeze / Overdrive
  checkAbilities() {
    const { LST } = this, A = LST.Ability;
    this.ok(["shockwave", "freeze", "overdrive"].every((id) => A.get(id) instanceof A && A.get(id).id === id && A.get(id).name && A.get(id).desc && /^<svg/.test(A.get(id).icon)), "ability: shockwave, freeze, overdrive are Ability subclasses with name, desc and icon");
    this.ok(A.get("shockwave").name === "Shockwave" && A.get("freeze").desc === "Slow all 60%, 4s" && A.get("overdrive").desc === "2x fire rate, 5s", "ability: names and descriptions match the old ui.js maps");
    const S = this.game.abilitySystem;
    for (const id of this.IDS) { const g = this.fresh(); g.flow.set(id); g.ability = S.equip("freeze"); this.ok(S.ready() === (id === "playing"), `ability: usable only while playing (${id}: ${S.ready()})`); }
    { const g = this.fresh(); g.flow.set("paused"); g.ability = S.equip("shockwave"); this.ok(S.use() === false && !this.sounds.includes("deny") && g.ability.cd === 0, "ability: paused, use() does nothing and stays silent"); }
    { const g = this.fresh(); g.flow.set("playing"); g.ability = S.equip("shockwave"); g.ability.cd = 3; this.ok(S.use() === false && this.sounds.includes("deny"), "ability: on cooldown, use() is denied"); }
    { const g = this.fresh(); g.flow.set("playing"); g.ability = S.equip("shockwave"); const near = this.enemy("basic", 40, 0), far = this.enemy("basic", 900, 0);
      this.ok(S.use() && near.stun > 0 && far.stun === 0 && g.ability.cd === LST.CONFIG.abilities.shockwave.cooldown && g.ability.flash === 1 && g.bursts.some((b) => b.kind === "shockwave" || b.style === "shockwave" || JSON.stringify(b).includes("shockwave")) && this.sounds.includes("shockwave"), "ability: Shockwave stuns enemies in range only, starts the cooldown and bursts"); }
    { const g = this.fresh(); g.flow.set("playing"); g.ability = S.equip("freeze"); const e = this.enemy("fast", 800, 0); S.use(); this.ok(e.slowTimer === LST.CONFIG.abilities.freeze.time && e.slowAmount > 0, "ability: Freeze slows every enemy"); }
    { const g = this.fresh(); g.flow.set("playing"); g.ability = S.equip("overdrive"); S.use(); this.ok(g.tower.overdrive === LST.CONFIG.abilities.overdrive.time, "ability: Overdrive sets the tower's overdrive time"); }
    { const g = this.fresh(); g.ability = S.equip("freeze"); g.ability.cd = 1; g.ability.flash = 1; S.tick(0.25); this.ok(g.ability.cd === 0.75 && g.ability.flash === 0.5, "ability: tick() runs the cooldown and the button flash"); }
  }

  // 2b. ShopController
  checkShop() {
    const C = this.game.shopController;
    { const g = this.fresh(); g.wave = 3; g.coins = 1000; C.enter(); this.ok(g.flow.is("upgrade") && g.shop && g.shop.cards.length === this.LST.CONFIG.shop.cards && this.shown.includes("upgrade"), "shop: enter() deals a shop and enters ShopState"); }
    { const g = this.game, before = g.coins; this.ok(C.takeCard(0) && g.coins === before && g.shop.picked, "shop: the first card is free");
      const price = C.price("extraCard"); this.ok(price > 0 && C.takeCard(1) && g.coins === before - price && g.shop.extras === 1, "shop: an extra card costs price(\"extraCard\")"); }
    { const g = this.game; g.flow.set("playing"); this.ok(C.takeCard(2) === false && C.reroll() === false && C.repair() === false && C.returnableTrap() === null, "shop: take / reroll / repair / trap return do nothing outside ShopState"); g.flow.set("upgrade"); }
    { const g = this.game, before = g.coins, price = C.price("reroll"); this.ok(C.reroll() && g.coins === before - price && g.shop.rerolls === 1, "shop: reroll() pays and re-deals"); }
    { const g = this.fresh(); g.wave = 2; C.enter(); g.shop.cards.forEach((c) => (c.taken = false)); this.ok(!C.canLeave(), "shop: can't leave before the free pick"); C.leave(); this.ok(g.flow.is("upgrade"), "shop: leave() waits for the free pick");
      C.takeCard(0); C.leave(); this.ok(g.flow.is("playing") && g.wave === 3, "shop: after the pick, leave() starts the next wave"); }
    { const g = this.fresh(); C.beginHeadStart(3); this.ok(g.flow.is("upgrade") && g.draft && g.draft.hand === 1 && g.wave === 1 && g.coins === g.draft.income[0], "shop: beginHeadStart deals draft hand 1 with wave 1's coins"); }
  }

  // 2c. RewardRules + KillFeedback
  checkRewards() {
    const { LST } = this, R = this.game.rewards, K = this.game.killFeedback;
    const pitch = (t) => R.popPitch({ type: t });
    this.ok(pitch("basic") === 1 && pitch("fast") === 1.3 && pitch("tank") === 0.75 && pitch("boss") === 0.5 && pitch("mole") === undefined && pitch("crab") === undefined, "rewards: pop pitch comes from the archetype (basic 1, fast 1.3, tank 0.75, boss 0.5, others none), as the old map");
    this.ok(["basic", "fast", "tank", "mole", "crab", "gull"].every((t) => !R.hasKillBonus({ type: t })) && R.hasKillBonus({ type: "boss" }), "rewards: killBonus is on the mini-boss archetype only");
    { const g = this.fresh(); g.coinMult = 1.5; g.wave = 4; this.ok(R.killCoins({ coins: 3 }) === Math.round(4.5) && R.killScore({ score: 10 }) === 40 && R.bossBonus() === Math.round(LST.CONFIG.bosses.killCoins * 1.5), "rewards: coins scale with Greed, score with the wave"); }
    { const g = this.fresh(); g.flow.set("playing"); g.wave = 5; const b = this.enemy("boss", 10, 10); b.coins = 40; K.onKill(b);
      const bonus = R.bossBonus();
      this.ok(g.coins === 40 + bonus && g.bossKills === 1 && g.kills === 1 && g.hitStop === 0.16 && g.flash === 1 && this.sounds.includes("bossDown") && g.texts.some((t) => String(t.text).includes("BOSS BONUS")), "kill: a mini-boss pays coins plus the bonus, then hit-stop and flash"); }
    { const g = this.fresh(); g.wave = 2; const e = this.enemy("tank", 0, 0); K.onKill(e); this.ok(g.coins === e.coins && g.hitStop === 0 && g.bossKills === 0 && g.score === e.score * 2, "kill: a normal enemy pays coins and score, no hit-stop"); }
  }

  // 2d. BossEventRouter + FinaleController
  checkBosses() {
    const B = this.game.bossEvents, F = this.game.finaleController, LST = this.LST;
    { const g = this.fresh(); B.molePhase({ phase: 1 }); this.ok(g.phaseBanner && g.phaseBanner.text === "PHASE 2" && g.flash === 0.7 && this.sounds.includes("phase"), "boss: molePhase shows PHASE 2 with flash and sting"); }
    { const g = this.fresh(); B.bossPhase({ phase: 1 }, null); this.ok(!g.phaseBanner && !this.sounds.length, "boss: bossPhase with no banner does nothing"); B.bossPhase({ phase: 2 }, { text: "FRENZY", sub: "x" }); this.ok(g.phaseBanner.text === "FRENZY", "boss: bossPhase shows the script's banner"); }
    { const g = this.fresh(); B.charge({ x: 0, y: 0, radius: 10 }); this.ok(g.bossEscapes === 1 && this.sounds.includes("charge"), "boss: charge counts an escape"); }
    { const g = this.fresh(); g.wave = 3; this.ok(F.begin() === false && g.finale === null, "finale: begin() on a normal wave clears game.finale"); }
    { const g = this.fresh(); g.wave = g.director.finaleWave; g.waveMult = g.director.multipliers(g.wave); this.ok(F.begin() === true && g.finale && g.finale.intro === LST.CONFIG.finale.introTime && F.holdsWave, "finale: begin() on the finale wave starts the intro");
      F.tick(LST.CONFIG.finale.introTime + 0.01); this.ok(g.finale.mole && g.enemies.includes(g.finale.mole), "finale: the finale boss arrives when the intro ends");
      g.flow.set("playing"); F.won(g.finale.mole); this.ok(g.flow.is("victory") && g.finale.won && !F.holdsWave && g.victoryTimer === 3.4, "finale: won() enters VictoryState"); }
    { const g = this.game; F.continueEndless(); this.ok(g.flow.is("victory") && !g.endless, "finale: continueEndless only from ClearedState"); g.flow.set("cleared"); F.continueEndless(); this.ok(g.flow.is("upgrade") && g.endless && g.finale === null, "finale: continueEndless deals a shop in endless mode"); }
  }

  // 2e. RunRecorder + WorkshopController + WaveFlow + pause
  checkRunAndFlow() {
    const RR = this.game.runRecorder, W = this.game.workshopController, WF = this.game.waveFlow;
    { const g = this.fresh(); const best = g.bestWave; g.newBest = false; RR.saveBest(best + 1); this.ok(g.bestWave === best + 1 && g.newBest, "run: saveBest raises the best wave"); g.bestWave = best; }
    { const g = this.fresh(); g.flow.set("playing"); g.wave = 4; RR.gameOver(); this.ok(g.flow.is("gameover") && g.resultsDelay === 1.1 && g.result && g.result.wave === 4 && g.result.won === false && this.shown.includes("dying"), "run: gameOver builds the result and waits to show it"); }
    { const g = this.fresh(); g.flow.set("playing"); this.ok(W.selectWorld("backyard") === false, "workshop: no world pick mid-run"); g.flow.set("menu"); this.ok(W.selectWorld("backyard") === true, "workshop: world pick on the menu"); }
    { const g = this.fresh(); W.open("start"); this.ok(g.flow.is("workshop") && g.workshopFrom === "start", "workshop: open() from the menu enters WorkshopState"); W.close(); this.ok(g.flow.is("menu"), "workshop: close() goes back to the menu"); }
    { const g = this.fresh(); g.flow.set("gameover"); g.resultsDelay = 0.5; W.open("results"); this.ok(g.flow.is("gameover") && !this.shown.includes("workshop"), "workshop: can't open while the tower explodes"); }
    { const g = this.fresh(); WF.startNextWave(); this.ok(g.flow.is("playing") && g.wave === 1 && g.spawnQueue.length > 0 && g.waveIntro === 1.6, "wave: startNextWave enters PlayingState"); g.spawnQueue = []; g.enemies = []; WF.afterStep(); this.ok(g.flow.is("celebrate") && g.celebrateTimer === 1.6, "wave: an empty field ends the wave (CelebrateState)"); }
    { const g = this.fresh(); g.gotchaQueue = ["x"]; g.flow.set("celebrate"); WF.finishCelebration(); this.ok(g.flow.is("gotcha"), "wave: a pending trap reveal goes to GotchaState"); WF.dismissGotcha(); this.ok(g.flow.is("upgrade"), "wave: dismissing the last reveal deals the shop"); }
    { const g = this.fresh(); g.flow.set("playing"); g.tower.hp = 0; WF.afterStep(); this.ok(g.flow.is("gameover"), "wave: a fallen tower is game over"); }
    { const g = this.fresh(); g.flow.set("playing"); g.togglePause(); this.ok(g.flow.is("paused") && this.shown.includes("pause"), "pause: PlayingState.pause() enters PausedState"); g.togglePause(); this.ok(g.flow.is("playing"), "pause: PausedState.resume() goes back to playing");
      for (const id of this.IDS.filter((i) => i !== "playing" && i !== "paused")) { g.flow.set(id); g.togglePause(); this.ok(g.flow.is(id), `pause: togglePause does nothing in ${id}`); } }
  }

  // 3. SceneFlags vs the old render.js / FxDirector state-string checks, every state. The old
  // conditions are cut out of the 738409a files and evaluated for each state id.
  oldStateChecks() {
    const r = this.show(this.STATE_REV, "src/render.js"), d = this.show(this.STATE_REV, "src/fx/FxDirector.js");
    const cut = (src, re, what) => { const m = src.match(re); if (!m) { console.log(`FAIL oracle: ${what} not found at ${this.STATE_REV}`); process.exit(1); } return m[1]; };
    const fn = (expr) => new Function("scene", "st", "return !!(" + expr + ");");
    const finale = fn(cut(r, /if \(fin && !fin\.mole && !fin\.won && (\(scene\.state[^{]*\))\) \{/, "finale dim check"));
    const celebrate = fn(cut(r, /if \((scene\.state === "celebrate")\) \{/, "celebrate banner check"));
    const victory = fn(cut(r, /\} else if \((scene\.state === "victory")\) \{/, "victory banner check"));
    const wave = fn(cut(r, /\} else if \((scene\.state === "playing" \|\| scene\.state === "paused")\) \{/, "wave banner check"));
    const low = fn(cut(r, /const low = scene\.lowHpActive && (scene\.state === "playing") \?/, "low-HP pulse check"));
    const aura = fn(cut(d, /if \((st === [^)]*)\) this\.aura\.update/, "tower aura check"));
    return (id) => { const scene = { state: id }; return {
      showsFinaleIntro: finale(scene, id),
      banner: celebrate(scene, id) ? "celebrate" : victory(scene, id) ? "victory" : wave(scene, id) ? "wave" : null,
      lowHpPulse: low(scene, id),
      towerAura: aura(scene, id),
    }; };
  }

  checkSceneFlags() {
    const { LST } = this, g = this.game, oldChecks = this.oldStateChecks();
    for (const id of this.IDS) {
      g.flow.set(id);
      const f = g.sceneFlags, old = oldChecks(id);
      this.ok(f instanceof LST.SceneFlags && JSON.stringify(f) === JSON.stringify(old), `scene: ${id} SceneFlags match the state checks of render.js / FxDirector.js@${this.STATE_REV} ${JSON.stringify(old)}`);
    }
    const demo = new LST.DemoScene({ halfW: 310, halfH: 650 });
    this.ok(!("state" in demo) && demo.sceneFlags === LST.SceneFlags.PLAYING, "scene: DemoScene has no state field; it passes the fixed PLAYING SceneFlags");
    for (const f of ["src/render.js", "src/fx/FxDirector.js", "src/demo.js"]) this.ok(!/scene\.state|this\.state\b|st === "/.test(this.read(f)), `scene: ${f} has no state-string checks`);
    this.ok(/SceneFlags\.js/.test(this.read("styles.html")), "scene: styles.html loads SceneFlags for the demo");
  }

  // 4. PR 8b: World -> EnemySpawner / DamageSystem / FxSpawner
  checkWorld() {
    const { LST } = this, W = LST.World.prototype;
    for (const [m, [prop, fn]] of Object.entries(this.WORLD_HANDOFFS)) {
      const g = this.fresh(), sys = g[prop], keep = sys[fn], seen = [];
      sys[fn] = (...a) => { seen.push(a); return "ret:" + fn; };
      const ret = W[m].call(g, "a1", "a2", "a3");
      sys[fn] = keep;
      this.ok(seen.length === 1 && seen[0][0] === "a1" && W[m].toString().split("\n").length === 1, `handoff: World.${m} only hands off to ${prop}.${fn}`);
      if (m === "spawnEnemy") this.ok(ret === "ret:spawn", "handoff: World.spawnEnemy returns the spawned enemy");
    }
    const wsrc = this.read("src/world.js");
    this.ok(!/Math\.random|new LST\.(Burst|FloatText|Particle|Confetti|Corpse|Enemy)\b|takeDamage/.test(wsrc), "world.js: no spawning, damage or effect-making code left (moved to its object)");
    const demo = new LST.DemoScene({ halfW: 310, halfH: 650 });
    this.ok(demo.spawner instanceof LST.EnemySpawner && demo.damageSystem instanceof LST.DamageSystem && demo.fxSpawner instanceof LST.FxSpawner && demo.fxSpawner.world === demo, "world: DemoScene gets its own spawner, damage system and FX spawner");

    // EnemySpawner: edge spawn, mini-boss HP curve + early tuning + BOSS banner, minions
    { const g = this.fresh(); g.wave = 1; const m = { hp: 2, speed: 1, damage: 1, coins: 1 }, B = LST.CONFIG.bosses, early = B.early[1];
      const e = g.spawner.spawn("boss", m), want = LST.CONFIG.enemies.boss.hp * Math.pow(2, B.hpExp) * (early ? early.hp : 1);
      this.ok(g.enemies.includes(e) && Math.abs(e.maxHp - want) < 1e-9 && e.hp === e.maxHp && g.bossIntro > 0 && Math.hypot(e.x, e.y) <= LST.CONFIG.MAX_SPAWN_DIST + 1e-9, "spawner: a mini-boss gets the boss HP curve and early tuning, and starts the BOSS banner");
      const b = g.spawner.spawn("basic", m); this.ok(b.maxHp !== want && g.spawner.isMiniBoss(e) && !g.spawner.isMiniBoss(b), "spawner: plain enemies keep their own HP; isMiniBoss reads CONFIG.enemies.*.miniBoss");
      const n = g.enemies.length, bursts = g.bursts.length; g.spawner.minions(e, ["basic", "fast"]);
      this.ok(g.enemies.length === n + 2 && g.bursts.length === bursts + 2 && g.enemies.slice(-2).every((x) => x.age === 0), "spawner: minions() places helpers beside the boss, each with a pop"); }
    // DamageSystem: slam + thorns, splash
    { const g = this.fresh(); const boss = this.enemy("basic", 50, 0); boss.hp = boss.maxHp = 100; g.tower.thorns = 0.5; const hp = g.tower.hp;
      g.damageSystem.bossSlam(boss, 10);
      this.ok(g.tower.hp === hp - 10 && boss.hp === 95 && g.texts.length >= 1, "damage: a slam hurts the tower and Thorns bounces half back to the boss");
      const c = this.enemy("basic", 0, 0), near = this.enemy("basic", 20, 0), far = this.enemy("basic", 400, 0); [c, near, far].forEach((x) => (x.hp = x.maxHp = 50));
      g.damageSystem.splash(c, 7, 60);
      this.ok(c.hp === 50 && near.hp === 43 && far.hp === 50 && g.bursts.some((b) => b.style === "splash" || b.kind === "splash"), "damage: splash hurts enemies in the radius only (not the one hit) and bursts"); }
    // FxSpawner: hit, kill, confetti, explosion
    { const g = this.fresh(), F = g.fxSpawner, e = this.enemy("basic", 10, 10), p = g.particles.length;
      F.hit(e, 12, true); this.ok(g.particles.length === p + 9 && g.texts.some((t) => t.text === "12!"), "fx: hit() makes the crit sparks and the 12! popup");
      F.kill(e); this.ok(g.texts.some((t) => t.text === "+" + e.coins), "fx: kill() makes the coin popup");
      const cf = g.confetti.length; F.confetti(0, 0); this.ok(g.confetti.length === cf + 70, "fx: confetti() defaults to 70 pieces");
      const s0 = g.shake; F.explosion(0, 0); this.ok(g.particles.length > p + 9 && g.shake >= s0, "fx: explosion() makes sparks"); }

    // Oracle: the same scripted run on world.js@24349b8 and on the split objects leaves the same world.
    const a = this.worldRun(false), b = this.worldRun(true);
    this.ok(a.length > 1000 && a === b, `world: a scripted spawn / hit / slam / splash / kill run matches world.js@${this.WORLD_REV} exactly (${a.length} chars of state)`);
  }

  worldRun(split) {
    const files = this.FILES.filter((f) => split || !["core/EnemySpawner.js", "core/DamageSystem.js", "fx/FxSpawner.js"].includes(f));
    const M = Object.create(Math); let seed = 12345; M.random = () => { seed = (seed * 1103515245 + 12345) & 0x7fffffff; return seed / 0x80000000; };
    const sb = { Math: M, console }; sb.window = sb; vm.createContext(sb);
    for (const f of files) vm.runInContext(f === "world.js" && !split ? this.show(this.WORLD_REV, "src/world.js") : this.read("src/" + f), sb, { filename: f });
    const L = sb.LST, theme = { corpseLife: () => 0.8 };
    const w = new L.World({ halfW: 310, halfH: 650, theme });
    const m = { hp: 1.5, speed: 1, damage: 1, coins: 1 };
    for (const wave of [1, 3, 9]) { w.wave = wave; w.spawnEnemy("boss", m); w.spawnEnemy("basic", m); w.spawnEnemy("fast", m); }
    const [e0, e1, e2] = w.enemies;
    w.onHit(e1, 6, false); w.onHit(e2, 13, true); w.onHit(e2, 0, false);
    w.tower.thorns = 0.4; w.onBossSlam(e0, 12); w.onTowerHit(e1);
    w.splashDamage(e1, 5, 300); w.spawnMinions(e0, ["basic", "fast", "basic"]);
    w.onEnemyKilled(e2); w.spawnCorpse(e1); w.spawnConfetti(1, 2); w.spawnConfetti(3, 4, 12); w.spawnHitSparks(0, 0, "#fff", 6); w.spawnExplosion(5, 5);
    w.updateEffects(0.1);
    const keys = ["tower", "enemies", "projectiles", "hazards", "particles", "texts", "bursts", "confetti", "corpses", "vignette", "flash", "shake", "bossIntro", "wave"];
    const seen = new WeakSet();
    return JSON.stringify(keys.map((k) => w[k]), (key, v) => (typeof v === "object" && v ? (seen.has(v) && !Array.isArray(v) ? "[ref]" : (seen.add(v), v)) : v)) + "|" + M.random();
  }

  run() {
    this.load();
    this.checkFiles();
    this.checkAbilities();
    this.checkShop();
    this.checkRewards();
    this.checkBosses();
    this.checkRunAndFlow();
    this.checkSceneFlags();
    this.checkWorld();
    console.log(this.fails ? `\n${this.fails} FAILED (${this.passes} passed)` : `\nALL PASS (${this.passes} passed)`);
    return this.fails ? 1 : 0;
  }
}

module.exports = SystemsTest;
if (require.main === module) process.exit(new SystemsTest().run());
