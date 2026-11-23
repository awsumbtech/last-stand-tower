#!/usr/bin/env python3
# PR 10b side-by-side compares from two pr10b-shots.py runs: one main-vs-PR image per shot, a
# contact sheet (each pair at 1/3), and zoom crops (the two crops side by side at device pixels).
#   python3 tools/qa/pr10b-compare.py --main /tmp/shots-main --pr /tmp/shots-10b --out docs/qa/pr10b
import argparse, json, os
from PIL import Image, ImageDraw, ImageFont
ap = argparse.ArgumentParser(description="PR 10b main-vs-PR compares, contact sheet and zooms")
ap.add_argument("--main", required=True, help="folder of the main run (pr10b-shots-<tag>.json inside)")
ap.add_argument("--pr", required=True, help="folder of the PR run")
ap.add_argument("--main-tag", default="main"); ap.add_argument("--pr-tag", default="10b")
ap.add_argument("--main-label", default="main fd40843"); ap.add_argument("--pr-label", default="PR 10b")
ap.add_argument("--out", required=True, help="output folder (created if missing)")
ap.add_argument("--font", default="/usr/share/fonts/truetype/dejavu/DejaVuSans.ttf")
A = ap.parse_args()
os.makedirs(A.out, exist_ok=True)
M = json.load(open(os.path.join(A.main, "pr10b-shots-%s.json" % A.main_tag)))
B = json.load(open(os.path.join(A.pr, "pr10b-shots-%s.json" % A.pr_tag)))
F, F2, F3 = (ImageFont.truetype(A.font, s) for s in (22, 17, 14))
names = {}
out = []
for (n, lab, fm, *_), (nb, _, fb, *__) in zip(M["shots"], B["shots"]):
    assert n == nb, (n, nb)
    a, b = Image.open(os.path.join(A.main, fm)).convert("RGB"), Image.open(os.path.join(A.pr, fb)).convert("RGB")
    names[n] = (a, b)
    W, H = a.size; C = Image.new("RGB", (W * 2 + 20, H + 70), "white"); C.paste(a, (0, 70)); C.paste(b, (W + 20, 70))
    d = ImageDraw.Draw(C); d.text((10, 8), A.main_label, fill="black", font=F); d.text((W + 30, 8), A.pr_label, fill="black", font=F)
    d.text((10, 38), lab[:110], fill=(60, 60, 60), font=F2)
    f = os.path.join(A.out, "pr10b-%s-main-vs-10b-390x844.jpg" % n); C.save(f, quality=90); out.append(f)
# contact sheet: each pair at 1/3
tw, th = (780 * 2 + 20) // 3, (1688 + 70) // 3; cols = 3; rows = (len(out) + cols - 1) // cols
S = Image.new("RGB", (cols * (tw + 10), rows * (th + 10)), "white")
for i, f in enumerate(out): S.paste(Image.open(f).resize((tw, th)), ((i % cols) * (tw + 10), (i // cols) * (th + 10)))
S.save(os.path.join(A.out, "pr10b-contact-sheet.jpg"), quality=88)
# zooms: name -> (shot, device-px box x0, y0, x1, y1, scale, caption); the two crops side by side
ZOOMS = {
    "trails-row": ("09-trails-row", (90, 500, 690, 800), 1, "trails 1 fr"),
    "streaks-each-f05": ("07-streaks-each-f05", (0, 100, 780, 900), 0.75, "streaks 5 fr"),
    "streaks-each-f14": ("07-streaks-each-f14", (0, 100, 780, 900), 0.75, "streaks 14 fr"),
    "motes-t4": ("05-motes-t4", (180, 640, 600, 1000), 1, "motes tier 4"),
    "venom-burst": ("04b-streaks-elements", (120, 420, 380, 680), 2, "venom burst 5 fr"),
}
for z, (n, box, k, cap) in ZOOMS.items():
    if n not in names: continue
    a, b = (im.crop(box).resize((round((box[2] - box[0]) * k), round((box[3] - box[1]) * k)), Image.LANCZOS) for im in names[n])
    w, h = a.size; C = Image.new("RGB", (w * 2 + 12, h + 22), "white"); C.paste(a, (0, 22)); C.paste(b, (w + 12, 22))
    d = ImageDraw.Draw(C); d.text((4, 3), "%s  %s" % (A.main_label, cap), fill="black", font=F3); d.text((w + 16, 3), A.pr_label, fill="black", font=F3)
    C.save(os.path.join(A.out, "pr10b-zoom-%s-main-vs-10b.png" % z))
print(len(out), "compares,", len(ZOOMS), "zooms ->", A.out)
