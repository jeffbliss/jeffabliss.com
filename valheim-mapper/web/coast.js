// Coast: bakes the checked shore pins into one smooth ink stroke, ordered clockwise around spawn.
export const COAST = { color: '#3b7dbf', width: 4, step: 8 };

/** Bearing from spawn in degrees, clockwise from north (+z), in [0, 360). */
const bearingFrom = (sx, sz, p) => { const d = Math.atan2(p.x - sx, p.z - sz) * 180 / Math.PI; return (d + 360) % 360; };

/** Checked, tagged, non-fixed pins sorted by bearing from the fixed start pin (or the origin). */
export function shorePins(pins) {
  const spawn = pins.find(p => p.fixed) ?? { x: 0, z: 0 };
  return pins.filter(p => p.shore && p.checked && !p.fixed)
    .map(p => [bearingFrom(spawn.x, spawn.z, p), p]).sort((a, b) => a[0] - b[0]).map(([, p]) => p);
}

/** Uniform Catmull-Rom through `points`, sampled about every `step` metres; ends are clamped by duplicating the end points. */
export function catmullRom(points, step) {
  if (points.length < 2) return points.map(p => [...p]);
  const P = [points[0], ...points, points[points.length - 1]], out = [];
  for (let i = 1; i < P.length - 2; i++) {
    const [p0, p1, p2, p3] = [P[i - 1], P[i], P[i + 1], P[i + 2]];
    const n = Math.max(1, Math.ceil(Math.hypot(p2[0] - p1[0], p2[1] - p1[1]) / step));
    for (let k = 0; k < n; k++) {
      const t = k / n, t2 = t * t, t3 = t2 * t;
      const f = (a, b, c, d) => 0.5 * (2 * b + (-a + c) * t + (2 * a - 5 * b + 4 * c - d) * t2 + (-a + 3 * b - 3 * c + d) * t3);
      out.push([f(p0[0], p1[0], p2[0], p3[0]), f(p0[1], p1[1], p2[1], p3[1])]);
    }
  }
  out.push([...points[points.length - 1]]);
  return out;
}

/** One undoable, synced ink stroke through the shore pins, or null when there are fewer than two. */
export function coastCommand(app) {
  const pins = shorePins(app.state.pins); if (pins.length < 2) return null;
  const points = catmullRom(pins.map(p => [p.x, p.z]), COAST.step).map(([x, z]) => [+x.toFixed(1), +z.toFixed(1)]);
  const stroke = { id: crypto.randomUUID(), color: COAST.color, width: COAST.width, points };
  const ink = app.state.ink; ink.push(stroke);
  return { label: 'coast', ops: [{ type: 'ink.add', stroke }], inverseOps: [{ type: 'ink.remove', id: stroke.id }],
    undo: () => { const i = ink.indexOf(stroke); if (i >= 0) ink.splice(i, 1); }, redo: () => ink.push(stroke) };
}
