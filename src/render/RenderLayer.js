// RenderLayer: base class for one ordered layer of the canvas frame (RenderPipeline).
//   space  "world" (inside the centered, scaled, shaken world transform) or "screen" (CSS px)
//   draw(ctx, frame)  frame = { r: Renderer, scene, theme, fx: FxDirector|null, W: WorldRenderers|null, reduced }
LST.RenderLayer = class RenderLayer {
  get space() { return "world"; }
  draw(ctx, frame) {}
};
