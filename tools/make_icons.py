# Generates the PWA icons in icons/ (cartoon style). Run: python3 tools/make_icons.py (needs Pillow).
import math
import os
from PIL import Image, ImageDraw

INK = (43, 29, 58, 255)
GRASS = (134, 204, 95, 255)
GRASS2 = (143, 212, 104, 255)
STONE = (230, 236, 248, 255)
CREN = (185, 195, 220, 255)
CANNON = (91, 107, 140, 255)
CANNON2 = (70, 83, 111, 255)
PINK = (255, 111, 181, 255)
YELLOW = (255, 210, 63, 255)
DIRT = (227, 200, 143, 255)
DIRT_EDGE = (185, 154, 94, 255)

OUT = os.path.join(os.path.dirname(os.path.abspath(__file__)), "..", "icons")


def rot(cx, cy, x, y, a):
    ca, sa = math.cos(a), math.sin(a)
    return (cx + x * ca - y * sa, cy + x * sa + y * ca)


def rounded_poly(d, pts, fill, outline, width):
    d.polygon(pts, fill=fill, outline=outline, width=width)


def draw_icon(size, k):
    """k = how much of the canvas the artwork fills (smaller for maskable)."""
    S = size * 4
    img = Image.new("RGBA", (S, S), GRASS)
    d = ImageDraw.Draw(img)
    # mowed checker
    t = S / 4
    for y in range(4):
        for x in range(4):
            if (x + y) % 2:
                d.rectangle([x * t, y * t, (x + 1) * t, (y + 1) * t], fill=GRASS2)
    c = S / 2
    u = S * k / 100.0  # artwork unit
    w = max(2, int(u * 1.5))  # outline width

    # dirt patch + shadow
    d.ellipse([c - 36 * u, c - 30 * u, c + 36 * u, c + 38 * u], fill=DIRT, outline=DIRT_EDGE, width=int(u * 1.6))
    d.ellipse([c - 26 * u, c - 20 * u, c + 30 * u, c + 31 * u], fill=(185, 154, 94, 255))

    # cannon behind the body, pointing up-right
    a = -math.pi / 4
    L, T = 40 * u, 9 * u
    barrel = [rot(c, c, 0, -T, a), rot(c, c, L, -T, a), rot(c, c, L, T, a), rot(c, c, 0, T, a)]
    rounded_poly(d, barrel, CANNON, INK, w)
    muzzle = [rot(c, c, L - 7 * u, -T - 2.5 * u, a), rot(c, c, L + 1 * u, -T - 2.5 * u, a),
              rot(c, c, L + 1 * u, T + 2.5 * u, a), rot(c, c, L - 7 * u, T + 2.5 * u, a)]
    rounded_poly(d, muzzle, CANNON2, INK, w)

    R = 25 * u
    # crenellations
    for i in range(8):
        ang = i / 8 * math.pi * 2 + math.pi / 8
        pts = [rot(c, c, R - 5 * u, -6 * u, ang), rot(c, c, R + 6 * u, -6 * u, ang),
               rot(c, c, R + 6 * u, 6 * u, ang), rot(c, c, R - 5 * u, 6 * u, ang)]
        rounded_poly(d, pts, CREN, INK, w)
    # body
    d.ellipse([c - R, c - R, c + R, c + R], fill=STONE, outline=INK, width=int(w * 1.25))
    d.ellipse([c - R * 0.58, c - R * 0.68, c - R * 0.14, c - R * 0.24], fill=(255, 255, 255, 230))

    # face
    ex, ey, er = R * 0.34, -R * 0.05, R * 0.21
    for side in (-1, 1):
        x = c + side * ex
        y = c + ey
        d.ellipse([x - er, y - er * 1.15, x + er, y + er * 1.15], fill=(255, 255, 255, 255), outline=INK, width=int(w * 0.8))
        px, py = x + er * 0.27, y - er * 0.32  # looking up-right at the cannon target
        d.ellipse([px - er * 0.55, py - er * 0.55, px + er * 0.55, py + er * 0.55], fill=INK)
        d.ellipse([px - er * 0.38, py - er * 0.42, px - er * 0.02, py - er * 0.06], fill=(255, 255, 255, 255))
        cx2, cy2 = x + side * er * 0.7, y + er * 1.45
        d.ellipse([cx2 - er * 0.55, cy2 - er * 0.32, cx2 + er * 0.55, cy2 + er * 0.32], fill=(255, 111, 181, 150))
    d.arc([c - R * 0.22, c + R * 0.12, c + R * 0.22, c + R * 0.5], 20, 160, fill=INK, width=int(w * 0.9))

    # little enemy + coin for flavor
    bx, by, br = c - 33 * u, c + 31 * u, 7.5 * u
    d.ellipse([bx - br, by - br, bx + br, by + br], fill=PINK, outline=INK, width=int(w * 0.8))
    for side in (-1, 1):
        x = bx + side * br * 0.38
        d.ellipse([x - br * 0.27, by - br * 0.6, x + br * 0.27, by - br * 0.06], fill=(255, 255, 255, 255), outline=INK, width=max(1, int(w * 0.4)))
        d.ellipse([x + br * 0.02, by - br * 0.42, x + br * 0.22, by - br * 0.2], fill=INK)
    qx, qy, qr = c + 34 * u, c + 30 * u, 6.5 * u
    d.ellipse([qx - qr, qy - qr, qx + qr, qy + qr], fill=YELLOW, outline=INK, width=int(w * 0.8))
    d.ellipse([qx - qr * 0.45, qy - qr * 0.45, qx + qr * 0.45, qy + qr * 0.45], outline=(232, 164, 23, 255), width=max(1, int(w * 0.5)))
    return img.resize((size, size), Image.LANCZOS).convert("RGB")


def save(img, name):
    img.save(os.path.join(OUT, name), optimize=True)


save(draw_icon(192, 1.0), "icon-192.png")
save(draw_icon(512, 1.0), "icon-512.png")
save(draw_icon(512, 0.74), "icon-maskable-512.png")  # artwork inside the 80% safe zone
save(draw_icon(180, 0.95), "apple-touch-icon.png")
save(draw_icon(32, 1.15), "favicon-32.png")
