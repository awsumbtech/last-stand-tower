#!/usr/bin/env python3
# PR 10b shots (390 x 844 @2x, Backyard), same script on main and on the PR tree. The game loop is
# stopped and frames are stepped by hand, so each effect is caught at a set point in its life.
#   python3 tools/qa/pr10b-shots.py --port 8767 --tag 10b --out /tmp/shots-10b
#   python3 tools/qa/pr10b-shots.py --port 8768 --tag main --out /tmp/shots-main   (a main worktree served on 8768)
# Serve the tree first (e.g. python3 -m http.server 8767). Writes pr10b-<shot>-<tag>-390x844.png and
# pr10b-shots-<tag>.json (labels, per-shot state, page errors) into --out.
import argparse, json, os, sys, math
from playwright.sync_api import sync_playwright
STEP = """(n) => { const fx = LST.fxDirector, r = game.renderer; for (let i = 0; i < n; i++) { fx.update(1/60, game, 16.7); r.draw(game, 1/60); fx.endFrame(16.7, 1); } }"""
RUN = """(n) => { const fx = LST.fxDirector, r = game.renderer; for (let i = 0; i < n; i++) { game.update(1/60); fx.update(1/60, game, 16.7); r.draw(game, 1/60); fx.endFrame(16.7, 1); } }"""
AURA = "(LST.FX_PRESETS ? LST.FX_PRESETS.aura : LST.fxManifest.preset('aura'))"

def parse_args(argv=None):
    ap = argparse.ArgumentParser(description="PR 10b effect shots at 390x844 @2x")
    ap.add_argument("--base", help="game URL ending in / (default http://<host>:<port>/)")
    ap.add_argument("--host", default="127.0.0.1")
    ap.add_argument("--port", type=int, default=8767)
    ap.add_argument("--tag", required=True, help="name in the file names, e.g. main or 10b")
    ap.add_argument("--out", required=True, help="output folder (created if missing)")
    return ap.parse_args(argv)

def base_url(a):
    base = a.base or "http://%s:%d/" % (a.host, a.port)
    return base if base.endswith("/") else base + "/"

class ShotRunner:
    """One browser at 390x844 @2x on BASE with the game loop stopped; each method takes one group of shots
    into OUT as pr10b-<shot>-<TAG>-390x844.png. run_all() takes every shot and writes pr10b-shots-<TAG>.json."""
    SECTIONS = ('lowhp', 'finale_dim', 'trails', 'streaks', 'motes', 'bosskill_flash', 'streaks_each', 'trails_each', 'trails_row')

    def __init__(self, base, tag, out):
        self.base = base if base.endswith("/") else base + "/"
        self.tag, self.out = tag, os.path.join(out, "")
        self.errs, self.shots, self.FR = [], [], None

    def open(self):
        os.makedirs(self.out, exist_ok=True)
        self._p = sync_playwright().start(); self.browser = self._p.chromium.launch()
        ctx = self.browser.new_context(viewport={"width": 390, "height": 844}, device_scale_factor=2, has_touch=True, is_mobile=True, service_workers="block")
        pg = self.pg = ctx.new_page(); errs = self.errs
        pg.on("pageerror", lambda e: errs.append("pageerror: " + str(e)))
        pg.on("console", lambda m: errs.append("console.error: " + m.text) if m.type == "error" else None)
        pg.on("response", lambda r: errs.append("http %d %s" % (r.status, r.url)) if r.status >= 400 else None)
        pg.goto(self.base + "index.html?debug=1")
        pg.wait_for_function("window.game && LST.fxDirector && LST.fxManifest && LST.fxManifest.sheet('impact_ring_gold') && (!LST.fxManifest.has('lowHpVignette') || (LST.fxManifest.sheet('vignette_red') && LST.fxManifest.sheet('streak_gold') && LST.fxManifest.sheet('trail_base') && LST.fxManifest.sheet('motes')))", timeout=30000)
        pg.wait_for_timeout(400)
        pg.click("#btn-start"); pg.wait_for_function("game.flow.is('playing') && game.enemies.length > 2", timeout=15000); pg.wait_for_timeout(2000)
        pg.evaluate("() => { window.requestAnimationFrame = () => 0; }"); pg.wait_for_timeout(100)
        self.FR = pg.evaluate("() => game.tower.fireRate")
        return self

    def close(self):
        self.browser.close(); self._p.stop()

    def __enter__(self): return self.open()
    def __exit__(self, *exc): self.close()

    def step(self, n): return self.pg.evaluate(STEP, n)
    def run(self, n): return self.pg.evaluate(RUN, n)

    def fill(self): self.pg.evaluate("(n) => { const fx = LST.fxDirector, r = game.renderer; for (let i = 0; i < 300 && game.projectiles.length < n; i++) { game.update(1/60); fx.update(1/60, game, 16.7); r.draw(game, 1/60); fx.endFrame(16.7, 1); } }", 4)

    def clear(self): self.pg.evaluate("() => { const fx = LST.fxDirector; fx.pools.world.clear(); fx.pools.screen.clear(); fx.camera.clear(); fx.player && fx.player.clear(); fx.arcs.length = 0; game.texts.length = 0; game.tower.overdrive = 0; game.flash = 0; game.vignette = 0; game.lowHpActive = false; game.finale = null; game.projectiles.length = 0; fx.aura.runPower = 0; fx.aura.metaPower = 0; fx.aura.refresh(); game.bursts && (game.bursts.length = 0); }")

    def shot(self, name, label, info="() => null"):
        f = "pr10b-%s-%s-390x844.png" % (name, self.tag); self.pg.screenshot(path=self.out + f); self.shots.append([name, label, f, self.pg.evaluate(info)])

    def lowhp(self):
        """1. low-HP edge: a) the hit that crosses into low HP (vignette 1), b) the steady pulse at its peak (0.32)"""
        self.clear(); self.pg.evaluate("() => { game.lowHpActive = true; game.vignette = 1; }"); self.step(1)
        self.shot("01a-lowhp-enter", "Low-HP edge: the moment HP drops under 25% (vignette 1)")
        self.clear(); self.pg.evaluate("() => { game.lowHpActive = true; game.vignette = 0; game.renderer.time = Math.PI / 12 - 1 / 60; }"); self.step(1)
        self.shot("01b-lowhp-pulse", "Low-HP edge: steady pulse at its peak (0.22 + 0.10)", "() => ({ time: game.renderer.time })")

    def finale_dim(self):
        """2. finale dim: the intro at 0.6 s in (dim fully in; FINALE banner over it)"""
        self.clear(); self.pg.evaluate("() => { game.finale = { intro: LST.CONFIG.finale.introTime - 0.6, mole: null, won: false }; }"); self.step(1)
        self.shot("02-finale-dim", "Finale intro dim, 0.6 s in (dim at full), FINALE banner", "() => ({ intro: game.finale.intro, total: LST.CONFIG.finale.introTime })")
        self.pg.evaluate("() => { game.finale = null; }")

    def trails(self):
        """3. trails: plain, crit and element shots (all 4 elements owned, so shots take turns), game running 75 frames"""
        self.clear()
        self.pg.evaluate("""() => { const t = game.tower; t.critChance = 0.3; t.elements = { ember: 1, frostbite: 1, chainSpark: 1, venom: 1 };
          game.enemies.slice(0, 6).forEach((e, i) => { const a = -2.4 + i * 0.35; e.x = t.x + Math.cos(a) * t.range * 0.85; e.y = t.y + Math.sin(a) * t.range * 0.85; e.hp = e.maxHp = 1e9; e.speed = 0; }); t.fireRate = 6; }""")
        self.run(40); self.fill(); self.pg.evaluate("() => { LST.fxDirector.pools.world.clear(); LST.fxDirector.camera.clear(); game.texts.length = 0; }"); self.step(1)
        self.shot("03-trails", "Projectile trails: plain, crit and element shots (ember / frost / spark / venom take turns), effects of hits cleared", "() => ({ shots: game.projectiles.length, kinds: [...new Set(game.projectiles.map((p) => p.trail || p.tint || 'plain'))] })")
        self.pg.evaluate("() => { const t = game.tower; t.elements = {}; t.critChance = 0; game.projectiles.length = 0; t.fireRate = %s; }" % self.FR)

    def streaks(self):
        """4. streaks: boss-kill burst at 6 frames (0.1 s), and the elemental bursts (ember, frost, venom, shatter) at 5 frames"""
        self.clear(); self.pg.evaluate("() => { const t = game.tower; LST.fxDirector.impacts.fire('bossKill', t.x, t.y - 330, { ringMul: 1 }); }"); self.step(6)
        self.shot("04a-streaks-bosskill", "Streaks: boss-kill burst at 0.1 s (pale / gold / red)", "() => ({ particles: LST.fxDirector.pools.world.count })")
        self.clear(); self.pg.evaluate("""() => { const t = game.tower, I = LST.fxDirector.impacts; [["elemEmber", -110, -430], ["elemFrost", 110, -430], ["elemVenom", -110, -230], ["elemShatter", 110, -230], ["elemSpark", 0, -560]].forEach(([n, dx, dy]) => I.fire(n, t.x + dx, t.y + dy, { ringMul: 1 })); }"""); self.step(5)
        self.shot("04b-streaks-elements", "Streaks: element bursts at 5 frames: ember (top left), frost (top right), venom (low left), shatter (low right), spark (top)", "() => ({ particles: LST.fxDirector.pools.world.count })")

    def motes(self):
        """5. motes: tower idle motes at tier 0 and tier 4 (QA: switched on; off in the game since Nov 4), plus crit glows"""
        for tier, power in ((0, 0.6), (4, 24)):
            self.clear(); self.pg.evaluate("(p) => { " + AURA + ".idleEmission = true; const a = LST.fxDirector.aura; a.runPower = p; a.refresh(); }", power)
            self.step(150)
            self.pg.evaluate("() => { const t = game.tower; for (let i = 0; i < 4; i++) game.events.emit(LST.EVENTS.CRIT, { x: t.x - 120 + i * 80, y: t.y - 420, damage: 9 }); }"); self.step(2)
            self.shot("05-motes-t%d" % tier, "Motes: tower idle motes at aura tier %d (QA: idle motes switched on), plus 4 crit glows up top" % tier, "() => ({ tier: LST.fxDirector.aura.tier, particles: LST.fxDirector.pools.world.count })")
            self.pg.evaluate("() => { " + AURA + ".idleEmission = false; }")

    def bosskill_flash(self):
        """6. boss-kill flash: a real mini-boss kill (Enemy.takeDamage), at 3 frames (the flash's peak) and 12 frames"""
        for n in (3, 12):
            self.clear(); info = self.pg.evaluate("() => { const t = game.tower; game.spawnQueue = []; const e = game.spawnEnemy('boss', game.waveMult || 1); e.x = t.x; e.y = t.y - 300; e.speed = 0; e.takeDamage(1e12, game); return { flash: game.flash }; }")
            self.run(n)
            self.shot("06-bosskill-flash-f%02d" % n, "Boss-kill flash: real mini-boss kill, %d frames after (%d ms); white X13 fill on main, amber screen_burst on 10b" % (n, round(n * 1000 / 60)), "() => ({ flash: game.flash })")
            self.shots[-1].append(info)

    def streaks_each(self):
        """7. each streak variant: 9 bursts of 10 (rows of 4), at 5 frames (fresh) and 14 frames (mid / fade)"""
        EACH = """(n) => { const fx = LST.fxDirector, t = game.tower, I = fx.impacts, pre = LST.FX_PRESETS ? LST.FX_PRESETS.streakBurst : LST.fxManifest.preset('streakBurst');
          const V = [["pale", "#fff3a0"], ["gold", "#ffd23f"], ["amber", "#ffb347"], ["red", "#ff6b6b"], ["pink", "#ff7ac8"], ["cyan", "#7fe3ff"], ["green", "#8be04a"], ["lime", "#b4f06a"], ["soot", "#3a1200"]];
          V.forEach(([v, hex], i) => LST.Emitter.burst(fx.pools.world, I.rng, pre, t.x - 150 + (i % 4) * 100, t.y - 520 + ((i / 4) | 0) * 190, { count: 10, speedMul: 0.6, colors: [LST.FX_PRESETS ? hex : v], priority: true })); }"""
        for n in (5, 14):
            self.clear(); self.pg.evaluate(EACH, 0); self.step(n)
            self.shot("07-streaks-each-f%02d" % n, "Each streak variant, %d frames: row 1 pale, gold, amber, red; row 2 pink, cyan, green, lime; row 3 soot (main: the hex each replaced)" % n, "() => ({ particles: LST.fxDirector.pools.world.count })")

    def trails_each(self):
        """8. each trail on its own: no element (base), then one element at a time, game running 75 frames"""
        for name, el in (("base", None), ("ember", "ember"), ("frost", "frostbite"), ("spark", "chainSpark"), ("venom", "venom")):
            self.clear()
            self.pg.evaluate("""(el) => { const t = game.tower; t.critChance = 0; t.elements = el ? { [el]: 1 } : {};
              game.enemies.slice(0, 6).forEach((e, i) => { const a = -2.4 + i * 0.35; e.x = t.x + Math.cos(a) * t.range * 0.85; e.y = t.y + Math.sin(a) * t.range * 0.85; e.hp = e.maxHp = 1e9; e.speed = 0; }); t.fireRate = 6; }""", el)
            self.run(40); self.fill(); self.pg.evaluate("() => { LST.fxDirector.pools.world.clear(); LST.fxDirector.camera.clear(); LST.fxDirector.arcs.length = 0; game.texts.length = 0; }"); self.step(1)
            self.shot("08-trail-" + name, "Trail %s: %s shots only, hit effects cleared" % (name, el or "plain"), "() => ({ shots: game.projectiles.length, kinds: [...new Set(game.projectiles.map((p) => p.trail || p.tint || 'plain'))] })")
        self.pg.evaluate("(f) => { game.tower.elements = {}; game.tower.fireRate = f; game.projectiles.length = 0; }", self.FR)

    def trails_row(self):
        """9. trail row: one real in-flight shot cloned 5 times and frozen (no game update), base, ember, frost, spark, venom, left to right, flying up"""
        self.clear(); self.pg.evaluate("() => { const t = game.tower; t.elements = {}; game.enemies.slice(0, 6).forEach((e, i) => { const a = -2.4 + i * 0.35; e.x = t.x + Math.cos(a) * t.range * 0.85; e.y = t.y + Math.sin(a) * t.range * 0.85; e.hp = e.maxHp = 1e9; e.speed = 0; }); t.fireRate = 6; }")
        self.run(40); self.fill()
        row = self.pg.evaluate("""() => { const t = game.tower, src = game.projectiles[0]; if (!src) return null; const sp = Math.hypot(src.vx, src.vy);
          const V = [[null, null], ["ember", "#ff7a1a"], ["frost", "#7fe3ff"], ["spark", "#ffe14d"], ["venom", "#8be04a"]];
          game.projectiles.length = 0;
          V.forEach(([tr, hex], i) => { const p = Object.assign(Object.create(Object.getPrototypeOf(src)), src); p.x = t.x - 140 + i * 70; p.y = t.y - 200; p.vx = 0; p.vy = -sp; p.crit = false;
            if ("trail" in src || !LST.FX_PRESETS) p.trail = tr; else p.tint = hex; game.projectiles.push(p); });
          LST.fxDirector.pools.world.clear(); LST.fxDirector.camera.clear(); LST.fxDirector.arcs.length = 0; game.texts.length = 0; return { speed: sp, len: Math.min(48, sp * 0.05) }; }""")
        self.step(1)
        self.shot("09-trails-row", "Trail per variant, frozen: base, ember, frost, spark, venom (left to right), flying up", "() => game.projectiles.map((p) => p.trail || p.tint || 'plain')")
        self.shots[-1].append(row)
        self.pg.evaluate("(f) => { game.tower.fireRate = f; game.projectiles.length = 0; }", self.FR)

    def result(self):
        res = {"tag": self.tag, "shots": self.shots, "errors": self.errs}
        json.dump(res, open(self.out + "pr10b-shots-%s.json" % self.tag, "w"), indent=1)
        return res

    def run_all(self):
        """Takes every shot; returns {"tag", "shots", "errors"} (also written as pr10b-shots-<tag>.json)."""
        with self:
            for n in self.SECTIONS: getattr(self, n)()
        return self.result()

def shoot(BASE, TAG, OUT):
    return ShotRunner(BASE, TAG, OUT).run_all()

def main(argv=None):
    a = parse_args(argv)
    res = shoot(base_url(a), a.tag, a.out)
    print(a.tag, len(res["shots"]), res["errors"][:5])
    return 1 if res["errors"] else 0

if __name__ == "__main__":
    sys.exit(main())
