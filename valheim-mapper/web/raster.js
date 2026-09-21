import { CELLS, CELL_M } from './world.js';

export function createRaster({ cells = CELLS, cellM = CELL_M, fill = 0, data } = {}) {
  const half = (cells * cellM) / 2;
  const r = { cells, cellM, data: data ?? new Uint8Array(cells * cells).fill(fill), dirty: null, touched: null, version: 0 };
  const inBounds = (cx, cz) => cx >= 0 && cz >= 0 && cx < cells && cz < cells;
  const clamp = n => Math.max(0, Math.min(cells - 1, n));

  r.toCell = (x, z) => [Math.floor((x + half) / cellM), Math.floor((z + half) / cellM)];
  r.cellCenter = (cx, cz) => [(cx + 0.5) * cellM - half, (cz + 0.5) * cellM - half];
  r.get = (x, z) => { const [cx, cz] = r.toCell(x, z); return inBounds(cx, cz) ? r.data[cz * cells + cx] : 0; };

  r.stamp = (x, z, radius, fn) => {
    const [ax, az] = r.toCell(x - radius, z - radius), [bx, bz] = r.toCell(x + radius, z + radius);
    if (bx < 0 || bz < 0 || ax >= cells || az >= cells) return null;
    const rect = { x0: clamp(ax), z0: clamp(az), x1: clamp(bx), z1: clamp(bz) };
    for (let cz = rect.z0; cz <= rect.z1; cz++) {
      for (let cx = rect.x0; cx <= rect.x1; cx++) {
        const [px, pz] = r.cellCenter(cx, cz), d = Math.hypot(px - x, pz - z);
        if (d > radius) continue;
        const i = cz * cells + cx;
        r.data[i] = fn(r.data[i], 1 - d / radius);
      }
    }
    r.markDirty(rect);
    return rect;
  };

  const union = (a, b) => a ? { x0: Math.min(a.x0, b.x0), z0: Math.min(a.z0, b.z0), x1: Math.max(a.x1, b.x1), z1: Math.max(a.z1, b.z1) } : { ...b };
  r.markDirty = (rect, touch = true) => {
    r.dirty = union(r.dirty, rect);
    if (touch) r.touched = union(r.touched, rect);
    r.version++;
  };
  r.takeDirty = () => { const d = r.dirty; r.dirty = null; return d; };
  r.takeTouched = () => { const t = r.touched; r.touched = null; return t; };

  r.snapshot = rect => {
    const w = rect.x1 - rect.x0 + 1, h = rect.z1 - rect.z0 + 1, out = new Uint8Array(w * h);
    for (let z = 0; z < h; z++) { const o = (rect.z0 + z) * cells + rect.x0; out.set(r.data.subarray(o, o + w), z * w); }
    return out;
  };
  r.restore = (rect, snap, { touch = true } = {}) => {
    const w = rect.x1 - rect.x0 + 1, h = rect.z1 - rect.z0 + 1;
    for (let z = 0; z < h; z++) r.data.set(snap.subarray(z * w, (z + 1) * w), (rect.z0 + z) * cells + rect.x0);
    r.markDirty(rect, touch);
  };
  return r;
}
