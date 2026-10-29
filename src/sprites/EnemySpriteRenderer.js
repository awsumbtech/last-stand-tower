// EnemySpriteRenderer: draws an enemy body (or its death) from the sprite sheets.
// The theme computes the "code effects" (squash/stretch, tint, rotation) exactly as it
// does for vector art and hands them over as `fx`; this class applies them to the frame.
// Every draw returns false when no sprite is available, so the caller draws vector art.
//   fx = { sx, sy, rot, tint: {color, alpha} | null, anchorY }
LST.EnemySpriteRenderer = class EnemySpriteRenderer {
  constructor(library, rules) {
    this.library = library;
    this.rules = rules || new LST.EnemyAnimationRules();
    this.tinter = new LST.SpriteTinter();
    this.players = new WeakMap(); // entity -> AnimationPlayer
    this.stats = { drawn: 0, fallback: 0 };
  }

  // A sheet name, or a list of names to try in order.
  atlas(sheet) {
    if (Array.isArray(sheet)) { for (const s of sheet) { const a = this.library.get(s); if (a) return a; } return null; }
    return this.library.get(sheet);
  }

  // Resolve the clip for this entity now (null = use vector).
  clip(e) {
    const c = this.rules.pick(e);
    if (!c) return null;
    const atlas = this.atlas(c.sheet);
    if (!atlas || !atlas.has(c.anim)) return null;
    return { atlas, anim: c.anim, finish: c.finish, time: c.time, codeMotion: c.codeMotion !== false };
  }

  player(e) {
    let p = this.players.get(e);
    if (!p) { p = new LST.AnimationPlayer(); this.players.set(e, p); }
    return p;
  }

  // Draw the body at the current origin (the theme has already translated to e.x, e.y).
  drawBody(ctx, e, fx, clip) {
    clip = clip || this.clip(e);
    if (!clip) { this.stats.fallback++; return false; }
    const p = this.player(e);
    p.advance(e.age);
    p.play(clip);
    this.drawFrame(ctx, p.atlas, p.frame(), fx);
    this.stats.drawn++;
    return true;
  }

  // Seconds of death animation for this enemy (0 = none / not loaded).
  deathDuration(e) {
    const c = this.rules.death(e);
    const atlas = c && this.atlas(c.sheet);
    const a = atlas && atlas.animation(c.anim);
    return a ? a.duration : 0;
  }

  // A Corpse (see entities.js) plays the death clip once from its own clock.
  drawDeath(ctx, corpse, fx) {
    const c = this.rules.death(corpse);
    const atlas = c && this.atlas(c.sheet);
    const a = atlas && atlas.animation(c.anim);
    if (!a) return false;
    const i = Math.min(a.frames.length - 1, Math.floor(corpse.age * a.fps));
    this.drawFrame(ctx, atlas, a.frames[i], fx);
    return true;
  }

  drawFrame(ctx, atlas, frame, fx) {
    if (!frame) return;
    ctx.save();
    const ay = (fx && fx.anchorY) || 0; // squash around this point (e.g. the mole's hole)
    if (fx && (fx.sx !== 1 || fx.sy !== 1)) { // screen-axis squash, like the vector art
      ctx.translate(0, ay);
      ctx.scale(fx.sx, fx.sy);
      ctx.translate(0, -ay);
    }
    if (fx && fx.rot) ctx.rotate(fx.rot);
    ctx.imageSmoothingEnabled = true;
    ctx.imageSmoothingQuality = "high";
    if (fx && fx.tint) this.tinter.drawFrame(ctx, atlas, frame, fx.tint);
    else atlas.drawFrame(ctx, frame);
    ctx.restore();
  }
};

LST.enemySprites = new LST.EnemySpriteRenderer(LST.sprites);
