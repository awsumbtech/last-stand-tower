# Generates the PWA icons in icons/. Run: python3 tools/make_icons.py (needs Pillow).
import math
from PIL import Image, ImageDraw, ImageFilter

BG = (7, 7, 15, 255)
CYAN = (0, 240, 255, 255)
PINK = (255, 43, 214, 255)
YELLOW = (255, 217, 61, 255)

def hexagon(cx, cy, r, rot=-math.pi / 2):
    return [(cx + r * math.cos(rot + i * math.pi / 3), cy + r * math.sin(rot + i * math.pi / 3)) for i in range(6)]

def draw_art(size, content_scale):
    S = size * 4  # supersample
    s = S * content_scale  # size of the artwork box
    c = S / 2
    layer = Image.new("RGBA", (S, S), (0, 0, 0, 0))
    d = ImageDraw.Draw(layer)
    # range ring
    rr = s * 0.44
    d.ellipse([c - rr, c - rr, c + rr, c + rr], outline=(0, 240, 255, 110), width=max(2, int(s * 0.012)))
    # tower hexagon
    hr = s * 0.2
    d.polygon(hexagon(c, c, hr), fill=(0, 240, 255, 40), outline=CYAN, width=int(s * 0.035))
    # barrel toward upper-right
    a = -math.pi / 4
    bw = s * 0.06
    L = hr * 1.45
    p1 = (c, c); p2 = (c + L * math.cos(a), c + L * math.sin(a))
    d.line([p1, p2], fill=CYAN, width=int(bw))
    core = hr * 0.45
    d.ellipse([c - core, c - core, c + core, c + core], fill=CYAN)
    # shot + enemies
    sx, sy = c + s * 0.27, c - s * 0.27
    d.ellipse([sx - s * 0.02, sy - s * 0.02, sx + s * 0.02, sy + s * 0.02], fill=(200, 251, 255, 255))
    for (ex, ey, col, er) in [(0.37, -0.37, PINK, 0.045), (-0.36, 0.3, YELLOW, 0.035), (0.33, 0.38, PINK, 0.04)]:
        x, y, r = c + s * ex, c + s * ey, s * er
        d.ellipse([x - r, y - r, x + r, y + r], outline=col, width=int(s * 0.016))
    glow = layer.filter(ImageFilter.GaussianBlur(S * 0.02))
    out = Image.new("RGBA", (S, S), BG)
    out.alpha_composite(glow)
    out.alpha_composite(glow)
    out.alpha_composite(layer)
    return out.resize((size, size), Image.LANCZOS).convert("RGB")

import os
D = os.path.join(os.path.dirname(os.path.abspath(__file__)), "..", "icons") + "/"
draw_art(192, 1.0).save(D + "icon-192.png", optimize=True)
draw_art(512, 1.0).save(D + "icon-512.png", optimize=True)
draw_art(512, 0.72).save(D + "icon-maskable-512.png", optimize=True)  # art inside the 80% safe zone
draw_art(180, 0.9).save(D + "apple-touch-icon.png", optimize=True)
draw_art(32, 1.0).save(D + "favicon-32.png", optimize=True)
