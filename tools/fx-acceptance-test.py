#!/usr/bin/env python3
"""FX acceptance test (browser): python tools/fx-acceptance-test.py

PR 10a's bar (docs/OO-MIGRATION.md, Decision 14): a new effect is an assets/fx/fx.json entry plus
its art files, with no code edit. This copies the tree to a temp dir, adds ONE fx.json entry
("acceptanceSpark", played on the CRIT event) and the test-only fixture sheet
(tools/fixtures/fx/acceptance_spark.png / .json) next to it, and checks that nothing else in the
copy differs. Then it serves the copy, opens it at 390 x 844 in headless Chromium and checks that
the game loads the new sheet, plays the effect by id and on a crit, draws frames of the fixture
PNG with drawImage (frame advancing), and drops it once its life (the sheet's 4 frames / 8 fps)
is over. The fixture is never added to the real tree.
"""
import functools, hashlib, http.server, json, os, shutil, sys, tempfile, threading, time
from playwright.sync_api import sync_playwright

class QuietHandler(http.server.SimpleHTTPRequestHandler):
    def log_message(self, *args): pass

class FxAcceptanceTest:
    ID = "acceptanceSpark"
    SHEET = "acceptance_spark"
    SKIP = {".git", "node_modules", "qa"}
    # Wraps drawImage before the game loads: logs every draw of the fixture PNG with its source x.
    INIT = """(() => { const P = CanvasRenderingContext2D.prototype, d = P.drawImage; window.__spark = [];
      P.drawImage = function (img, ...a) { if (img && img.src && /acceptance_spark\\.png$/.test(img.src)) window.__spark.push({ t: performance.now(), sx: a[0], n: a.length }); return d.call(this, img, ...a); }; })();"""

    def __init__(self, root=os.path.join(os.path.dirname(os.path.abspath(__file__)), "..")):
        self.root = os.path.abspath(root)
        self.passes = 0
        self.fails = 0

    def ok(self, cond, msg):
        if cond: self.passes += 1
        else:
            self.fails += 1
            print("FAIL " + msg)

    def files(self, top):
        out = {}
        for d, dirs, names in os.walk(top):
            dirs[:] = [x for x in dirs if x not in self.SKIP]
            for n in names:
                p = os.path.join(d, n)
                out[os.path.relpath(p, top)] = hashlib.sha256(open(p, "rb").read()).hexdigest()
        return out

    def make_copy(self, tmp):
        dst = os.path.join(tmp, "tree")
        shutil.copytree(self.root, dst, ignore=shutil.ignore_patterns(*self.SKIP))
        fx = os.path.join(dst, "assets/fx/fx.json")
        data = json.load(open(fx))
        data["sheets"][self.SHEET] = self.SHEET + ".json"
        data["effects"][self.ID] = {"what": "acceptance test effect (temp copy only)", "sheet": self.SHEET, "size": 2, "on": "CRIT"}
        json.dump(data, open(fx, "w"), indent=1)
        for ext in (".png", ".json"):
            shutil.copy(os.path.join(self.root, "tools/fixtures/fx", self.SHEET + ext), os.path.join(dst, "assets/fx", self.SHEET + ext))
        return dst

    def check_diff(self, dst):
        a, b = self.files(self.root), self.files(dst)
        changed = sorted(k for k in a if k in b and a[k] != b[k])
        added = sorted(k for k in b if k not in a)
        removed = sorted(k for k in a if k not in b)
        self.ok(changed == ["assets/fx/fx.json"] and added == ["assets/fx/acceptance_spark.json", "assets/fx/acceptance_spark.png"] and not removed,
                "zero code edits: the copy differs only in fx.json + the 2 art files (changed %s, added %s, removed %s)" % (changed, added, removed))

    def serve(self, directory):
        handler = functools.partial(QuietHandler, directory=directory)
        srv = http.server.ThreadingHTTPServer(("127.0.0.1", 0), handler)
        threading.Thread(target=srv.serve_forever, daemon=True).start()
        return srv, "http://127.0.0.1:%d/index.html" % srv.server_address[1]

    def check_browser(self, url):
        with sync_playwright() as p:
            browser = p.chromium.launch()
            ctx = browser.new_context(viewport={"width": 390, "height": 844}, device_scale_factor=2, has_touch=True, is_mobile=True, service_workers="block")
            ctx.add_init_script(self.INIT)
            pg = ctx.new_page()
            errors = []
            pg.on("pageerror", lambda e: errors.append(str(e)))
            pg.goto(url)
            pg.wait_for_function("() => window.LST && LST.fxManifest && LST.fxManifest.sheet('%s')" % self.SHEET, timeout=15000)
            self.ok(pg.evaluate("() => LST.fxManifest.has('%s') && !!LST.fxManifest.sheet('%s').strips.main.ready" % (self.ID, self.SHEET)),
                    "the game loads the new fx.json entry and its sheet (fetched from assets/fx, image decoded)")
            pg.evaluate("() => document.getElementById('btn-start').click()")
            pg.wait_for_timeout(300)
            # 1. by id
            started = pg.evaluate("() => { window.__spark.length = 0; const t = game.tower; return !!LST.fxDirector.play('%s', t.x, t.y - 80); }" % self.ID)
            pg.wait_for_timeout(250)
            mid = pg.evaluate("() => ({ draws: window.__spark.slice(), live: LST.fxDirector.player.list.filter((f) => f.id === '%s').length })" % self.ID)
            sx = sorted(set(d["sx"] for d in mid["draws"]))
            self.ok(started and mid["live"] == 1 and len(mid["draws"]) > 0 and all(d["n"] == 8 for d in mid["draws"]),
                    "played by id: LST.fxDirector.play('%s') draws the fixture PNG with drawImage (%d draws)" % (self.ID, len(mid["draws"])))
            self.ok(len(sx) >= 2 and all(s % 32 == 0 and 0 <= s < 128 for s in sx), "its frames advance through the 4-frame strip (source x %s)" % sx)
            pg.wait_for_timeout(600)
            end = pg.evaluate("() => { const n = window.__spark.length; return { live: LST.fxDirector.player.list.filter((f) => f.id === '%s').length, n }; }" % self.ID)
            pg.wait_for_timeout(200)
            after = pg.evaluate("() => window.__spark.length")
            self.ok(end["live"] == 0 and after == end["n"], "it is removed after its life (0.5 s: 4 frames / 8 fps) and draws no more")
            # 2. on its event ("on": "CRIT")
            pg.evaluate("() => { window.__spark.length = 0; const t = game.tower; game.events.emit(LST.EVENTS.CRIT, { x: t.x + 40, y: t.y - 60, damage: 1 }); }")
            pg.wait_for_timeout(200)
            ev = pg.evaluate("() => ({ n: window.__spark.length, live: LST.fxDirector.player.list.filter((f) => f.id === '%s').map((f) => [Math.round(f.x - game.tower.x), Math.round(f.y - game.tower.y)]) })" % self.ID)
            self.ok(ev["n"] > 0 and ev["live"] == [[40, -60]], "played on its event: a CRIT plays it at the event's x, y (%s, %d draws)" % (ev["live"], ev["n"]))
            self.ok(not errors, "no page errors (%s)" % "; ".join(errors[:3]))
            browser.close()

    def run(self):
        tmp = tempfile.mkdtemp(prefix="lst-fx-accept-")
        try:
            dst = self.make_copy(tmp)
            self.check_diff(dst)
            srv, url = self.serve(dst)
            try: self.check_browser(url)
            finally: srv.shutdown()
        finally:
            shutil.rmtree(tmp, ignore_errors=True)
        self.ok(not os.path.exists(os.path.join(self.root, "assets/fx/acceptance_spark.png")), "the real tree is untouched (no fixture in assets/fx)")
        print("\n%d FAILED (%d passed)" % (self.fails, self.passes) if self.fails else "\nALL PASS (%d passed)" % self.passes)
        return 1 if self.fails else 0

if __name__ == "__main__":
    sys.exit(FxAcceptanceTest().run())
