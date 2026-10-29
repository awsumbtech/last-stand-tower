// EyeLayer: draws code-placed pupils on sheets whose eye whites are left empty
// (Basic, Fast's face layer). Like cartoon.js eyes(): each pupil sits at the eye centre
// plus (cos look, sin look) * maxOffset, so the enemy keeps staring at the tower.
// A frame with eyes = [] (blink, hurt, death) gets no pupils.
LST.EyeLayer = class EyeLayer {
  // Origin = the frame pivot, upright (world units). look = angle toward the tower.
  draw(ctx, atlas, frame, look) {
    const pupil = atlas.pupil;
    if (!pupil || !frame || !frame.eyes || !frame.eyes.length) return;
    const k = 1 / atlas.pxPerUnit;
    const cx = Math.cos(look), cy = Math.sin(look);
    for (const eye of frame.eyes) {
      const s = (eye.pupilR || pupil.r) / pupil.r;
      const x = (eye.x + cx * eye.maxOffset) * k;
      const y = (eye.y + cy * eye.maxOffset) * k;
      const w = pupil.image.width * s * k, h = pupil.image.height * s * k;
      ctx.drawImage(pupil.image, x - pupil.px * s * k, y - pupil.py * s * k, w, h);
    }
  }
};
