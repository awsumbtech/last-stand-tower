#!/usr/bin/env python3
"""Shop card layout test (Playwright, Chromium).

Renders every card (normal cards and traps, front and flipped back) three at a time in the
card-pick screen at 390x844, 360x740 and 768x1024 and checks:
  * the three offered cards are the same height (a long card never stretches its row);
  * no card text, take button or back-face text overflows its card;
  * the Reroll / Repair buttons fit their label and price (Repair at 289/370 HP);
  * a flippable card's take button has a >= 44 px tap area;
  * tapping a flippable card flips it and never takes it; its take button takes it.

Usage: python3 tools/card-layout-test.py [http://127.0.0.1:8000/index.html]
Serve the repo first, e.g.  python3 -m http.server 8000
Set CHROME=/path/to/chromium to use a specific browser binary.
Exit code 0 = pass, 1 = failures (listed).
"""
import os, sys
from playwright.sync_api import sync_playwright

BASE = sys.argv[1] if len(sys.argv) > 1 else "http://127.0.0.1:8000/index.html"
VIEWPORTS = [(390, 844), (360, 740), (768, 1024)]

CHECK = r"""async ({ flipAll }) => {
  const g = window.game, fails = [];
  const ids = LST.CARDS.concat(LST.TRAPS || []).map((c) => c.id).filter((id, i, a) => a.indexOf(id) === i);
  let backs = 0;
  for (const id of ids) if (LST.cardById(id).trap) LST.meta.discoverTrap(id);
  g.coins = 401; g.wave = 19; g.tower.maxHp = 370; g.tower.hp = 289;
  const inside = (r, box, pad = 0.5) => r.left >= box.left - pad && r.right <= box.right + pad && r.top >= box.top - pad && r.bottom <= box.bottom + pad;
  for (let i = 0; i < ids.length; i += 3) {
    const group = [ids[i], ids[(i + 1) % ids.length], ids[(i + 2) % ids.length]];
    g.shop.picked = true;
    g.shop.cards = group.map((id) => ({ card: LST.cardById(id), taken: false }));
    g.ui.renderShop();
    const cards = [...document.querySelectorAll("#card-row [data-slot]")];
    backs += cards.filter((c) => LST.CardFlip.canFlip(c)).length;
    if (flipAll) cards.forEach((c) => LST.CardFlip.toggle(c, { instant: true }));
    const hs = cards.map((c) => c.getBoundingClientRect().height);
    if (Math.max(...hs) - Math.min(...hs) > 1) fails.push(`unequal heights ${group.join(",")}: ${hs.map(Math.round).join("/")}`);
    for (const c of cards) {
      const box = c.getBoundingClientRect(), name = c.querySelector(".name").textContent;
      const flipped = c.classList.contains("flipped");
      const parts = flipped ? c.querySelectorAll(".card-back > *") : c.querySelectorAll(":scope > :not(.ribbon):not(.card-back)");
      for (const el of parts) {
        const r = el.getBoundingClientRect();
        if (!r.width) continue;
        if (!inside(r, box)) fails.push(`${name}${flipped ? " (back)" : ""}: .${el.className} outside card`);
        if (el.scrollWidth > el.clientWidth + 1 && getComputedStyle(el).overflow !== "visible") fails.push(`${name}: .${el.className} clipped`);
      }
      const back = c.querySelector(".card-back");
      if (back && flipped && back.scrollHeight > back.clientHeight + 1) fails.push(`${name} (back): text taller than card (${back.scrollHeight}>${back.clientHeight})`);
      const take = c.querySelector("button.tag");
      if (take && !flipped) {
        const r = take.getBoundingClientRect(), cx = r.left + r.width / 2;
        for (const dy of [-21, 21]) {
          const hit = document.elementFromPoint(cx, r.top + r.height / 2 + dy);
          if (!hit || !hit.closest("button.tag")) fails.push(`${name}: take button tap area < 44px (dy ${dy})`);
        }
      }
    }
  }
  for (const b of document.querySelectorAll(".shop-actions .btn:not(.hidden)")) {
    const box = b.getBoundingClientRect();
    for (const el of b.children) {
      const r = el.getBoundingClientRect();
      if (r.width && !inside(r, box)) fails.push(`#${b.id}: ${el.className || el.tagName} outside button`);
    }
    if (b.scrollWidth > b.clientWidth + 1) fails.push(`#${b.id}: content wider than button`);
  }
  if (!backs) fails.push("no flippable cards were rendered");
  return fails;
}"""

CLICKS = r"""async () => {
  const g = window.game, fails = [];
  g.shop.picked = true; g.coins = 401; LST.meta.discoverTrap("thorns");
  g.shop.cards = [{ card: LST.cardById("damage"), taken: false }, { card: LST.cardById("maxHp"), taken: false }, { card: LST.cardById("thorns"), taken: false }];
  g.ui.renderShop();
  const card = () => document.querySelector('#card-row [data-slot="2"]');
  if (!card().classList.contains("has-back")) fails.push("thorns not flippable: " + LST.meta.knowsTrap("thorns") + " " + JSON.stringify(LST.meta.state.codex.traps));
  card().querySelector(".desc").click();
  await new Promise((r) => setTimeout(r, 400));
  if (g.shop.cards[2].taken || g.coins !== 401) fails.push("tapping a flippable card took it");
  if (!card().classList.contains("flipped")) fails.push("tapping a flippable card did not flip it");
  if (!card() || !card().querySelector(".card-back")) return fails.concat(["no back face: " + (card() ? card().outerHTML.slice(0, 300) : "no card")]);
  card().querySelector(".card-back").click();
  await new Promise((r) => setTimeout(r, 400));
  if (card().classList.contains("flipped") || g.shop.cards[2].taken) fails.push("tapping the back did not flip back (or took it)");
  card().querySelector("button.tag").click();
  if (!g.shop.cards[2].taken) fails.push("take button did not take the card");
  return fails;
}"""

def main():
    fails = []
    with sync_playwright() as pw:
        b = pw.chromium.launch(executable_path=os.environ.get("CHROME") or None)
        for w, h in VIEWPORTS:
            ctx = b.new_context(viewport={"width": w, "height": h}, device_scale_factor=2, service_workers="block")
            p = ctx.new_page()
            p.on("pageerror", lambda e: fails.append(f"{w}: page error {e}"))
            p.goto(BASE)
            p.wait_for_function("window.game && window.LST")
            p.evaluate("""() => { const g = game; g.newGame(); if (g.state !== 'playing') { g.wave = 0; g.startNextWave(); }
              g.enemies.length = 0; g.spawnQueue = []; g.endWave(); g.celebrateTimer = 0; g.gotchaQueue = []; g.finishCelebration(); g.ui.show('upgrade'); }""")
            p.wait_for_timeout(700)  # let deal-in animations settle
            for flip in (False, True):
                fails += [f"{w}x{h}: {f}" for f in p.evaluate(CHECK, {"flipAll": flip})]
            fails += [f"{w}x{h}: {f}" for f in p.evaluate(CLICKS)]
            ctx.close()
        b.close()
    for f in fails: print("FAIL", f)
    print("card-layout-test:", "PASS" if not fails else f"{len(fails)} failure(s)")
    sys.exit(1 if fails else 0)

if __name__ == "__main__":
    main()
