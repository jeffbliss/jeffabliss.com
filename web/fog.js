// Fog brush functions. The fog raster holds a reveal amount per cell (0 fogged .. 255 revealed); rendering is in gl.js.
const soft = t => Math.min(1, t * 3);                    // full strength over the inner 2/3 of the brush
export const revealFn = (cur, t) => Math.max(cur, Math.round(255 * soft(t)));
export const refogFn = (cur, t) => Math.min(cur, Math.round(255 * (1 - soft(t))));
