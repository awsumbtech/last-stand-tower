// Cartoon theme: enemy and corpse drawing (picks sprite or vector bodies).
(function () {
  const K = LST.CartoonKit;
  const { COLORS, telegraph, dizzy, drawMole, moleSprite, shadow, hpBar, spriteTint, vectorBody } = K;



  // Theme methods (assembled into LST.themes.cartoon by index.js)
  Object.assign(K.methods, {
    enemy(ctx, e, r) {
      if (e.windup > 0) telegraph(ctx, e, r);
      if (e.type === "mole") {
        if (!moleSprite(ctx, e)) drawMole(ctx, e, r);
        if (e.stun > 0 && e.mode === "up") dizzy(ctx, { x: e.x, y: e.y - e.radius * 1.5, radius: e.radius }, r);
        return;
      }
      if (e.stun > 0) dizzy(ctx, e, r);
      const c = COLORS[e.type];
      const look = Math.atan2(-e.y, -e.x); // toward the tower at 0,0
      const pop = Math.min(1, e.age / (e.type === "boss" ? 0.6 : 0.3)); // pop in with a bounce
      const grow = pop < 1 ? 0.5 + 0.8 * pop - 0.3 * pop * pop : 1;
      const freq = e.type === "fast" ? 18 : e.type === "basic" ? 10 : 6;
      const w = Math.sin(e.age * freq);
      const lift = e.windup > 0 ? 1 - e.windup / (e.windupMax || 1) : 0;
      const sx = (1 + 0.12 * w + e.slamAnim * 0.3 - lift * 0.12) * grow;
      const sy = (1 - 0.12 * w - e.slamAnim * 0.3 + lift * 0.2) * grow;
      const R = e.radius * 1.35;
      const flash = e.hitFlash > 0;
      const charge = e.charging && Math.floor(e.age * 10) % 2;
      const fill = flash ? (e.isBoss ? "#ff8a95" : "#ffffff") : charge ? "#ff1f3d" : c.body;

      ctx.save();
      ctx.translate(e.x, e.y);
      shadow(ctx, R);
      // Squash a bit harder on the frame it gets hit
      const sq = e.isBoss ? 0.04 : 0.12;
      const bx = sx * (flash ? 1 + sq : 1), by = sy * (flash ? 1 - sq : 1);
      // rot only turns sprite layers flagged to rotate (Fast's dart); look aims the pupils.
      const fx = { sx: bx, sy: by, rot: look - Math.PI / 2, look, tint: spriteTint(e, flash, charge) };
      if (!(LST.enemySprites && LST.enemySprites.drawBody(ctx, e, fx))) {
        ctx.save();
        ctx.scale(bx, by);
        vectorBody(ctx, e, R, fill, flash, c, look);
        ctx.restore();
      }
      hpBar(ctx, e, R);
      ctx.restore();
    },

    // HP bar only, for bodies drawn by another renderer (World 2 image art): same bar as above.
    enemyHud(ctx, e) {
      ctx.save();
      ctx.translate(e.x, e.y);
      hpBar(ctx, e, e.radius * 1.35);
      ctx.restore();
    },

    // Death animations (sprites only). A kill leaves a Corpse for exactly the clip length.
    corpseLife(e) {
      return LST.enemySprites ? LST.enemySprites.deathDuration(e) : 0;
    },

    corpse(ctx, c) {
      const look = Math.atan2(-c.y, -c.x);
      const R = c.radius * 1.35;
      ctx.save();
      ctx.translate(c.x, c.y);
      if (c.type !== "mole") { ctx.globalAlpha = Math.max(0, c.life / c.maxLife); shadow(ctx, R); ctx.globalAlpha = 1; }
      LST.enemySprites.drawDeath(ctx, c, { sx: 1, sy: 1, rot: look - Math.PI / 2, look, tint: null });
      ctx.restore();
    },
  });
})();
