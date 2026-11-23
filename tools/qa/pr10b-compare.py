#!/usr/bin/env python3
# PR 10b side-by-side compares from two shot runs (tools/qa/pr10b-shots.py or tools/qa/lowhp-shots.py):
# one main-vs-PR image per shot, a contact sheet (each pair at 1/3), and zoom crops (the two crops side
# by side) for the shots that have one.
#   python3 tools/qa/pr10b-compare.py --main /tmp/shots-main --pr /tmp/shots-10b --out docs/qa/pr10b
import argparse, json, os, sys
from PIL import Image, ImageDraw, ImageFont

# zooms: name -> (shot, device-px box x0, y0, x1, y1, scale, caption)
ZOOMS = {
    "trails-row": ("09-trails-row", (90, 500, 690, 800), 1, "trails 1 fr"),
    "streaks-each-f05": ("07-streaks-each-f05", (0, 100, 780, 900), 0.75, "streaks 5 fr"),
    "streaks-each-f14": ("07-streaks-each-f14", (0, 100, 780, 900), 0.75, "streaks 14 fr"),
    "motes-t4": ("05-motes-t4", (180, 640, 600, 1000), 1, "motes tier 4"),
    "venom-burst": ("04b-streaks-elements", (120, 420, 380, 680), 2, "venom burst 5 fr"),
}

def parse_args(argv=None):
    ap = argparse.ArgumentParser(description="PR 10b main-vs-PR compares, contact sheet and zooms")
    ap.add_argument("--main", required=True, help="folder of the main run (pr10b-shots-<tag>.json inside)")
    ap.add_argument("--pr", required=True, help="folder of the PR run")
    ap.add_argument("--main-tag", default="main"); ap.add_argument("--pr-tag", default="10b")
    ap.add_argument("--main-label", default="main fd40843"); ap.add_argument("--pr-label", default="PR 10b")
    ap.add_argument("--prefix", default="pr10b", help="file name prefix of the outputs")
    ap.add_argument("--out", required=True, help="output folder (created if missing)")
    ap.add_argument("--font", default="/usr/share/fonts/truetype/dejavu/DejaVuSans.ttf")
    return ap.parse_args(argv)

class CompareSheet:
    """Pairs two shot runs (pr10b-shots-<tag>.json in each folder) shot by shot: pairs() writes one
    main-vs-PR image per shot, contact_sheet() each pair at 1/3, zooms() the ZOOMS crops side by side."""

    def __init__(self, a):
        self.a = a
        self.F, self.F2, self.F3 = (ImageFont.truetype(a.font, s) for s in (22, 17, 14))
        self.images, self.out, self.zoom_paths = {}, [], []

    def load(self, folder, tag):
        return json.load(open(os.path.join(folder, "pr10b-shots-%s.json" % tag)))

    def pairs(self):
        a = self.a; M, B = self.load(a.main, a.main_tag), self.load(a.pr, a.pr_tag)
        for (n, lab, fm, *_), (nb, _, fb, *__) in zip(M["shots"], B["shots"]):
            assert n == nb, (n, nb)
            im_a, im_b = Image.open(os.path.join(a.main, fm)).convert("RGB"), Image.open(os.path.join(a.pr, fb)).convert("RGB")
            self.images[n] = (im_a, im_b)
            W, H = im_a.size; C = Image.new("RGB", (W * 2 + 20, H + 70), "white"); C.paste(im_a, (0, 70)); C.paste(im_b, (W + 20, 70))
            d = ImageDraw.Draw(C); d.text((10, 8), a.main_label, fill="black", font=self.F); d.text((W + 30, 8), a.pr_label, fill="black", font=self.F)
            d.text((10, 38), lab[:110], fill=(60, 60, 60), font=self.F2)
            f = os.path.join(a.out, "%s-%s-main-vs-10b-390x844.jpg" % (a.prefix, n)); C.save(f, quality=90); self.out.append(f)
        return self.out

    def contact_sheet(self):
        """Each pair at 1/3, 3 per row."""
        tw, th = (780 * 2 + 20) // 3, (1688 + 70) // 3; cols = 3; rows = (len(self.out) + cols - 1) // cols
        S = Image.new("RGB", (cols * (tw + 10), rows * (th + 10)), "white")
        for i, f in enumerate(self.out): S.paste(Image.open(f).resize((tw, th)), ((i % cols) * (tw + 10), (i // cols) * (th + 10)))
        f = os.path.join(self.a.out, "%s-contact-sheet.jpg" % self.a.prefix); S.save(f, quality=88)
        return f

    def zooms(self):
        a = self.a
        for z, (n, box, k, cap) in ZOOMS.items():
            if n not in self.images: continue
            za, zb = (im.crop(box).resize((round((box[2] - box[0]) * k), round((box[3] - box[1]) * k)), Image.LANCZOS) for im in self.images[n])
            w, h = za.size; C = Image.new("RGB", (w * 2 + 12, h + 22), "white"); C.paste(za, (0, 22)); C.paste(zb, (w + 12, 22))
            d = ImageDraw.Draw(C); d.text((4, 3), "%s  %s" % (a.main_label, cap), fill="black", font=self.F3); d.text((w + 16, 3), a.pr_label, fill="black", font=self.F3)
            f = os.path.join(a.out, "%s-zoom-%s-main-vs-10b.png" % (a.prefix, z)); C.save(f); self.zoom_paths.append(f)
        return self.zoom_paths

    def run(self):
        """Writes the compares, contact sheet and zooms into a.out; returns (compare paths, zoom paths)."""
        os.makedirs(self.a.out, exist_ok=True)
        self.pairs(); self.contact_sheet(); self.zooms()
        return self.out, self.zoom_paths

def compare(a):
    return CompareSheet(a).run()

def main(argv=None):
    a = parse_args(argv)
    out, zooms = compare(a)
    print(len(out), "compares,", len(zooms), "zooms ->", a.out)
    return 0

if __name__ == "__main__":
    sys.exit(main())
