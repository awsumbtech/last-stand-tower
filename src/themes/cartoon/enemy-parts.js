// Cartoon theme: enemy pieces shared by the vector and sprite paths (shadow, HP bar, sprite tint).
(function () {
  const K = LST.CartoonKit;
  const { TINT, outlined } = K;

  // ---------- Enemy pieces shared by the vector and sprite paths ----------
  function shadow(ctx, R) {
    ctx.beginPath();
    ctx.ellipse(2, R * 0.85, R * 0.9, R * 0.35, 0, 0, Math.PI * 2);
    ctx.fillStyle = "rgba(43, 29, 58, 0.22)";
    ctx.fill();
  }

  function hpBar(ctx, e, R) {
    if (e.hp >= e.maxHp) return;
    const bw = Math.max(26, R * 2);
    const by = -R * (e.type === "boss" ? 1.85 : 1.5) - 10;
    LST.draw.roundRect(ctx, -bw / 2, by, bw, 8, 4);
    outlined(ctx, "#ffffff", 2.5);
    const f = Math.max(0, e.hp / e.maxHp);
    if (f > 0.05) {
      LST.draw.roundRect(ctx, -bw / 2 + 1.5, by + 1.5, (bw - 3) * f, 5, 2.5);
      ctx.fillStyle = f < 0.35 ? "#ff4757" : "#3ddc84";
      ctx.fill();
    }
  }

  function spriteTint(e, flash, frozen, charge) {
    if (flash) return e.isBoss ? TINT.bossFlash : TINT.flash;
    if (frozen) return TINT.frozen;
    if (charge) return TINT.charge;
    return null;
  }

  Object.assign(K, { shadow, hpBar, spriteTint });
})();
