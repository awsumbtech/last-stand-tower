# PR 10b shots (390 x 844 @2x, Backyard), same script on main and on the PR tree. The game loop is
# stopped and frames are stepped by hand, so each effect is caught at a set point in its life.
import json, sys, math
from playwright.sync_api import sync_playwright
BASE, TAG, OUT = sys.argv[1], sys.argv[2], sys.argv[3]
errs = []; shots = []
STEP = """(n) => { const fx = LST.fxDirector, r = game.renderer; for (let i = 0; i < n; i++) { fx.update(1/60, game, 16.7); r.draw(game, 1/60); fx.endFrame(16.7, 1); } }"""
RUN = """(n) => { const fx = LST.fxDirector, r = game.renderer; for (let i = 0; i < n; i++) { game.update(1/60); fx.update(1/60, game, 16.7); r.draw(game, 1/60); fx.endFrame(16.7, 1); } }"""
AURA = "(LST.FX_PRESETS ? LST.FX_PRESETS.aura : LST.fxManifest.preset('aura'))"
with sync_playwright() as p:
    b = p.chromium.launch()
    ctx = b.new_context(viewport={"width": 390, "height": 844}, device_scale_factor=2, has_touch=True, is_mobile=True, service_workers="block")
    pg = ctx.new_page(); pg.on("pageerror", lambda e: errs.append("pageerror: " + str(e)))
    pg.on("console", lambda m: errs.append("console.error: " + m.text) if m.type == "error" else None)
    pg.on("response", lambda r: errs.append("http %d %s" % (r.status, r.url)) if r.status >= 400 else None)
    pg.goto(BASE + "index.html?debug=1")
    pg.wait_for_function("window.game && LST.fxDirector && LST.fxManifest && LST.fxManifest.sheet('impact_ring_gold') && (!LST.fxManifest.has('lowHpVignette') || (LST.fxManifest.sheet('vignette_red') && LST.fxManifest.sheet('streak_gold') && LST.fxManifest.sheet('trail_base') && LST.fxManifest.sheet('motes')))", timeout=30000)
    pg.wait_for_timeout(400)
    pg.click("#btn-start"); pg.wait_for_function("game.flow.is('playing') && game.enemies.length > 2", timeout=15000); pg.wait_for_timeout(2000)
    pg.evaluate("() => { window.requestAnimationFrame = () => 0; }"); pg.wait_for_timeout(100)
    step = lambda n: pg.evaluate(STEP, n); run = lambda n: pg.evaluate(RUN, n)
    FR = pg.evaluate("() => game.tower.fireRate")
    def fill(): pg.evaluate("(n) => { const fx = LST.fxDirector, r = game.renderer; for (let i = 0; i < 300 && game.projectiles.length < n; i++) { game.update(1/60); fx.update(1/60, game, 16.7); r.draw(game, 1/60); fx.endFrame(16.7, 1); } }", 4)
    def clear(): pg.evaluate("() => { const fx = LST.fxDirector; fx.pools.world.clear(); fx.pools.screen.clear(); fx.camera.clear(); fx.player && fx.player.clear(); fx.arcs.length = 0; game.texts.length = 0; game.tower.overdrive = 0; game.flash = 0; game.vignette = 0; game.lowHpActive = false; game.finale = null; game.projectiles.length = 0; fx.aura.runPower = 0; fx.aura.metaPower = 0; fx.aura.refresh(); game.bursts && (game.bursts.length = 0); }")
    def shot(name, label, info="() => null"):
        f = "pr10b-%s-%s-390x844.png" % (name, TAG); pg.screenshot(path=OUT + f); shots.append([name, label, f, pg.evaluate(info)])
    # 1. low-HP edge: a) the hit that crosses into low HP (vignette 1), b) the steady pulse at its peak (0.32)
    clear(); pg.evaluate("() => { game.lowHpActive = true; game.vignette = 1; }"); step(1)
    shot("01a-lowhp-enter", "Low-HP edge: the moment HP drops under 25% (vignette 1)")
    clear(); pg.evaluate("() => { game.lowHpActive = true; game.vignette = 0; game.renderer.time = Math.PI / 12 - 1 / 60; }"); step(1)
    shot("01b-lowhp-pulse", "Low-HP edge: steady pulse at its peak (0.22 + 0.10)", "() => ({ time: game.renderer.time })")
    # 2. finale dim: the intro at 0.6 s in (dim fully in; FINALE banner over it)
    clear(); pg.evaluate("() => { game.finale = { intro: LST.CONFIG.finale.introTime - 0.6, mole: null, won: false }; }"); step(1)
    shot("02-finale-dim", "Finale intro dim, 0.6 s in (dim at full), FINALE banner", "() => ({ intro: game.finale.intro, total: LST.CONFIG.finale.introTime })")
    pg.evaluate("() => { game.finale = null; }")
    # 3. trails: plain, crit and element shots (all 4 elements owned, so shots take turns), game running 75 frames
    clear()
    pg.evaluate("""() => { const t = game.tower; t.critChance = 0.3; t.elements = { ember: 1, frostbite: 1, chainSpark: 1, venom: 1 };
      game.enemies.slice(0, 6).forEach((e, i) => { const a = -2.4 + i * 0.35; e.x = t.x + Math.cos(a) * t.range * 0.85; e.y = t.y + Math.sin(a) * t.range * 0.85; e.hp = e.maxHp = 1e9; e.speed = 0; }); t.fireRate = 6; }""")
    run(40); fill(); pg.evaluate("() => { LST.fxDirector.pools.world.clear(); LST.fxDirector.camera.clear(); game.texts.length = 0; }"); step(1)
    shot("03-trails", "Projectile trails: plain, crit and element shots (ember / frost / spark / venom take turns), effects of hits cleared", "() => ({ shots: game.projectiles.length, kinds: [...new Set(game.projectiles.map((p) => p.trail || p.tint || 'plain'))] })")
    pg.evaluate("() => { const t = game.tower; t.elements = {}; t.critChance = 0; game.projectiles.length = 0; t.fireRate = %s; }" % FR)
    # 4. streaks: boss-kill burst at 6 frames (0.1 s), and the elemental bursts (ember, frost, venom, shatter) at 5 frames
    clear(); pg.evaluate("() => { const t = game.tower; LST.fxDirector.impacts.fire('bossKill', t.x, t.y - 330, { ringMul: 1 }); }"); step(6)
    shot("04a-streaks-bosskill", "Streaks: boss-kill burst at 0.1 s (pale / gold / red)", "() => ({ particles: LST.fxDirector.pools.world.count })")
    clear(); pg.evaluate("""() => { const t = game.tower, I = LST.fxDirector.impacts; [["elemEmber", -110, -430], ["elemFrost", 110, -430], ["elemVenom", -110, -230], ["elemShatter", 110, -230], ["elemSpark", 0, -560]].forEach(([n, dx, dy]) => I.fire(n, t.x + dx, t.y + dy, { ringMul: 1 })); }"""); step(5)
    shot("04b-streaks-elements", "Streaks: element bursts at 5 frames: ember (top left), frost (top right), venom (low left), shatter (low right), spark (top)", "() => ({ particles: LST.fxDirector.pools.world.count })")
    # 5. motes: tower idle motes at tier 0 and tier 4 (QA: switched on; off in the game since Nov 4), plus crit glows
    for tier, power in ((0, 0.6), (4, 24)):
        clear(); pg.evaluate("(p) => { " + AURA + ".idleEmission = true; const a = LST.fxDirector.aura; a.runPower = p; a.refresh(); }", power)
        step(150)
        pg.evaluate("() => { const t = game.tower; for (let i = 0; i < 4; i++) game.events.emit(LST.EVENTS.CRIT, { x: t.x - 120 + i * 80, y: t.y - 420, damage: 9 }); }"); step(2)
        shot("05-motes-t%d" % tier, "Motes: tower idle motes at aura tier %d (QA: idle motes switched on), plus 4 crit glows up top" % tier, "() => ({ tier: LST.fxDirector.aura.tier, particles: LST.fxDirector.pools.world.count })")
        pg.evaluate("() => { " + AURA + ".idleEmission = false; }")
    # 6. boss-kill flash: a real mini-boss kill (Enemy.takeDamage), at 3 frames (the flash's peak) and 12 frames
    for n in (3, 12):
        clear(); info = pg.evaluate("() => { const t = game.tower; game.spawnQueue = []; const e = game.spawnEnemy('boss', game.waveMult || 1); e.x = t.x; e.y = t.y - 300; e.speed = 0; e.takeDamage(1e12, game); return { flash: game.flash }; }")
        run(n)
        shot("06-bosskill-flash-f%02d" % n, "Boss-kill flash: real mini-boss kill, %d frames after (%d ms); white X13 fill on main, amber screen_burst on 10b" % (n, round(n * 1000 / 60)), "() => ({ flash: game.flash })")
        shots[-1].append(info)
    # 7. each streak variant: 9 bursts of 10 (rows of 4), at 5 frames (fresh) and 14 frames (mid / fade)
    EACH = """(n) => { const fx = LST.fxDirector, t = game.tower, I = fx.impacts, pre = LST.FX_PRESETS ? LST.FX_PRESETS.streakBurst : LST.fxManifest.preset('streakBurst');
      const V = [["pale", "#fff3a0"], ["gold", "#ffd23f"], ["amber", "#ffb347"], ["red", "#ff6b6b"], ["pink", "#ff7ac8"], ["cyan", "#7fe3ff"], ["green", "#8be04a"], ["lime", "#b4f06a"], ["soot", "#3a1200"]];
      V.forEach(([v, hex], i) => LST.Emitter.burst(fx.pools.world, I.rng, pre, t.x - 150 + (i % 4) * 100, t.y - 520 + ((i / 4) | 0) * 190, { count: 10, speedMul: 0.6, colors: [LST.FX_PRESETS ? hex : v], priority: true })); }"""
    for n in (5, 14):
        clear(); pg.evaluate(EACH, 0); step(n)
        shot("07-streaks-each-f%02d" % n, "Each streak variant, %d frames: row 1 pale, gold, amber, red; row 2 pink, cyan, green, lime; row 3 soot (main: the hex each replaced)" % n, "() => ({ particles: LST.fxDirector.pools.world.count })")
    # 8. each trail on its own: no element (base), then one element at a time, game running 75 frames
    for name, el in (("base", None), ("ember", "ember"), ("frost", "frostbite"), ("spark", "chainSpark"), ("venom", "venom")):
        clear()
        pg.evaluate("""(el) => { const t = game.tower; t.critChance = 0; t.elements = el ? { [el]: 1 } : {};
          game.enemies.slice(0, 6).forEach((e, i) => { const a = -2.4 + i * 0.35; e.x = t.x + Math.cos(a) * t.range * 0.85; e.y = t.y + Math.sin(a) * t.range * 0.85; e.hp = e.maxHp = 1e9; e.speed = 0; }); t.fireRate = 6; }""", el)
        run(40); fill(); pg.evaluate("() => { LST.fxDirector.pools.world.clear(); LST.fxDirector.camera.clear(); LST.fxDirector.arcs.length = 0; game.texts.length = 0; }"); step(1)
        shot("08-trail-" + name, "Trail %s: %s shots only, hit effects cleared" % (name, el or "plain"), "() => ({ shots: game.projectiles.length, kinds: [...new Set(game.projectiles.map((p) => p.trail || p.tint || 'plain'))] })")
    pg.evaluate("(f) => { game.tower.elements = {}; game.tower.fireRate = f; game.projectiles.length = 0; }", FR)
    # 9. trail row: one real in-flight shot cloned 5 times and frozen (no game update), base, ember, frost, spark, venom, left to right, flying up
    clear(); pg.evaluate("() => { const t = game.tower; t.elements = {}; game.enemies.slice(0, 6).forEach((e, i) => { const a = -2.4 + i * 0.35; e.x = t.x + Math.cos(a) * t.range * 0.85; e.y = t.y + Math.sin(a) * t.range * 0.85; e.hp = e.maxHp = 1e9; e.speed = 0; }); t.fireRate = 6; }")
    run(40); fill()
    row = pg.evaluate("""() => { const t = game.tower, src = game.projectiles[0]; if (!src) return null; const sp = Math.hypot(src.vx, src.vy);
      const V = [[null, null], ["ember", "#ff7a1a"], ["frost", "#7fe3ff"], ["spark", "#ffe14d"], ["venom", "#8be04a"]];
      game.projectiles.length = 0;
      V.forEach(([tr, hex], i) => { const p = Object.assign(Object.create(Object.getPrototypeOf(src)), src); p.x = t.x - 140 + i * 70; p.y = t.y - 200; p.vx = 0; p.vy = -sp; p.crit = false;
        if ("trail" in src || !LST.FX_PRESETS) p.trail = tr; else p.tint = hex; game.projectiles.push(p); });
      LST.fxDirector.pools.world.clear(); LST.fxDirector.camera.clear(); LST.fxDirector.arcs.length = 0; game.texts.length = 0; return { speed: sp, len: Math.min(48, sp * 0.05) }; }""")
    step(1)
    shot("09-trails-row", "Trail per variant, frozen: base, ember, frost, spark, venom (left to right), flying up", "() => game.projectiles.map((p) => p.trail || p.tint || 'plain')")
    shots[-1].append(row)
    pg.evaluate("(f) => { game.tower.fireRate = f; game.projectiles.length = 0; }", FR)
    b.close()
json.dump({"tag": TAG, "shots": shots, "errors": errs}, open(OUT + "pr10b-shots-%s.json" % TAG, "w"), indent=1)
print(TAG, len(shots), errs[:5])
