// Flood fill for the terrain raster, guarded so a click can never flood the whole map.
import { WORLD_RADIUS } from './world.js';
import { interpolate } from './tools.js';
import { createStrokeRecorder, combine } from './history.js';

/** Fills larger than this (cells) are refused: 500×500 cells = 4 km × 4 km, far bigger than any one region you would fill by hand. */
export const FILL_MAX_CELLS = 250_000;

/** Marks the raster cells under every ink stroke (1 = wall). Strokes are walls for the fill, so an inked coastline contains it. */
export function inkWalls(raster, strokes) {
  const walls = new Uint8Array(raster.cells * raster.cells);
  for (const s of strokes) {
    const r = Math.max(s.width / 2, raster.cellM / 2);
    const mark = (x, z) => {
      const [ax, az] = raster.toCell(x - r, z - r), [bx, bz] = raster.toCell(x + r, z + r);
      for (let cz = Math.max(0, az); cz <= Math.min(raster.cells - 1, bz); cz++) for (let cx = Math.max(0, ax); cx <= Math.min(raster.cells - 1, bx); cx++) {
        const [px, pz] = raster.cellCenter(cx, cz);
        if (Math.hypot(px - x, pz - z) <= r + raster.cellM * 0.5) walls[cz * raster.cells + cx] = 1;
      }
    };
    for (let i = 0; i < s.points.length; i++) {
      const [ax, az] = s.points[i], [bx, bz] = s.points[i + 1] ?? s.points[i];
      mark(ax, az); for (const [x, z] of interpolate(ax, az, bx, bz, raster.cellM / 2)) mark(x, z);
    }
  }
  return walls;
}

/**
 * The connected run of same-valued cells around world point (x, z), bounded by other values and by `walls`.
 * Returns { rect, indices } or { error } when the region is not enclosed (it reaches the edge of the world) or is too big.
 */
export function floodRegion(raster, x, z, walls = null, { maxCells = FILL_MAX_CELLS, radius = WORLD_RADIUS } = {}) {
  const { cells, data } = raster, [sx, sz] = raster.toCell(x, z);
  if (sx < 0 || sz < 0 || sx >= cells || sz >= cells) return { error: 'Click inside the world to fill' };
  const start = sz * cells + sx;
  if (walls?.[start]) return { error: 'That spot is on an ink line' };
  const target = data[start], seen = new Uint8Array(cells * cells), indices = [], stack = [start];
  const r2 = radius * radius;
  let x0 = sx, x1 = sx, z0 = sz, z1 = sz;
  seen[start] = 1;
  while (stack.length) {
    const i = stack.pop(), cx = i % cells, cz = (i - cx) / cells;
    const [px, pz] = raster.cellCenter(cx, cz);
    if (px * px + pz * pz > r2) return { error: 'Not enclosed: the area reaches the edge of the world' };
    indices.push(i);
    if (indices.length > maxCells) return { error: 'Not enclosed: the area is too large to fill' };
    if (cx < x0) x0 = cx; if (cx > x1) x1 = cx; if (cz < z0) z0 = cz; if (cz > z1) z1 = cz;
    const visit = j => { if (!seen[j] && data[j] === target && !walls?.[j]) { seen[j] = 1; stack.push(j); } };
    if (cx > 0) visit(i - 1); if (cx < cells - 1) visit(i + 1);
    if (cz > 0) visit(i - cells); if (cz < cells - 1) visit(i + cells);
  }
  return { rect: { x0, z0, x1, z1 }, indices };
}

/**
 * Fills the enclosed region under (x, z). A biome fill sets the terrain and reveals the fog there; the palette's
 * Fog swatch (biome === 'fog') re-fogs the region instead. Returns the undo command, or { error }.
 */
export function fillAt({ terrain, fog, ink }, x, z, biome, opts) {
  const region = floodRegion(terrain, x, z, inkWalls(terrain, ink), opts);
  if (region.error) return region;
  const { rect, indices } = region;
  const terrainRec = createStrokeRecorder(terrain, 'terrain'), fogRec = createStrokeRecorder(fog, 'fog');
  terrainRec.begin(); fogRec.begin();
  if (biome === 'fog') { for (const i of indices) fog.data[i] = 0; fog.markDirty(rect); }
  else {
    if (biome !== terrain.data[indices[0]]) { for (const i of indices) terrain.data[i] = biome; terrain.markDirty(rect); }
    for (const i of indices) fog.data[i] = 255; fog.markDirty(rect);
  }
  return combine('fill', terrainRec.end('fill'), fogRec.end('fill')) ?? { error: 'Nothing to fill' };
}
