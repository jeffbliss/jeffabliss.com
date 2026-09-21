import { WORLD_HALF, WORLD_SIZE, WORLD_RADIUS, TILE_M } from './world.js';
import { scratchCanvas, worldPattern } from './layers.js';

const soft = t => Math.min(1, t * 3);                    // full strength over inner 2/3 of brush
export const revealFn = (cur, t) => Math.max(cur, Math.round(255 * soft(t)));
export const refogFn = (cur, t) => Math.min(cur, Math.round(255 * (1 - soft(t))));

export function createFog(raster, textures) {
  const N = raster.cells;
  const mask = document.createElement('canvas'); mask.width = N; mask.height = N;
  const mctx = mask.getContext('2d');
  function rebuild(rect) {
    const w = rect.x1 - rect.x0 + 1, h = rect.z1 - rect.z0 + 1, img = mctx.createImageData(w, h);
    for (let z = 0; z < h; z++) for (let x = 0; x < w; x++) img.data[(z * w + x) * 4 + 3] = raster.data[(rect.z0 + z) * N + rect.x0 + x];
    mctx.putImageData(img, rect.x0, rect.z0);
  }
  rebuild({ x0: 0, z0: 0, x1: N - 1, z1: N - 1 }); raster.takeDirty();

  return {
    id: 'fog', name: 'Fog',
    reveal(x, z, r) { raster.stamp(x, z, r, revealFn); },
    refog(x, z, r) { raster.stamp(x, z, r, refogFn); },
    draw(ctx, view, w, h) {
      const d = raster.takeDirty(); if (d) rebuild(d);
      const s = scratchCanvas('fog', w, h), sc = s.getContext('2d');
      sc.setTransform(1, 0, 0, 1, 0, 0); sc.globalCompositeOperation = 'source-over'; sc.clearRect(0, 0, w, h);
      view.applyTo(sc, w, h);
      sc.beginPath(); sc.arc(0, 0, WORLD_RADIUS, 0, Math.PI * 2); sc.closePath();
      sc.fillStyle = worldPattern(sc, textures.fog, TILE_M.fog); sc.fill();
      sc.globalCompositeOperation = 'destination-out'; sc.imageSmoothingEnabled = true;
      sc.drawImage(mask, -WORLD_HALF, -WORLD_HALF, WORLD_SIZE, WORLD_SIZE);
      ctx.drawImage(s, 0, 0);
    },
  };
}
