// Bearing sightings: from a checked pin, a target lies on a compass point. Each sighting is a ±HALF° wedge;
// the target can only be where every wedge overlaps. Bearing 0 = north (+z), 90 = east (+x), like leglog.js.
export const HALF = 11.25;
const SQUARE_M = 4000;
const rad = d => d * Math.PI / 180;

// Unit direction of a bearing in world x/z.
const dir = b => [Math.sin(rad(b)), Math.cos(rad(b))];

// The wedge from `observer` around `bearing` as two half-planes: { px, pz, nx, nz }, inside when (P − p)·n ≥ 0.
export function wedge(observer, bearing) {
  const left = dir(bearing - HALF), right = dir(bearing + HALF);
  // Inward normal of the left edge points clockwise (toward the wedge); of the right edge, counter-clockwise.
  return [
    { px: observer.x, pz: observer.z, nx: left[1], nz: -left[0] },
    { px: observer.x, pz: observer.z, nx: -right[1], nz: right[0] },
  ];
}

// Sutherland–Hodgman: the part of a convex polygon inside one half-plane.
export function clip(polygon, { px, pz, nx, nz }) {
  const side = ([x, z]) => (x - px) * nx + (z - pz) * nz;
  const out = [];
  for (let i = 0; i < polygon.length; i++) {
    const a = polygon[i], b = polygon[(i + 1) % polygon.length], sa = side(a), sb = side(b);
    if (sa >= 0) out.push(a);
    if ((sa >= 0) !== (sb >= 0)) { const t = sa / (sa - sb); out.push([a[0] + t * (b[0] - a[0]), a[1] + t * (b[1] - a[1])]); }
  }
  return out;
}

// Sightings whose observer pin exists and is checked, each with `observer` attached.
export function contributing(sightings, pins) {
  const byId = new Map(pins.map(p => [p.id, p]));
  return (sightings ?? []).flatMap(s => { const o = byId.get(s.from); return o && o.checked ? [{ ...s, observer: o }] : []; });
}

// The polygon where every contributing wedge overlaps, clipped to a square around the observers.
export function region(sightings, pins) {
  const c = contributing(sightings, pins);
  const cx = c.reduce((a, s) => a + s.observer.x, 0) / (c.length || 1), cz = c.reduce((a, s) => a + s.observer.z, 0) / (c.length || 1);
  const h = SQUARE_M / 2, square = { x0: cx - h, z0: cz - h, x1: cx + h, z1: cz + h };
  let polygon = [[square.x0, square.z0], [square.x1, square.z0], [square.x1, square.z1], [square.x0, square.z1]];
  for (const s of c) for (const half of wedge(s.observer, s.bearing)) { polygon = clip(polygon, half); if (!polygon.length) break; }
  return { polygon, square, count: c.length };
}

// Centroid and radius of a bounded region; null when empty, unbounded (touches the square) or from fewer than two sightings.
export function estimate({ polygon, square, count }) {
  if (count < 2 || polygon.length < 3) return null;
  const eps = 1e-6;
  const onEdge = ([x, z]) => Math.abs(x - square.x0) < eps || Math.abs(x - square.x1) < eps || Math.abs(z - square.z0) < eps || Math.abs(z - square.z1) < eps;
  if (polygon.some(onEdge)) return null;
  let area = 0, x = 0, z = 0;
  for (let i = 0; i < polygon.length; i++) {
    const [ax, az] = polygon[i], [bx, bz] = polygon[(i + 1) % polygon.length], f = ax * bz - bx * az;
    area += f; x += (ax + bx) * f; z += (az + bz) * f;
  }
  if (Math.abs(area) < eps) return null;
  x /= 3 * area; z /= 3 * area;
  const error = Math.round(Math.max(...polygon.map(([px, pz]) => Math.hypot(px - x, pz - z))));
  return { x, z, error };
}

/** Upserts (replacing in place, else appending) or, with bearing undefined, removes `from`'s sighting on `pin`,
 * dropping the key when empty. The sync applier and the worker follow the same rule, so undo merges with remote edits. */
export function applySighting(pin, from, bearing) {
  const list = pin.sightings ?? [];
  let next;
  if (bearing === undefined) next = list.filter(s => s.from !== from);
  else { const i = list.findIndex(s => s.from === from); next = i >= 0 ? list.map((s, j) => j === i ? { from, bearing } : s) : [...list, { from, bearing }]; }
  if (next.length) pin.sightings = next; else delete pin.sightings;
}

/** Undoable, synced edits to a target pin's sightings. Each returns a history command or null when nothing changes.
 * Undo and redo replay the single-entry change rather than restoring a snapshot, so a friend's concurrent sightings survive. */
export const sightOps = {
  sight(pin, from, bearing) {
    const old = pin.sightings?.find(s => s.from === from);
    if (old && old.bearing === bearing) return null;
    const prev = old?.bearing;
    const inverse = old ? { type: 'pin.sight', id: pin.id, from, bearing: prev } : { type: 'pin.unsight', id: pin.id, from };
    applySighting(pin, from, bearing);
    return { label: 'sight', ops: [{ type: 'pin.sight', id: pin.id, from, bearing }], inverseOps: [inverse], undo: () => applySighting(pin, from, prev), redo: () => applySighting(pin, from, bearing) };
  },
  unsight(pin, from) {
    const old = pin.sightings?.find(s => s.from === from); if (!old) return null;
    const prev = old.bearing;
    applySighting(pin, from, undefined);
    return { label: 'unsight', ops: [{ type: 'pin.unsight', id: pin.id, from }], inverseOps: [{ type: 'pin.sight', id: pin.id, from, bearing: prev }], undo: () => applySighting(pin, from, prev), redo: () => applySighting(pin, from, undefined) };
  },
};
