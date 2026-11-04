// Cartoon theme: King Mole (vector drawing and sprite-sheet path).
(function () {
  const K = LST.CartoonKit;
  const { INK, COLORS, TINT, outlined, eyes } = K;

  // King Mole: a dirt mound underground, a big brown mole with a crown above ground.
  function drawMole(ctx, e, r) {
    const R = e.radius * 1.2;
    const look = Math.atan2(-e.y, -e.x);
    ctx.save();
    ctx.translate(e.x, e.y);
    // the hole / mound
    const moundW = R * 1.35, moundH = R * 0.5;
    if (e.mode === "under") {
      const bob = Math.sin(r.time * 30) * 2;
      ctx.beginPath();
      ctx.ellipse(0, bob, moundW * 0.8, moundH * 0.9, 0, Math.PI, 0);
      ctx.lineTo(moundW * 0.8, bob);
      outlined(ctx, "#a1887f", 4);
      for (let i = 0; i < 5; i++) {
        ctx.beginPath();
        ctx.arc(Math.sin(i * 2.3 + r.time * 9) * moundW * 0.7, -moundH * 0.6 + Math.cos(i * 1.7 + r.time * 11) * 6, 4, 0, Math.PI * 2);
        outlined(ctx, "#6d4c41", 2);
      }
      ctx.restore();
      return;
    }
    ctx.beginPath();
    ctx.ellipse(0, R * 0.55, moundW, moundH, 0, 0, Math.PI * 2);
    outlined(ctx, "#5d4037", 4);
    ctx.beginPath();
    ctx.ellipse(0, R * 0.5, moundW * 0.72, moundH * 0.55, 0, 0, Math.PI * 2);
    ctx.fillStyle = "#3e2723";
    ctx.fill();
    // how far out of the hole he is
    let out = 1;
    if (e.mode === "rise") out = 1 - Math.max(0, e.timer) / 0.55;
    if (e.mode === "dig") out = Math.max(0, e.timer) / (e.timer > 0.5 ? 0.9 : 0.5);
    out = Math.max(0, Math.min(1, out));
    const lift = e.windup > 0 ? (1 - e.windup / (e.windupMax || 1)) : 0; // rears up before a slam
    const squash = e.slamAnim;
    ctx.save();
    ctx.beginPath();
    ctx.rect(-R * 2, -R * 4, R * 4, R * 4.5); // clip at the hole's front edge
    ctx.clip();
    ctx.translate(0, R * 0.5 + (1 - out) * R * 2.2 - lift * 10);
    ctx.scale(1 + squash * 0.25 - lift * 0.08, 1 - squash * 0.25 + lift * 0.12);
    const flash = e.hitFlash > 0;
    const fill = flash ? "#c8a99b" : e.slowTimer > 0 ? "#bfefff" : COLORS.mole.body; // bosses only blush when hit (they get hit a lot)
    // claws
    for (const side of [-1, 1]) {
      ctx.save();
      ctx.translate(side * R * 0.95, -R * 0.55 - lift * 18);
      ctx.rotate(side * (0.4 + lift * 0.8));
      LST.draw.roundRect(ctx, -R * 0.28, -R * 0.2, R * 0.56, R * 0.5, R * 0.2);
      outlined(ctx, "#ffccbc", 3.5);
      for (let i = -1; i <= 1; i++) {
        ctx.beginPath();
        ctx.moveTo(i * R * 0.15, -R * 0.2);
        ctx.lineTo(i * R * 0.15 + side * 2, -R * 0.42);
        ctx.lineWidth = 3;
        ctx.strokeStyle = INK;
        ctx.stroke();
      }
      ctx.restore();
    }
    // body
    ctx.beginPath();
    ctx.ellipse(0, -R * 0.55, R, R * 1.05, 0, 0, Math.PI * 2);
    outlined(ctx, fill, 5);
    ctx.beginPath();
    ctx.ellipse(0, -R * 0.25, R * 0.62, R * 0.6, 0, 0, Math.PI * 2);
    ctx.fillStyle = flash ? "#e3d3cc" : "#bcaaa4";
    ctx.fill();
    // eyes (angrier each phase)
    ctx.save();
    ctx.translate(0, -R * 0.95);
    eyes(ctx, R * 0.33, R * 0.17, look, e.phase > 0);
    ctx.restore();
    // nose
    ctx.beginPath();
    ctx.ellipse(0, -R * 0.62, R * 0.24, R * 0.17, 0, 0, Math.PI * 2);
    outlined(ctx, "#ff8fab", 3);
    // mouth + teeth
    ctx.beginPath();
    ctx.moveTo(-R * 0.25, -R * 0.38);
    ctx.quadraticCurveTo(0, -R * (e.phase === 2 ? 0.12 : 0.26), R * 0.25, -R * 0.38);
    ctx.lineWidth = 3;
    ctx.strokeStyle = INK;
    ctx.stroke();
    LST.draw.roundRect(ctx, -R * 0.1, -R * 0.37, R * 0.2, R * 0.16, 2);
    outlined(ctx, "#ffffff", 2);
    // crown
    ctx.save();
    ctx.translate(0, -R * 1.55);
    ctx.rotate(Math.sin(r.time * 3) * 0.06 + (e.phase === 2 ? 0.25 : 0));
    ctx.beginPath();
    ctx.moveTo(-R * 0.45, R * 0.12);
    ctx.lineTo(-R * 0.5, -R * 0.3);
    ctx.lineTo(-R * 0.22, -R * 0.08);
    ctx.lineTo(0, -R * 0.42);
    ctx.lineTo(R * 0.22, -R * 0.08);
    ctx.lineTo(R * 0.5, -R * 0.3);
    ctx.lineTo(R * 0.45, R * 0.12);
    ctx.closePath();
    outlined(ctx, "#ffd23f", 3.5);
    ctx.beginPath();
    ctx.arc(0, -R * 0.02, R * 0.08, 0, Math.PI * 2);
    outlined(ctx, "#ff4757", 2);
    ctx.restore();
    ctx.restore();
    // front lip of the hole
    ctx.beginPath();
    ctx.ellipse(0, R * 0.55, moundW, moundH, 0, 0, Math.PI);
    ctx.lineWidth = 4;
    ctx.strokeStyle = INK;
    ctx.stroke();
    ctx.restore();
  }

  // King Mole from his sheet. Rise/dig/slam motion is in the frames; only the slam
  // wind-up (idle clip) gets the code's rear-up stretch, planted on the hole.
  function moleSprite(ctx, e) {
    const S = LST.enemySprites;
    const clip = S && S.clip(e);
    if (!clip) return false;
    const R = e.radius * 1.2;
    const lift = clip.codeMotion && e.windup > 0 ? 1 - e.windup / (e.windupMax || 1) : 0;
    const tint = e.hitFlash > 0 ? TINT.flash : e.slowTimer > 0 ? TINT.frozen : null;
    ctx.save();
    ctx.translate(e.x, e.y);
    S.drawBody(ctx, e, { sx: 1 - lift * 0.06, sy: 1 + lift * 0.1, anchorY: R * 0.55, tint }, clip);
    ctx.restore();
    return true;
  }

  Object.assign(K, { drawMole, moleSprite });
})();
