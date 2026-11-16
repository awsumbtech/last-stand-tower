import json, sys
from PIL import Image, ImageDraw, ImageFont
M = json.load(open("/tmp/shots-main/pr10b-shots-main.json")); B = json.load(open("/tmp/shots-10b/pr10b-shots-10b.json"))
F = ImageFont.truetype("/usr/share/fonts/truetype/dejavu/DejaVuSans.ttf", 22)
out = []
for (n, lab, fm, _ , *r), (_, _, fb, *__) in zip(M["shots"], B["shots"]):
    a, b = Image.open("/tmp/shots-main/" + fm).convert("RGB"), Image.open("/tmp/shots-10b/" + fb).convert("RGB")
    W, H = a.size; C = Image.new("RGB", (W * 2 + 20, H + 70), "white"); C.paste(a, (0, 70)); C.paste(b, (W + 20, 70))
    d = ImageDraw.Draw(C); d.text((10, 8), "main fd40843", fill="black", font=F); d.text((W + 30, 8), "PR 10b", fill="black", font=F)
    d.text((10, 38), lab[:110], fill=(60, 60, 60), font=ImageFont.truetype("/usr/share/fonts/truetype/dejavu/DejaVuSans.ttf", 17))
    f = "cmp/pr10b-%s-main-vs-10b-390x844.jpg" % n; C.save(f, quality=90); out.append(f)
# contact sheet: each pair at 1/3
tw, th = (780 * 2 + 20) // 3, (1688 + 70) // 3; cols = 3; rows = (len(out) + cols - 1) // cols
S = Image.new("RGB", (cols * (tw + 10), rows * (th + 10)), "white")
for i, f in enumerate(out): S.paste(Image.open(f).resize((tw, th)), ((i % cols) * (tw + 10), (i // cols) * (th + 10)))
S.save("cmp/pr10b-contact-sheet.jpg", quality=88); print(len(out), S.size)
