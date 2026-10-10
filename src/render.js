// Renderer: owns the canvas, sizing, the world transform and screen shake.
// What things actually LOOK like is up to the active theme (src/themes/*.js).
//
// A theme is a plain object registered in LST.themes:
//   id, name, label            - for menus
//   pixelSize(scale)           - optional; return CSS px per "art pixel" to render
//                                at low resolution and upscale crisply (pixel art)
//   init(renderer)             - optional one-time setup (build sprites, etc.)
//   background(ctx, r, scene)  - world space, fill the visible area
//   range(ctx, tower, r)       - world space
//   tower / enemy / projectile / particle / text (ctx, obj, r) - world space
//   banner(ctx, text, alpha, r)- screen space (CSS px), e.g. "WAVE 3"
// `r` is the renderer: r.time, r.halfW, r.halfH, r.px (world units per art pixel).

LST.themes = LST.themes || {};

LST.Renderer = class Renderer {
  constructor(canvas, theme) {
    this.canvas = canvas;
    this.ctx = canvas.getContext("2d");
    this.dpr = 1;
    this.scale = 1; // world units -> CSS pixels
    this.width = 0; // CSS pixels
    this.height = 0;
    this.time = 0;
    this.low = null; // offscreen canvas for pixel-art themes
    this.setTheme(theme || LST.themes.neon);
  }

  setTheme(theme) {
    this.theme = theme;
    if (theme.init && !theme._ready) {
      theme.init(this);
      theme._ready = true;
    }
  }

  // Sizes to the canvas's CSS box (full screen in the game, a panel in styles.html).
  resize() {
    this.dpr = Math.min(window.devicePixelRatio || 1, 2);
    this.width = this.canvas.clientWidth || window.innerWidth;
    this.height = this.canvas.clientHeight || window.innerHeight;
    this.canvas.width = Math.round(this.width * this.dpr);
    this.canvas.height = Math.round(this.height * this.dpr);
    const portrait = this.height > this.width * 1.3;
    const world = portrait ? LST.CONFIG.WORLD_SIZE_PORTRAIT : LST.CONFIG.WORLD_SIZE;
    this.scale = Math.min(this.width, this.height) / world;
  }

  // Half the visible area in world units (the tower is at 0,0).
  get halfW() { return this.width / 2 / this.scale; }
  get halfH() { return this.height / 2 / this.scale; }

  draw(scene, dt) {
    this.time += dt;
    const theme = this.theme;
    const ps = theme.pixelSize ? theme.pixelSize(this.scale) : 0;
    this.ps = ps; // CSS px per art pixel (0 = normal full-res drawing)
    let ctx = this.ctx;

    if (ps) {
      // Low-res pass: draw into a small canvas, then blow it up with no smoothing.
      const lw = Math.ceil(this.width / ps);
      const lh = Math.ceil(this.height / ps);
      if (!this.low) this.low = document.createElement("canvas");
      if (this.low.width !== lw || this.low.height !== lh) {
        this.low.width = lw;
        this.low.height = lh;
      }
      ctx = this.low.getContext("2d");
      ctx.imageSmoothingEnabled = false;
      ctx.setTransform(1 / ps, 0, 0, 1 / ps, 0, 0); // draw in CSS px, land on art pixels
      this.px = ps / this.scale;
    } else {
      ctx.setTransform(this.dpr, 0, 0, this.dpr, 0, 0);
      this.px = 1 / this.scale;
    }

    // World transform: origin at the center, plus screen shake.
    const snap = (v) => (ps ? Math.round(v / ps) * ps : v);
    const shake = scene.shake > 0 ? scene.shake * 8 : 0;
    ctx.save();
    ctx.translate(
      snap(this.width / 2 + (Math.random() - 0.5) * shake),
      snap(this.height / 2 + (Math.random() - 0.5) * shake)
    );
    ctx.scale(this.scale, this.scale);

    theme.background(ctx, this, scene);
    theme.range(ctx, scene.tower, this);
    for (const p of scene.particles) theme.particle(ctx, p, this);
    for (const e of scene.enemies) theme.enemy(ctx, e, this);
    for (const p of scene.projectiles) theme.projectile(ctx, p, this);
    theme.tower(ctx, scene.tower, this);
    for (const t of scene.texts) theme.text(ctx, t, this);
    ctx.restore();

    if (scene.state === "playing" && scene.waveIntro > 0) {
      theme.banner(ctx, `WAVE ${scene.wave}`, Math.min(1, scene.waveIntro), this);
    }

    if (ps) {
      const main = this.ctx;
      main.setTransform(1, 0, 0, 1, 0, 0);
      main.imageSmoothingEnabled = false;
      main.drawImage(this.low, 0, 0, this.low.width * ps * this.dpr, this.low.height * ps * this.dpr);
    }
  }
};

// Small drawing helpers shared by themes.
LST.draw = {
  // Regular polygon path centered on the current origin.
  polygon(ctx, sides, r, rot = -Math.PI / 2) {
    ctx.beginPath();
    for (let i = 0; i < sides; i++) {
      const a = rot + (i / sides) * Math.PI * 2;
      const x = Math.cos(a) * r;
      const y = Math.sin(a) * r;
      if (i === 0) ctx.moveTo(x, y); else ctx.lineTo(x, y);
    }
    ctx.closePath();
  },

  roundRect(ctx, x, y, w, h, r) {
    ctx.beginPath();
    ctx.moveTo(x + r, y);
    ctx.arcTo(x + w, y, x + w, y + h, r);
    ctx.arcTo(x + w, y + h, x, y + h, r);
    ctx.arcTo(x, y + h, x, y, r);
    ctx.arcTo(x, y, x + w, y, r);
    ctx.closePath();
  },
};
