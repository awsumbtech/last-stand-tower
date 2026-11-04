// Cartoon theme: procedural bodies for Basic, Fast, Tank and Big Red (sprite fallback).
(function () {
  const K = LST.CartoonKit;
  const { outlined, eyes } = K;

  // Today's procedural bodies (also the fallback while sprites load).
  function vectorBody(ctx, e, R, fill, flash, c, look) {
    ctx.lineJoin = "round";
    if (e.type === "basic") {
      ctx.beginPath();
      ctx.arc(0, 0, R, 0, Math.PI * 2);
      outlined(ctx, fill, 3.5);
      eyes(ctx, R * 0.38, R * 0.28, look, false);
    } else if (e.type === "fast") {
      ctx.save();
      ctx.rotate(look + Math.PI / 2);
      ctx.beginPath();
      ctx.moveTo(0, -R * 1.5);
      ctx.quadraticCurveTo(R * 1.2, R * 0.2, 0, R);
      ctx.quadraticCurveTo(-R * 1.2, R * 0.2, 0, -R * 1.5);
      outlined(ctx, fill, 3);
      ctx.restore();
      eyes(ctx, R * 0.35, R * 0.3, look, false);
    } else if (e.type === "tank") {
      LST.draw.roundRect(ctx, -R, -R, R * 2, R * 2, R * 0.45);
      outlined(ctx, fill, 4);
      LST.draw.roundRect(ctx, -R, -R, R * 2, R * 0.7, R * 0.4);
      outlined(ctx, flash ? "#ffffff" : c.shade, 3.5);
      ctx.save();
      ctx.translate(0, R * 0.25);
      eyes(ctx, R * 0.4, R * 0.22, look, true);
      ctx.restore();
    } else {
      for (const side of [-1, 1]) {
        ctx.beginPath();
        ctx.moveTo(side * R * 0.45, -R * 0.75);
        ctx.quadraticCurveTo(side * R * 1.1, -R * 1.2, side * R * 0.95, -R * 1.65);
        ctx.quadraticCurveTo(side * R * 0.65, -R * 1.05, side * R * 0.15, -R * 0.9);
        outlined(ctx, "#fff3d6", 3.5);
      }
      ctx.beginPath();
      ctx.arc(0, 0, R, 0, Math.PI * 2);
      outlined(ctx, fill, 5);
      eyes(ctx, R * 0.36, R * 0.22, look, true);
      ctx.beginPath();
      ctx.moveTo(-R * 0.45, R * 0.35);
      ctx.quadraticCurveTo(0, R * 0.7, R * 0.45, R * 0.35);
      ctx.closePath();
      outlined(ctx, "#ffffff", 3);
    }
  }

  Object.assign(K, { vectorBody });
})();
