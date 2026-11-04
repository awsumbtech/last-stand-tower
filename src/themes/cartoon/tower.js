// Cartoon theme: the tower with a face, cannon recoil and squash & stretch.
(function () {
  const K = LST.CartoonKit;
  const { INK, outlined } = K;



  // Theme methods (assembled into LST.themes.cartoon by index.js)
  Object.assign(K.methods, {
    tower(ctx, t, r) {
      const R = t.radius * 1.35;
      const hit = t.hitFlash / 0.2;
      const low = t.hp / t.maxHp < 0.35;
      // Squash when hit, a little bounce when firing, gentle breathing otherwise.
      const breathe = Math.sin(r.time * 2.2) * 0.02;
      const sx = 1 + hit * 0.16 + t.recoil * 0.04 + breathe;
      const sy = 1 - hit * 0.13 - t.recoil * 0.04 - breathe;
      ctx.save();
      // Recoil: the whole tower gets shoved back a few units opposite the shot.
      const kick = t.recoil * t.recoil * 5;
      ctx.translate(t.x - Math.cos(t.angle) * kick, t.y - Math.sin(t.angle) * kick);

      ctx.beginPath();
      ctx.ellipse(4, 10, R * 1.15, R * 0.9, 0, 0, Math.PI * 2);
      ctx.fillStyle = "rgba(43, 29, 58, 0.25)";
      ctx.fill();

      // Cannon sits behind the body; it gets short and fat right after a shot.
      ctx.save();
      ctx.rotate(t.angle);
      const len = R + 20 - t.recoil * 9;
      const thick = 16 + t.recoil * 6;
      LST.draw.roundRect(ctx, 0, -thick / 2, len, thick, 7);
      outlined(ctx, "#5b6b8c", 4);
      LST.draw.roundRect(ctx, len - 11, -thick / 2 - 3.5, 13, thick + 7, 5);
      outlined(ctx, "#46536f", 4);
      ctx.restore();

      ctx.save();
      ctx.scale(sx, sy);
      for (let i = 0; i < 8; i++) {
        ctx.save();
        ctx.rotate((i / 8) * Math.PI * 2 + Math.PI / 8);
        LST.draw.roundRect(ctx, R - 7, -8, 13, 16, 4);
        outlined(ctx, "#b9c3dc", 4);
        ctx.restore();
      }
      ctx.beginPath();
      ctx.arc(0, 0, R, 0, Math.PI * 2);
      outlined(ctx, hit > 0 ? "#ff9a9a" : "#e6ecf8", 5);
      // highlight
      ctx.beginPath();
      ctx.arc(-R * 0.35, -R * 0.45, R * 0.22, 0, Math.PI * 2);
      ctx.fillStyle = "rgba(255,255,255,0.8)";
      ctx.fill();

      // ---- Face ----
      const look = t.angle;
      const ex = R * 0.34, ey = -R * 0.05, er = R * 0.21;
      const blink = r.time % 3.7 < 0.13;
      ctx.lineCap = "round";
      ctx.lineJoin = "round";
      for (const side of [-1, 1]) {
        const x = side * ex;
        if (hit > 0) {
          // > < squint
          ctx.beginPath();
          ctx.moveTo(x - side * er * 0.8, ey - er * 0.7);
          ctx.lineTo(x + side * er * 0.6, ey);
          ctx.lineTo(x - side * er * 0.8, ey + er * 0.7);
          ctx.lineWidth = 4;
          ctx.strokeStyle = INK;
          ctx.stroke();
        } else if (blink) {
          ctx.beginPath();
          ctx.moveTo(x - er * 0.8, ey);
          ctx.quadraticCurveTo(x, ey + er * 0.6, x + er * 0.8, ey);
          ctx.lineWidth = 4;
          ctx.strokeStyle = INK;
          ctx.stroke();
        } else {
          ctx.beginPath();
          ctx.ellipse(x, ey, er, er * 1.15, 0, 0, Math.PI * 2);
          outlined(ctx, "#ffffff", 3);
          ctx.beginPath();
          ctx.arc(x + Math.cos(look) * er * 0.38, ey + Math.sin(look) * er * 0.45, er * 0.55, 0, Math.PI * 2);
          ctx.fillStyle = INK;
          ctx.fill();
          ctx.beginPath();
          ctx.arc(x + Math.cos(look) * er * 0.38 - er * 0.18, ey + Math.sin(look) * er * 0.45 - er * 0.2, er * 0.18, 0, Math.PI * 2);
          ctx.fillStyle = "#ffffff";
          ctx.fill();
        }
        if (low) {
          // worried brows
          ctx.beginPath();
          ctx.moveTo(x - side * er * 0.9, ey - er * 1.75);
          ctx.lineTo(x + side * er * 0.8, ey - er * 1.35);
          ctx.lineWidth = 3.5;
          ctx.strokeStyle = INK;
          ctx.stroke();
        }
        // cheeks
        ctx.beginPath();
        ctx.ellipse(x + side * er * 0.7, ey + er * 1.45, er * 0.55, er * 0.32, 0, 0, Math.PI * 2);
        ctx.fillStyle = "rgba(255, 111, 181, 0.55)";
        ctx.fill();
      }
      // Mouth: "O" when it just fired, wobbly line when hurt, smile otherwise
      ctx.beginPath();
      if (t.recoil > 0.55) {
        ctx.ellipse(0, R * 0.42, R * 0.12, R * 0.15, 0, 0, Math.PI * 2);
        outlined(ctx, "#7a2840", 3);
      } else if (low || hit > 0) {
        ctx.moveTo(-R * 0.2, R * 0.48);
        ctx.quadraticCurveTo(-R * 0.1, R * 0.38, 0, R * 0.46);
        ctx.quadraticCurveTo(R * 0.1, R * 0.54, R * 0.2, R * 0.44);
        ctx.lineWidth = 3.5;
        ctx.strokeStyle = INK;
        ctx.stroke();
      } else {
        ctx.moveTo(-R * 0.2, R * 0.36);
        ctx.quadraticCurveTo(0, R * 0.58, R * 0.2, R * 0.36);
        ctx.lineWidth = 3.5;
        ctx.strokeStyle = INK;
        ctx.stroke();
      }
      if (low) {
        // sweat drop
        const d = (r.time * 1.5) % 1;
        ctx.beginPath();
        ctx.moveTo(R * 0.72, -R * 0.55 + d * 8);
        ctx.quadraticCurveTo(R * 0.92, -R * 0.2 + d * 8, R * 0.72, -R * 0.15 + d * 8);
        ctx.quadraticCurveTo(R * 0.52, -R * 0.2 + d * 8, R * 0.72, -R * 0.55 + d * 8);
        outlined(ctx, "#8fdcff", 2.5);
      }
      ctx.restore();
      ctx.restore();
    },
  });
})();
