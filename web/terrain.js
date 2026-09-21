import { BIOMES, WORLD_HALF, WORLD_SIZE, TILE_M } from './world.js';
import { scratchCanvas, worldPattern } from './layers.js';

const DETAIL_ALPHA = { forest: 0.55, mountain: 0.7, water: 0.5 };
const TINT_ALPHA = 0.85;

export function createTerrain(raster, textures) {
  const N = raster.cells;
  const mk = () => { const c = document.createElement('canvas'); c.width = N; c.height = N; return c; };
  const color = mk(), masks = { forest: mk(), mountain: mk(), water: mk() };
  const palette = BIOMES.map(b => b.color && b.color.map(c => Math.round(c * 255)));

  function rebuild(rect) {
    const w = rect.x1 - rect.x0 + 1, h = rect.z1 - rect.z0 + 1;
    const cctx = color.getContext('2d'), img = cctx.createImageData(w, h);
    const m = Object.fromEntries(Object.entries(masks).map(([k, c]) => [k, c.getContext('2d').createImageData(w, h)]));
    for (let z = 0; z < h; z++) for (let x = 0; x < w; x++) {
      const id = raster.data[(rect.z0 + z) * N + rect.x0 + x], b = BIOMES[id] ?? BIOMES[0], o = (z * w + x) * 4;
      if (b.color) { img.data.set(palette[id], o); img.data[o + 3] = 255; }
      if (b.detail) m[b.detail].data[o + 3] = 255;
    }
    cctx.putImageData(img, rect.x0, rect.z0);
    for (const k in m) masks[k].getContext('2d').putImageData(m[k], rect.x0, rect.z0);
  }
  rebuild({ x0: 0, z0: 0, x1: N - 1, z1: N - 1 }); raster.takeDirty();

  const layer = {
    id: 'terrain', name: 'Terrain',
    paint(x, z, radius, id) { raster.stamp(x, z, radius, () => id); },
    draw(ctx, view, w, h) {
      const d = raster.takeDirty(); if (d) rebuild(d);
      const s = scratchCanvas('terrain', w, h), sc = s.getContext('2d');
      const reset = () => { sc.setTransform(1, 0, 0, 1, 0, 0); sc.globalCompositeOperation = 'source-over'; sc.clearRect(0, 0, w, h); view.applyTo(sc, w, h); sc.imageSmoothingEnabled = true; };
      const base = ctx.globalAlpha;
      reset(); sc.drawImage(color, -WORLD_HALF, -WORLD_HALF, WORLD_SIZE, WORLD_SIZE);
      ctx.globalCompositeOperation = 'multiply'; ctx.globalAlpha = base * TINT_ALPHA; ctx.drawImage(s, 0, 0);
      ctx.globalCompositeOperation = 'source-over';
      for (const [k, mask] of Object.entries(masks)) {
        reset();
        sc.fillStyle = worldPattern(sc, textures[k], TILE_M[k]); sc.fillRect(-WORLD_HALF, -WORLD_HALF, WORLD_SIZE, WORLD_SIZE);
        sc.globalCompositeOperation = 'destination-in'; sc.drawImage(mask, -WORLD_HALF, -WORLD_HALF, WORLD_SIZE, WORLD_SIZE);
        ctx.globalAlpha = base * DETAIL_ALPHA[k]; ctx.drawImage(s, 0, 0);
      }
      ctx.globalAlpha = base;
    },
  };
  return layer;
}
