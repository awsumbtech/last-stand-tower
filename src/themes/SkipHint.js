// SkipHint: default "Tap to skip" draw for any theme (the shared theme
// interface). Outlined live text may stay in code (Decision 6 / F9); no
// code-drawn art. Themes may override theme.skipHint; HudCanvasLayer falls
// back to SkipHint.draw when a theme has none.
LST.SkipHint = {
  draw(ctx, r) {
    const x = r.width / 2, y = r.height - 168, size = 22;
    const kit = LST.CartoonKit;
    const font = (kit && kit.FONT) || 'Fredoka, "Arial Rounded MT Bold", "Trebuchet MS", system-ui, sans-serif';
    const ink = (kit && kit.INK) || "#2b1d3a";
    if (kit && kit.textPop) {
      kit.textPop(ctx, "Tap to skip", x, y, "#fffbf1", size);
      return;
    }
    ctx.save();
    ctx.font = `700 ${size}px ${font}`;
    ctx.textAlign = "center";
    ctx.textBaseline = "middle";
    ctx.lineJoin = "round";
    ctx.lineWidth = size * 0.26;
    ctx.strokeStyle = ink;
    ctx.strokeText("Tap to skip", x, y);
    ctx.fillStyle = "#fffbf1";
    ctx.fillText("Tap to skip", x, y);
    ctx.restore();
  },
};
