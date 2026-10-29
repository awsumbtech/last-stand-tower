// AnimationPlayer: per-entity playback of one clip at a time.
// Driven by the entity's own clock (e.age), so pause, hit-stop and 2x speed all line up
// with the simulation. Looping clips wrap; one-shot clips hold their last frame.
// A clip flagged `finish` can't be cut off by a different clip until it has played through.
LST.AnimationPlayer = class AnimationPlayer {
  constructor() {
    this.atlas = null;
    this.anim = null;
    this.key = "";
    this.t = 0;
    this.clock = null;
    this.finish = false;
  }

  // clip = { atlas, anim (name), finish?, time? }. `time` pins the clip time (seconds),
  // for clips the simulation already times (King Mole's rise/dig). Switching clips restarts time at 0;
  // swapping to the same-named clip on another atlas (e.g. the angry sheet) keeps time.
  play(clip) {
    const key = clip.atlas.name + ":" + clip.anim;
    if (key === this.key) { if (clip.time != null) this.t = clip.time; return; }
    if (this.finish && !this.done && clip.anim !== this.anim.name) return;
    const sameAnim = this.anim && this.anim.name === clip.anim;
    this.atlas = clip.atlas;
    this.anim = clip.atlas.animation(clip.anim);
    this.key = key;
    this.finish = !!clip.finish;
    if (!sameAnim) this.t = 0;
    if (clip.time != null) this.t = clip.time;
  }

  // Advance to the entity clock `now` (seconds). The first call just syncs.
  advance(now) {
    if (this.clock !== null) this.t += Math.max(0, now - this.clock);
    this.clock = now;
  }

  get done() { return !this.anim || (!this.anim.loop && this.t >= this.anim.duration); }

  frame() {
    const a = this.anim;
    if (!a || !a.frames.length) return null;
    const i = Math.floor(this.t * a.fps);
    return a.frames[a.loop ? i % a.frames.length : Math.min(a.frames.length - 1, i)];
  }
};
