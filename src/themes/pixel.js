// Pixel art: the whole scene is drawn on a low-res canvas and scaled up with
// no smoothing. Sprites are tiny character grids turned into canvases at startup.
(function () {
  // ---------- Sprite data ----------
  // Each character maps to a palette color; "." is transparent.
  const SPRITES = {
    basic: {
      palette: { k: "#3a0a35", p: "#ff4fd8", P: "#ffb3f0", w: "#ffffff", b: "#3a0a35" },
      frames: [[
        "...kkkk...",
        "..kPPPpk..",
        ".kPpppppk.",
        "kpwbppwbpk",
        "kpwbppwbpk",
        "kppppppppk",
        "kppppppppk",
        ".kkkkkkkk.",
      ], [
        "..........",
        "...kkkk...",
        "..kPPPpk..",
        ".kPwbpwbk.",
        "kppwbpwbpk",
        "kppppppppk",
        "kppppppppk",
        "kkkkkkkkkk",
      ]],
    },
    fast: {
      palette: { k: "#3a2a00", y: "#ffd93d", Y: "#fff3b0", b: "#3a2a00" },
      frames: [[
        "k.........k",
        "kk.......kk",
        "kYk.kkk.kYk",
        "kyykYyykyyk",
        ".kyybybyyk.",
        "..kyyyyyk..",
        "...kkkkk...",
      ], [
        "...........",
        "....kkk....",
        "...kYyyk...",
        ".kkybybykk.",
        "kYyyyyyyyyk",
        "kyk.kkk.kyk",
        "kk.......kk",
      ]],
    },
    tank: {
      palette: { k: "#3a1800", O: "#ffc48a", o: "#ff8a3d", D: "#c25a12", w: "#ffffff", b: "#3a1800" },
      frames: [[
        "kkkkkkkkkkkk",
        "kOOOOOOOOOok",
        "kOooooooooDk",
        "kOwbooooowbk",
        "kOooooooooDk",
        "kOokkkkkkoDk",
        "kOooooooooDk",
        "kODDDDDDDDDk",
        "kkkkkkkkkkkk",
        ".kk......kk.",
      ], [
        "kkkkkkkkkkkk",
        "kOOOOOOOOOok",
        "kOooooooooDk",
        "kOwbooooowbk",
        "kOooooooooDk",
        "kOokkkkkkoDk",
        "kOooooooooDk",
        "kODDDDDDDDDk",
        "kkkkkkkkkkkk",
        "..kk....kk..",
      ]],
    },
    boss: {
      palette: { k: "#2a0008", R: "#ff4d6d", r: "#c2183a", w: "#ffffff", b: "#2a0008" },
      frames: [[
        "k..............k",
        "kk............kk",
        ".kRk.kkkkkk.kRk.",
        "..kRkRRRRRRkRk..",
        "...kRRRRRRRRk...",
        "..kRRRRRRRRRRk..",
        ".kRRwwRRRRwwRRk.",
        ".kRRwbRRRRbwRRk.",
        "kRRRRRRRRRRRRRRk",
        "kRRRkkkkkkkkRRRk",
        "kRRRkwkwwkwkRRRk",
        "kRRRRkkkkkkRRRRk",
        ".krRRRRRRRRRRrk.",
        "..kkkkkkkkkkkk..",
      ]],
    },
  };

  // 3x5 pixel font for numbers and the wave banner.
  const FONT = {
    "0": ["111", "101", "101", "101", "111"], "1": ["010", "110", "010", "010", "111"],
    "2": ["111", "001", "111", "100", "111"], "3": ["111", "001", "111", "001", "111"],
    "4": ["101", "101", "111", "001", "001"], "5": ["111", "100", "111", "001", "111"],
    "6": ["111", "100", "111", "101", "111"], "7": ["111", "001", "010", "010", "010"],
    "8": ["111", "101", "111", "101", "111"], "9": ["111", "101", "111", "001", "111"],
    "+": ["000", "010", "111", "010", "000"], "-": ["000", "000", "111", "000", "000"],
    W: ["101", "101", "101", "111", "101"], A: ["010", "101", "111", "101", "101"],
    V: ["101", "101", "101", "101", "010"], E: ["111", "100", "110", "100", "111"],
    B: ["110", "101", "110", "101", "110"], O: ["111", "101", "101", "101", "111"],
    S: ["111", "100", "111", "001", "111"],
    " ": ["000", "000", "000", "000", "000"],
  };

  function makeCanvas(w, h) {
    const c = document.createElement("canvas");
    c.width = w;
    c.height = h;
    return c;
  }

  // Turn a character grid into a canvas; `override` paints every pixel one color (hit flash).
  function gridToCanvas(rows, palette, override) {
    const c = makeCanvas(rows[0].length, rows.length);
    const ctx = c.getContext("2d");
    rows.forEach((row, y) => {
      if (row.length !== rows[0].length) console.warn("pixel sprite row length mismatch", row);
      for (let x = 0; x < row.length; x++) {
        const ch = row[x];
        if (ch === "." || !palette[ch]) continue;
        ctx.fillStyle = override || palette[ch];
        ctx.fillRect(x, y, 1, 1);
      }
    });
    return c;
  }

  // The tower base is round, so it's generated rather than hand drawn.
  function makeTowerSprite(radius, flash) {
    const size = radius * 2 + 1;
    const c = makeCanvas(size, size);
    const ctx = c.getContext("2d");
    for (let y = 0; y < size; y++) {
      for (let x = 0; x < size; x++) {
        const dx = x - radius, dy = y - radius;
        const d = Math.hypot(dx, dy);
        let col = null;
        if (d > radius + 0.5) continue;
        else if (d > radius - 0.7) col = "#0b0d1c";
        else if (d > radius - 3.2) {
          // Stone ring with crenels, lit from the top-left.
          const a = Math.atan2(dy, dx) + Math.PI;
          const crenel = Math.floor(a / (Math.PI / 6)) % 2 === 0 && d > radius - 1.8;
          const lit = dx + dy < -2 ? "#9aa3cc" : dx + dy > 2 ? "#454c70" : "#6b74a0";
          col = crenel ? "#2b3150" : lit;
        } else if (d > radius - 4.2) col = "#0b0d1c";
        else col = (x + y) % 4 === 0 ? "#252a48" : "#2b3150";
        ctx.fillStyle = flash && col !== "#0b0d1c" ? "#ff4d6d" : col;
        ctx.fillRect(x, y, 1, 1);
      }
    }
    return c;
  }

  function makeGroundTile(seed) {
    const c = makeCanvas(16, 16);
    const ctx = c.getContext("2d");
    let s = seed * 9301 + 49297;
    const rnd = () => ((s = (s * 9301 + 49297) % 233280) / 233280);
    ctx.fillStyle = "#141a33";
    ctx.fillRect(0, 0, 16, 16);
    for (let i = 0; i < 256; i++) {
      const v = rnd();
      if (v < 0.1) { ctx.fillStyle = "#0f1428"; ctx.fillRect(i % 16, i >> 4, 1, 1); }
      else if (v < 0.22) { ctx.fillStyle = "#19203f"; ctx.fillRect(i % 16, i >> 4, 1, 1); }
    }
    if (seed % 3 === 0) { // a little sparkle
      ctx.fillStyle = "#26305c";
      const x = 3 + (seed * 5) % 10, y = 3 + (seed * 7) % 10;
      ctx.fillRect(x - 1, y, 3, 1);
      ctx.fillRect(x, y - 1, 1, 3);
    }
    return c;
  }

  const art = { enemies: {}, flash: {} };

  // Snap a world coordinate to the art-pixel grid.
  const snap = (v, px) => Math.round(v / px) * px;

  function drawSprite(ctx, spr, x, y, px, scale = 1) {
    const w = spr.width * px * scale, h = spr.height * px * scale;
    ctx.drawImage(spr, snap(x - w / 2, px), snap(y - h / 2, px), w, h);
  }

  function drawText(ctx, str, x, y, color, px, size = 1, outline = "#0b0d1c") {
    const g = px * size; // one font pixel
    const width = str.length * 4 * g - g;
    const x0 = snap(x - width / 2, px), y0 = snap(y - 2.5 * g, px);
    const pass = (ox, oy, col) => {
      ctx.fillStyle = col;
      for (let i = 0; i < str.length; i++) {
        const glyph = FONT[str[i]] || FONT[" "];
        for (let gy = 0; gy < 5; gy++) for (let gx = 0; gx < 3; gx++) {
          if (glyph[gy][gx] === "1") ctx.fillRect(x0 + (i * 4 + gx) * g + ox, y0 + gy * g + oy, g, g);
        }
      }
    };
    if (outline) for (const [ox, oy] of [[-px, 0], [px, 0], [0, -px], [0, px]]) pass(ox, oy, outline);
    pass(0, 0, color);
  }

  LST.themes.pixel = {
    id: "pixel",
    name: "Pixel",
    label: "Pixel art: chunky low-res sprites, scaled up crisp",

    // CSS px per art pixel. About 3.5 world units per art pixel at any screen size.
    pixelSize: (scale) => Math.max(2, Math.round(3.5 * scale)),

    init() {
      for (const [type, def] of Object.entries(SPRITES)) {
        art.enemies[type] = def.frames.map((f) => gridToCanvas(f, def.palette));
        art.flash[type] = gridToCanvas(def.frames[0], def.palette, "#ffffff");
      }
      art.tower = makeTowerSprite(10, false);
      art.towerHit = makeTowerSprite(10, true);
      art.tiles = [0, 1, 2, 3, 4, 5].map(makeGroundTile);
      art.bg = null;
    },

    background(ctx, r) {
      const lw = r.low.width, lh = r.low.height;
      const key = lw + "x" + lh;
      if (!art.bg || art.bgKey !== key) {
        // Pre-render the tiled ground once per screen size.
        art.bg = makeCanvas(lw, lh);
        art.bgKey = key;
        const b = art.bg.getContext("2d");
        const cx = Math.round(lw / 2), cy = Math.round(lh / 2);
        for (let ty = Math.floor(-cy / 16) - 1; ty * 16 < lh - cy; ty++) {
          for (let tx = Math.floor(-cx / 16) - 1; tx * 16 < lw - cx; tx++) {
            const h = Math.abs((tx * 73856093) ^ (ty * 19349663)) % art.tiles.length;
            b.drawImage(art.tiles[h], cx + tx * 16, cy + ty * 16);
          }
        }
        art.bgOrigin = [cx, cy];
      }
      const px = r.px;
      ctx.drawImage(art.bg, -art.bgOrigin[0] * px, -art.bgOrigin[1] * px, lw * px, lh * px);
    },

    range(ctx, tower, r) {
      const px = r.px;
      const n = Math.floor((Math.PI * 2 * tower.range) / (px * 5));
      ctx.fillStyle = "rgba(0, 240, 255, 0.55)";
      for (let k = 0; k < n; k++) {
        const a = (k / n) * Math.PI * 2 + r.time * 0.15;
        ctx.fillRect(snap(tower.x + Math.cos(a) * tower.range, px), snap(tower.y + Math.sin(a) * tower.range, px), px, px);
      }
    },

    tower(ctx, t, r) {
      const px = r.px;
      drawSprite(ctx, t.hitFlash > 0 ? art.towerHit : art.tower, t.x, t.y, px, 1);
      // Barrel: a 2-pixel-thick line of art pixels, pulled back on recoil.
      const len = 13 - Math.round(t.recoil * 2);
      const ca = Math.cos(t.angle), sa = Math.sin(t.angle);
      for (let i = 0; i <= len; i++) {
        const x = snap(t.x + ca * i * px, px), y = snap(t.y + sa * i * px, px);
        ctx.fillStyle = "#0b0d1c";
        ctx.fillRect(x - px * 1.5, y - px * 1.5, px * 3, px * 3);
      }
      for (let i = 0; i <= len; i++) {
        const x = snap(t.x + ca * i * px, px), y = snap(t.y + sa * i * px, px);
        ctx.fillStyle = i >= len - 1 ? "#00f0ff" : "#c9d1f0";
        ctx.fillRect(x - px, y - px, px * 2, px * 2);
      }
      // Glowing crystal in the middle, blinking when it fires.
      ctx.fillStyle = t.recoil > 0.5 ? "#ffffff" : "#00f0ff";
      ctx.fillRect(snap(t.x, px) - px * 2, snap(t.y, px) - px * 2, px * 4, px * 4);
      ctx.fillStyle = "#ffffff";
      ctx.fillRect(snap(t.x, px) - px, snap(t.y, px) - px, px, px);
    },

    enemy(ctx, e, r) {
      const px = r.px;
      // Retro spawn-in: blink for the first moment.
      if (e.age < 0.4 && Math.floor(e.age * 12) % 2 === 1) return;
      const frames = art.enemies[e.type];
      const rate = e.type === "fast" ? 10 : e.type === "basic" ? 5 : 3;
      let spr = frames[Math.floor(e.age * rate) % frames.length];
      if (e.hitFlash > 0) spr = art.flash[e.type];
      const scale = Math.max(1, Math.round((e.radius * 2) / (spr.width * px)));
      drawSprite(ctx, spr, e.x, e.y, px, scale);

      if (e.hp < e.maxHp) {
        const w = Math.max(6, Math.round(spr.width * scale * 0.8));
        const x0 = snap(e.x, px) - Math.floor(w / 2) * px;
        const y0 = snap(e.y - (spr.height * scale * px) / 2, px) - px * 3;
        ctx.fillStyle = "#0b0d1c";
        ctx.fillRect(x0 - px, y0 - px, (w + 2) * px, px * 3);
        ctx.fillStyle = "#39ff8a";
        ctx.fillRect(x0, y0, Math.max(1, Math.round(w * Math.max(0, e.hp / e.maxHp))) * px, px);
      }
    },

    projectile(ctx, p, r) {
      const px = r.px;
      ctx.fillStyle = "#00f0ff";
      ctx.fillRect(snap(p.x - p.vx * 0.02, px) - px / 2, snap(p.y - p.vy * 0.02, px) - px / 2, px, px);
      ctx.fillStyle = "#ffffff";
      ctx.fillRect(snap(p.x, px) - px, snap(p.y, px) - px, px * 2, px * 2);
    },

    particle(ctx, p, r) {
      const px = r.px;
      const s = p.life / p.maxLife > 0.5 && p.size > 3 ? 2 : 1;
      ctx.fillStyle = p.color;
      ctx.fillRect(snap(p.x, px), snap(p.y, px), px * s, px * s);
    },

    text(ctx, t, r) {
      if (t.life / t.maxLife < 0.25 && Math.floor(t.life * 20) % 2) return; // blink out
      drawText(ctx, t.text, t.x, t.y, t.kind === "coin" ? "#ffd93d" : "#ff4d6d", r.px, 1);
    },

    banner(ctx, text, alpha, r) {
      if (alpha < 0.5 && Math.floor(alpha * 10) % 2) return;
      // Screen space here: one art pixel = r.ps CSS px.
      drawText(ctx, text, r.width / 2, r.height * 0.3, "#00f0ff", r.ps, 3);
    },
  };
})();
