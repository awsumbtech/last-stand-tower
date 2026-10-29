// EnemySpriteRenderer: draws an enemy body (or its death) from the sprite sheets.
// The theme computes the "code effects" (squash/stretch, tint, facing) exactly as it
// does for vector art and hands them over as `fx`; this class applies them to the frames.
// Every draw returns false when no sprite is available, so the caller draws vector art.
//   fx = { sx, sy, rot, look, tint: {color, alpha, mode} | null, anchorY }
//   rot only turns layers flagged `rotates`; tint only colours layers flagged `tinted`
//   (King Mole: body yes, hole/front no); look aims code-drawn pupils (EyeLayer).
LST.EnemySpriteRenderer = class EnemySpriteRenderer {
  constructor(library, rules) {
    this.library = library;
    this.rules = rules || new LST.EnemyAnimationRules();
    this.tinter = new LST.SpriteTinter();
    this.eyes = new LST.EyeLayer();
    this.players = new WeakMap(); // entity -> AnimationPlayer
    this.stats = { drawn: 0, fallback: 0 };
  }

  // First layer set of the rig whose sheets are all loaded and have this animation.
  layers(rigName, anim) {
    for (const set of this.rules.rigs[rigName] || []) {
      const out = [];
      for (const l of set) {
        const atlas = this.library.get(l.sheet);
        if (!atlas || !atlas.has(anim)) break;
        const meta = atlas.layer || {};
        out.push({
          atlas,
          rotates: l.rotates != null ? !!l.rotates : !!meta.rotates,
          tinted: l.tinted != null ? !!l.tinted : meta.tinted !== false,
        });
      }
      if (out.length === set.length) return out;
    }
    return null;
  }

  // Resolve the clip for this entity now (null = use vector).
  clip(e) {
    const c = this.rules.pick(e);
    const layers = c && this.layers(c.rig, c.anim);
    if (!layers) return null;
    return { atlas: layers[0].atlas, layers, anim: c.anim, finish: c.finish, time: c.time, codeMotion: c.codeMotion !== false };
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
    // p.clip may still be an earlier one-shot clip that is finishing (e.g. a slam).
    this.drawLayers(ctx, p.clip.layers, p.anim.name, p.index(), fx);
    this.stats.drawn++;
    return true;
  }

  // Seconds of death animation for this enemy (0 = none / not loaded).
  deathDuration(e) {
    const c = this.rules.death(e);
    const layers = c && this.layers(c.rig, c.anim);
    return layers ? layers[0].atlas.animation(c.anim).duration : 0;
  }

  // A Corpse (see entities.js) plays the death clip once from its own clock.
  drawDeath(ctx, corpse, fx) {
    const c = this.rules.death(corpse);
    const layers = c && this.layers(c.rig, c.anim);
    if (!layers) return false;
    const a = layers[0].atlas.animation(c.anim);
    this.drawLayers(ctx, layers, c.anim, Math.min(a.frames.length - 1, Math.floor(corpse.age * a.fps)), fx);
    return true;
  }

  // Layers share frame index, pivot and timing. The first layer's frame offset (walk bob,
  // screen space) moves the whole stack after the squash, so a turned body can't slide
  // out from under an upright face.
  drawLayers(ctx, layers, anim, index, fx) {
    if (index < 0) return;
    fx = fx || {};
    ctx.save();
    const ay = fx.anchorY || 0; // squash around this point (e.g. the mole's hole)
    if (fx.sx !== undefined && (fx.sx !== 1 || fx.sy !== 1)) { // screen-axis squash, like the vector art
      ctx.translate(0, ay);
      ctx.scale(fx.sx, fx.sy);
      ctx.translate(0, -ay);
    }
    const first = layers[0].atlas.frameAt(anim, index);
    if (first && first.offset) {
      const k = 1 / layers[0].atlas.pxPerUnit;
      ctx.translate(first.offset.x * k, first.offset.y * k);
    }
    ctx.imageSmoothingEnabled = true;
    ctx.imageSmoothingQuality = "high";
    for (const l of layers) {
      const frame = l.atlas.frameAt(anim, index);
      if (!frame) continue;
      ctx.save();
      if (l.rotates && fx.rot) ctx.rotate(fx.rot);
      if (fx.tint && l.tinted) this.tinter.drawFrame(ctx, l.atlas, frame, fx.tint);
      else l.atlas.drawFrame(ctx, frame);
      ctx.restore();
      if (!l.rotates && fx.look !== undefined) this.eyes.draw(ctx, l.atlas, frame, fx.look);
    }
    ctx.restore();
  }
};

LST.enemySprites = new LST.EnemySpriteRenderer(LST.sprites);
