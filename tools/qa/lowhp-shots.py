#!/usr/bin/env python3
# Low-HP vignette shots (390x844 @2x) on one map, same setup as tools/qa/pr10b-shots.py (game loop
# stopped, frames stepped by hand). Writes pr10b-shots-<tag>.json in its format, so
# tools/qa/pr10b-compare.py pairs two runs. Frames: the low-HP hit (vignette 1), the steady pulse at its
# peak (0.32) and mid-swing (0.22), with 8 enemies parked 24 px inside the screen edges.
#   python3 tools/qa/lowhp-shots.py --port 8767 --tag 10b --out /tmp/lowhp-10b --world beach
import argparse, json, os, sys
from playwright.sync_api import sync_playwright

STEP = """(n) => { const fx = LST.fxDirector, r = game.renderer; for (let i = 0; i < n; i++) { fx.update(1/60, game, 16.7); r.draw(game, 1/60); fx.endFrame(16.7, 1); } }"""

def parse_args(argv=None):
    ap = argparse.ArgumentParser(description="Low-HP vignette shots at 390x844 @2x")
    ap.add_argument("--base", help="game URL ending in / (default http://<host>:<port>/)")
    ap.add_argument("--host", default="127.0.0.1")
    ap.add_argument("--port", type=int, default=8767)
    ap.add_argument("--tag", required=True, help="name in the file names, e.g. main or 10b")
    ap.add_argument("--out", required=True, help="output folder (created if missing)")
    ap.add_argument("--world", default="backyard", help="world id (backyard, beach)")
    return ap.parse_args(argv)

def shoot(BASE, tag, out, world="backyard"):
    """Takes the 3 frames into out; returns {"tag", "world", "placed", "shots", "errors"} (also written as pr10b-shots-<tag>.json)."""
    BASE = BASE if BASE.endswith("/") else BASE + "/"; OUT = os.path.join(out, ""); os.makedirs(OUT, exist_ok=True)
    errs, shots = [], []
    with sync_playwright() as p:
        b = p.chromium.launch()
        ctx = b.new_context(viewport={"width": 390, "height": 844}, device_scale_factor=2, has_touch=True, is_mobile=True, service_workers="block")
        pg = ctx.new_page(); pg.on("pageerror", lambda e: errs.append("pageerror: " + str(e)))
        pg.on("console", lambda m: errs.append("console.error: " + m.text) if m.type == "error" else None)
        pg.on("response", lambda r: errs.append("http %d %s" % (r.status, r.url)) if r.status >= 400 else None)
        pg.goto(BASE + "index.html?debug=1")
        pg.wait_for_function("window.game && LST.fxDirector && LST.fxManifest && LST.fxManifest.sheet('vignette_red') && LST.fxManifest.sheet('impact_ring_gold')", timeout=30000)
        pg.wait_for_timeout(400)
        if world != "backyard": pg.evaluate("(id) => game.useWorld(LST.WorldRegistry.get(id))", world); pg.wait_for_timeout(1500)
        pg.click("#btn-start"); pg.wait_for_function("game.flow.is('playing') && game.enemies.length > 2", timeout=15000); pg.wait_for_timeout(2500)
        pg.evaluate("() => { window.requestAnimationFrame = () => 0; }"); pg.wait_for_timeout(100)
        world_id = pg.evaluate("() => game.world.id")
        # Park 8 enemies 24 CSS px inside each edge (side middles, top / bottom middles, two near corners), frozen.
        placed = pg.evaluate("""() => { const t = game.tower, r = game.renderer, k = (r.halfW * 2) / r.width, m = 24 * k;
          while (game.enemies.length < 8) game.spawnEnemy(game.enemies[0] ? game.enemies[0].type || 'basic' : 'basic', game.waveMult || 1);
          const P = [[-r.halfW + m, 0], [r.halfW - m, 0], [-r.halfW + m, -r.halfH * 0.45], [r.halfW - m, r.halfH * 0.35], [0, -r.halfH + m * 4], [0, r.halfH - m * 5], [-r.halfW + m * 2, -r.halfH + m * 5], [r.halfW - m * 2, r.halfH - m * 7]];
          game.enemies.slice(0, 8).forEach((e, i) => { e.x = t.x + P[i][0]; e.y = t.y + P[i][1]; e.speed = 0; e.hp = e.maxHp = 1e9; });
          game.spawnQueue = []; game.projectiles.length = 0; return { halfW: r.halfW, halfH: r.halfH, k, n: Math.min(8, game.enemies.length) }; }""")
        def clear(): pg.evaluate("() => { const fx = LST.fxDirector; fx.pools.world.clear(); fx.pools.screen.clear(); fx.camera.clear(); fx.player && fx.player.clear(); fx.arcs.length = 0; game.texts.length = 0; game.flash = 0; game.vignette = 0; game.lowHpActive = false; game.finale = null; game.projectiles.length = 0; }")
        def shot(name, label, info):
            f = "pr10b-%s-%s-390x844.png" % (name, tag); pg.screenshot(path=OUT + f); shots.append([name, label, f, pg.evaluate(info)])
        W = world
        clear(); pg.evaluate("() => { game.lowHpActive = true; game.vignette = 1; }"); pg.evaluate(STEP, 1)
        shot("lowhp-%s-1-hit" % W, "%s: low-HP hit (vignette 1), enemies near every edge" % W.title(), "() => ({ vignette: game.vignette })")
        clear(); pg.evaluate("() => { game.lowHpActive = true; game.vignette = 0; game.renderer.time = Math.PI / 12 - 1 / 60; }"); pg.evaluate(STEP, 1)
        shot("lowhp-%s-2-peak" % W, "%s: steady pulse at its peak (0.32)" % W.title(), "() => ({ time: game.renderer.time, a: 0.22 + 0.1 * Math.sin(game.renderer.time * 6) })")
        clear(); pg.evaluate("() => { game.lowHpActive = true; game.vignette = 0; game.renderer.time = Math.PI / 6 - 1 / 60; }"); pg.evaluate(STEP, 1)
        shot("lowhp-%s-3-mid" % W, "%s: steady pulse mid-swing (0.22)" % W.title(), "() => ({ time: game.renderer.time, a: 0.22 + 0.1 * Math.sin(game.renderer.time * 6) })")
        b.close()
    res = {"tag": tag, "world": world_id, "placed": placed, "shots": shots, "errors": errs}
    json.dump(res, open(OUT + "pr10b-shots-%s.json" % tag, "w"), indent=1)
    return res

def main(argv=None):
    a = parse_args(argv)
    res = shoot(a.base or "http://%s:%d/" % (a.host, a.port), a.tag, a.out, a.world)
    print(a.tag, res["world"], res["placed"], len(res["shots"]), res["errors"][:5])
    return 1 if res["errors"] else 0

if __name__ == "__main__":
    sys.exit(main())
