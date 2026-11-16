#!/usr/bin/env python3
"""Screen snapshot test (browser): python tools/screen-snapshot-test.py

PR 9 split ui.js into one object per screen. The oracle is the real UI at 2fb06e6 (git worktree,
nothing copied). Both trees are served locally and driven through the same script of clicks and
game calls in headless Chromium, with Math.random seeded (again in the same call as every step, after the page's timers have run for
race_ms, so a music tick can't shift the stream) and requestAnimationFrame stopped (so no frame runs). After every step the whole <body> markup of the
two pages (minus the <script> loader tags and the blank text between body children) must be identical: every screen (start, settings, confirm, workshop tabs and codex,
HUD, boss bar, pause, shop, card taken, gotcha, dying, results, workshop over the results,
cleared, toast). Then, on this tree only, it checks that each screen object owns its root
element and is the one visible after UI.show.
"""
import functools, http.server, json, os, shutil, socket, subprocess, sys, tempfile, threading
from playwright.sync_api import sync_playwright

class QuietHandler(http.server.SimpleHTTPRequestHandler):
    def log_message(self, *args): pass

class ScreenSnapshotTest:
    BASE = "2fb06e6"
    INIT = """(() => { let a = 12345; Math.random = () => { a = (a + 0x6d2b79f5) >>> 0; let t = a; t = Math.imul(t ^ (t >>> 15), t | 1);
      t ^= t + Math.imul(t ^ (t >>> 7), t | 61); return ((t ^ (t >>> 14)) >>> 0) / 4294967296; };
      window.__reseed = (k) => { a = k >>> 0; };
      window.requestAnimationFrame = () => 0; window.cancelAnimationFrame = () => {}; })();"""
    CLICK = "(id) => document.getElementById(id).click()"
    # [name, js run in the page] (only APIs both trees have; no compat state reads, so it runs on both)
    STEPS = [
        ["start", "() => {}"],
        ["settings", "() => document.getElementById('btn-settings').click()"],
        ["confirm", "() => document.getElementById('btn-reset').click()"],
        ["confirm-cancel", "() => document.getElementById('btn-confirm-cancel').click()"],
        ["settings-done", "() => document.getElementById('btn-resume').click()"],
        ["workshop-cards", "() => document.getElementById('btn-workshop').click()"],
        ["workshop-upgrades", "() => document.querySelector('.tabs .tab[data-tab=upgrades]').click()"],
        ["workshop-deck", "() => document.querySelector('.tabs .tab[data-tab=deck]').click()"],
        ["workshop-codex", "() => document.querySelector('.tabs .tab[data-tab=codex]').click()"],
        ["workshop-codex-tile", "() => document.querySelector('#ws-grid [data-codex]').click()"],
        ["workshop-locked-tap", "() => { document.querySelector('.tabs .tab[data-tab=cards]').click(); const c = document.querySelector('#ws-grid [data-card]:not(.owned)'); if (c) c.click(); }"],
        ["workshop-back", "() => document.getElementById('btn-ws-back').click()"],
        ["playing-hud", "() => { document.getElementById('btn-start').click(); game.ui.updateHud(); }"],
        ["boss-bar", "() => { game.spawnEnemy('boss', { hp: 1, speed: 1, damage: 1, coins: 1 }); game.ui.updateHud(); }"],
        ["paused", "() => { document.getElementById('btn-pause').click(); game.ui.updateHud(); }"],
        ["resumed", "() => { document.getElementById('btn-resume').click(); game.ui.updateHud(); }"],
        ["shop", "() => { game.enemies.length = 0; game.spawnQueue = []; game.endWave(); game.celebrateTimer = 0; game.gotchaQueue = []; game.finishCelebration(); }"],
        ["shop-took", "() => { game.takeCard(0); }"],
        ["shop-reroll", "() => { game.coins = 500; game.rerollShop(); }"],
        ["shop-repair", "() => { game.tower.hp = 10; game.repairTower(); }"],
        ["next-wave", "() => { document.getElementById('btn-next').click(); game.ui.updateHud(); }"],
        ["gotcha", "() => { game.enemies.length = 0; game.spawnQueue = []; game.endWave(); game.celebrateTimer = 0; game.gotchaQueue = [LST.TRAPS[0].id]; game.finishCelebration(); }"],
        ["gotcha-dismissed", "() => document.getElementById('btn-gotcha').click()"],
        ["dying", "() => { document.getElementById('btn-next').click(); game.tower.hp = 0; game.gameOver(); }"],
        ["results", "() => game.showResults()"],
        ["results-workshop", "() => document.getElementById('btn-res-workshop').click()"],
        ["results-back", "() => document.getElementById('btn-ws-back').click()"],
        ["cleared", "() => { game.flow.set('cleared'); game.ui.show('cleared'); }"],
        ["toast", "() => game.ui.toast('Progress reset. Fresh start!')"],
        ["menu-again", "() => { game.toMenu(); }"],
    ]

    def __init__(self, root=os.path.join(os.path.dirname(os.path.abspath(__file__)), ".."), race_ms=150):
        self.root = os.path.abspath(root)
        self.race_ms = race_ms  # forced timer race: let the page's timers (music) run for this long before each step
        self.passes = 0
        self.fails = 0

    def ok(self, cond, msg):
        if cond: self.passes += 1
        else:
            self.fails += 1
            print("FAIL " + msg)

    def serve(self, directory):
        handler = functools.partial(QuietHandler, directory=directory)
        srv = http.server.ThreadingHTTPServer(("127.0.0.1", 0), handler)
        threading.Thread(target=srv.serve_forever, daemon=True).start()
        return srv, "http://127.0.0.1:%d/index.html" % srv.server_address[1]

    def run_tree(self, browser, url):
        ctx = browser.new_context(viewport={"width": 390, "height": 844}, device_scale_factor=2, has_touch=True, is_mobile=True, service_workers="block")
        ctx.add_init_script(self.INIT)
        pg = ctx.new_page()
        errs = []
        pg.on("pageerror", lambda e: errs.append(str(e)))
        pg.on("console", lambda m: errs.append(m.text) if m.type == "error" else None)
        pg.goto(url)
        pg.wait_for_function("window.game && window.LST && game.ui", timeout=20000)
        snaps = []
        self.visible = []
        for i, (name, js) in enumerate(self.STEPS):
            # Timers keep drawing random numbers between steps (the music scheduler's noise() hats, audio.js).
            # The forced race lets them run first; then the reseed and the step run in ONE synchronous call,
            # so no timer can land between them (two calls let a music tick shift the card deal: CI run
            # 43907621954 attempt 1).
            if self.race_ms: pg.wait_for_timeout(self.race_ms)
            pg.evaluate("([k, js]) => { window.__reseed(k); (0, eval)('(' + js + ')')(); }", [1000 + i, js])
            self.visible.append(pg.evaluate("() => [...document.querySelectorAll('.screen:not(.hidden)')].map((e) => e.id).join(',') + (document.getElementById('hud').classList.contains('hidden') ? '' : '+hud') + (document.getElementById('boss-bar').classList.contains('hidden') ? '' : '+boss')"))
            snaps.append(pg.evaluate("() => { const b = document.body.cloneNode(true); b.querySelectorAll('script').forEach((e) => e.remove()); [...b.childNodes].forEach((n) => { if (n.nodeType === 3 && !n.textContent.trim()) n.remove(); }); return b.className + '\\n' + b.innerHTML; }"))
        return ctx, pg, snaps, errs

    def check_owners(self, pg):
        rep = pg.evaluate("""() => {
          const u = game.ui, out = {};
          const ids = { start: 'screen-start', upgrade: 'screen-upgrade', pause: 'screen-pause', results: 'screen-results', workshop: 'screen-workshop', confirm: 'screen-confirm', gotcha: 'screen-gotcha', cleared: 'screen-cleared' };
          for (const [k, id] of Object.entries(ids)) {
            const s = u.screens[k];
            const owns = s instanceof LST.Screen && s.el === document.getElementById(id);
            u.show(k);
            const vis = [...document.querySelectorAll('.screen:not(.hidden)')].map((e) => e.id);
            out[k] = { cls: s.constructor.name, owns, onlyVisible: vis.length === 1 && vis[0] === id, hud: !document.getElementById('hud').classList.contains('hidden'), hidesHud: s.hidesHud };
          }
          u.show(null);
          out.none = [...document.querySelectorAll('.screen:not(.hidden)')].length;
          out.hud = u.hud instanceof LST.Hud && u.hud.el === document.getElementById('hud') && u.hud.ability instanceof LST.AbilityButton && u.hud.bossBar instanceof LST.BossBar;
          out.tabs = Object.entries(u.screens.workshop.tabs).map(([k, t]) => k + ':' + t.constructor.name).join(',');
          out.states = Object.fromEntries(Object.entries(game.flow.states).map(([id, s]) => [id, [s.screen, s.hudLive, s.runPaused]]));
          return out; }""")
        want = {"start": "StartScreen", "upgrade": "ShopScreen", "pause": "PauseScreen", "results": "ResultsScreen", "workshop": "WorkshopScreen", "confirm": "ConfirmScreen", "gotcha": "GotchaScreen", "cleared": "ClearedScreen"}
        for k, cls in want.items():
            r = rep[k]
            self.ok(r["cls"] == cls and r["owns"] and r["onlyVisible"] and r["hud"] == (not r["hidesHud"]), "owner: %s is a %s that owns its #screen element, is the only screen shown by UI.show('%s'), and sets the HUD (%s)" % (k, cls, k, json.dumps(r)))
        self.ok(rep["none"] == 0 and rep["hud"], "owner: UI.show(null) hides every screen; the Hud owns #hud, its AbilityButton and BossBar")
        self.ok(rep["tabs"] == "cards:CardsTab,upgrades:UpgradesTab,deck:DeckTab,codex:CodexTab", "owner: the Workshop's tabs are CardsTab, UpgradesTab, DeckTab, CodexTab (%s)" % rep["tabs"])
        want_states = {"menu": ["start", False, False], "playing": [None, True, False], "paused": ["pause", True, True], "celebrate": [None, False, False], "upgrade": ["upgrade", False, False],
                       "gotcha": ["gotcha", False, False], "gameover": ["results", False, False], "workshop": ["workshop", False, False], "victory": [None, False, False], "cleared": ["cleared", False, False]}
        self.ok(rep["states"] == want_states, "owner: each state names its screen, hudLive and runPaused (%s)" % json.dumps(rep["states"]))

    def run(self):
        tmp = tempfile.mkdtemp(prefix="lst-snap-")
        base = os.path.join(tmp, "base")
        subprocess.run(["git", "worktree", "add", "--detach", base, self.BASE], cwd=self.root, check=True, capture_output=True)
        try:
            s_old, u_old = self.serve(base)
            s_new, u_new = self.serve(self.root)
            with sync_playwright() as p:
                b = p.chromium.launch()
                c1, _, old, e_old = self.run_tree(b, u_old)
                c2, pg, new, e_new = self.run_tree(b, u_new)
                for (name, _), a, z in zip(self.STEPS, old, new):
                    if a != z:
                        i = next((k for k in range(min(len(a), len(z))) if a[k] != z[k]), min(len(a), len(z)))
                        print("  diff at %d:\n    old: %r\n    new: %r" % (i, a[max(0, i - 80):i + 120], z[max(0, i - 80):i + 120]))
                    self.ok(a == z, "snapshot: %s: <body> matches %s (%d chars)" % (name, self.BASE, len(z)))
                want = ["screen-start", "screen-pause+hud", "screen-confirm+hud", "screen-pause+hud", "screen-start", "screen-workshop", "screen-workshop", "screen-workshop", "screen-workshop", "screen-workshop", "screen-workshop", "screen-start",
                        "+hud", "+hud+boss", "screen-pause+hud+boss", "+hud+boss", "screen-upgrade+hud", "screen-upgrade+hud", "screen-upgrade+hud", "screen-upgrade+hud", "+hud", "screen-gotcha", "screen-upgrade+hud",
                        "", "screen-results", "screen-workshop", "screen-results", "screen-cleared", "screen-cleared", "screen-start"]
                self.ok(self.visible == want, "snapshot: each step shows the screen it is meant to (%s)" % ", ".join("%s=%s" % (n, v) for (n, _), v in zip(self.STEPS, self.visible)))
                self.ok(len(set(new)) > 20, "snapshot: the steps reach %d different screens / states" % len(set(new)))
                self.ok(not e_old and not e_new, "snapshot: no page or console errors (old %s, new %s)" % (e_old, e_new))
                self.check_owners(pg)
                b.close()
            s_old.shutdown(); s_new.shutdown()
        finally:
            subprocess.run(["git", "worktree", "remove", "--force", base], cwd=self.root, capture_output=True)
            shutil.rmtree(tmp, ignore_errors=True)
        print("\n%d FAILED (%d passed)" % (self.fails, self.passes) if self.fails else "\nALL PASS (%d passed)" % self.passes)
        return 1 if self.fails else 0

if __name__ == "__main__":
    sys.exit(ScreenSnapshotTest(race_ms=int(os.environ.get("SNAPSHOT_RACE_MS", "150"))).run())
