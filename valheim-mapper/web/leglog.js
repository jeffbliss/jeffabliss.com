// Leg log: dead reckoning from a known point. Each leg is a bearing, a duration and a gait; the app turns the
// log into a path (ink) and an end pin whose name carries the accumulated position error.
import { SPEEDS, JOG_MPS } from './world.js';
import { combine } from './history.js';
import { nearestPin } from './pins.js';

/** 16-point compass, clockwise from north. Bearings: 0° = north (+z), 90° = east (+x). */
const POINTS = ['N', 'NNE', 'NE', 'ENE', 'E', 'ESE', 'SE', 'SSE', 'S', 'SSW', 'SW', 'WSW', 'W', 'WNW', 'NW', 'NNW'];
const GAITS = Object.fromEntries(SPEEDS.map(s => [s.name.toLowerCase(), s.mps]));

/** Per-leg position error: a slice of the distance for speed/heading slop plus a flat start/stop allowance. */
export const legError = metres => 0.08 * metres + 8;

export function parseBearing(tok) {
  const t = tok.toUpperCase(), i = POINTS.indexOf(t);
  if (i >= 0) return i * 22.5;
  const deg = Number(t.replace(/°$/, ''));
  return t !== '' && Number.isFinite(deg) ? ((deg % 360) + 360) % 360 : null;
}
/** "40", "40s", "2m", "1m30", "1m30s", "1:30" → seconds. */
export function parseDuration(tok) {
  const t = tok.toLowerCase();
  let m = t.match(/^(\d+(?:\.\d+)?)s?$/); if (m) return Number(m[1]);
  m = t.match(/^(\d+)m(?:(\d+)s?)?$/) ?? t.match(/^(\d+):(\d{1,2})$/); if (m) return Number(m[1]) * 60 + Number(m[2] ?? 0);
  return null;
}
/** "jog" | "sprint" | "walk" | "swim" | "6" | "6m/s" → m/s. */
export function parseGait(tok) {
  const t = tok.toLowerCase();
  if (t in GAITS) return GAITS[t];
  const n = Number(t.replace(/m\/?s$/, '')); return t !== '' && Number.isFinite(n) && n > 0 ? n : null;
}

/**
 * Parses a log, one leg per line or comma: `<bearing> <duration> [gait]`, e.g. `NE 40 jog`, `120 1m30 sprint`, `E 25`.
 * Blank lines and `#` comments are skipped. Returns { legs: [{bearing, seconds, mps, metres}], errors: ['line 2: …'] }.
 */
export function parseLegs(text) {
  const legs = [], errors = [];
  text.split(/[\n,;]+/).forEach((raw, n) => {
    const line = raw.replace(/#.*$/, '').trim(); if (!line) return;
    const [b, d, g = 'jog', ...rest] = line.split(/\s+/);
    const bearing = parseBearing(b), seconds = d === undefined ? null : parseDuration(d), mps = parseGait(g);
    if (bearing === null) errors.push(`line ${n + 1}: bearing "${b}" (use N, NE, ENE… or degrees)`);
    else if (seconds === null) errors.push(`line ${n + 1}: duration "${d ?? ''}" (seconds, 2m, 1m30)`);
    else if (mps === null) errors.push(`line ${n + 1}: gait "${g}" (walk, jog, sprint, swim or m/s)`);
    else if (rest.length) errors.push(`line ${n + 1}: unexpected "${rest.join(' ')}"`);
    else legs.push({ bearing, seconds, mps, metres: seconds * mps });
  });
  return { legs, errors };
}

/** Walks the legs from (x, z): returns { points: [[x,z]…] incl. start, end: [x,z], metres, seconds, error } */
export function walkLegs(x, z, legs) {
  const points = [[x, z]]; let metres = 0, seconds = 0, error = 0;
  for (const l of legs) {
    const a = l.bearing * Math.PI / 180; x += l.metres * Math.sin(a); z += l.metres * Math.cos(a);
    points.push([x, z]); metres += l.metres; seconds += l.seconds; error += legError(l.metres);
  }
  return { points, end: [x, z], metres, seconds, error: Math.round(error) };
}

/**
 * Commits a walked log: the path as ink, a pin at the end named with the error, fog revealed along the path.
 * (The uncertainty circle is preview-only: ink renders under the fog, so a persisted ring would be hidden anyway.)
 * One undo step; syncs as ordinary ops.
 */
export function logCommand(app, walk, { color, revealInk }) {
  const { state } = app;
  const path = { id: crypto.randomUUID(), color, width: 4, points: walk.points.map(([x, z]) => [+x.toFixed(1), +z.toFixed(1)]) };
  const pin = { id: crypto.randomUUID(), x: +walk.end[0].toFixed(1), z: +walk.end[1].toFixed(1), type: 'pin', name: `log end ±${walk.error} m`, checked: false };
  const strokes = [path];
  const ink = { ops: strokes.map(s => ({ type: 'ink.add', stroke: s })), inverseOps: strokes.map(s => ({ type: 'ink.remove', id: s.id })),
    undo: () => { for (const s of strokes) { const i = state.ink.indexOf(s); if (i >= 0) state.ink.splice(i, 1); } }, redo: () => state.ink.push(...strokes) };
  const pins = { ops: [{ type: 'pin.add', pin }], inverseOps: [{ type: 'pin.remove', id: pin.id }],
    undo: () => { const i = state.pins.indexOf(pin); if (i >= 0) state.pins.splice(i, 1); }, redo: () => state.pins.push(pin) };
  ink.redo(); pins.redo();
  return combine('leg log', ink, pins, revealInk?.(path));
}

/**
 * The Log tool: click sets the start (snapping to a pin under the cursor); the sidebar text is parsed live and
 * previewed on the overlay; `place()` commits. `panel` = { text(), setSummary(html), setStart(text) }.
 */
export function logTool(app, panel, { revealInk = null } = {}) {
  const tool = { start: null, walk: null, errors: [] };
  const snapTo = (wx, wz) => nearestPin(app.state.pins, wx, wz, 14 * app.dpr() / app.view.scale);
  tool.update = () => {
    const { legs, errors } = parseLegs(panel.text());
    tool.errors = errors; tool.walk = tool.start && legs.length ? walkLegs(tool.start.x, tool.start.z, legs) : null;
    const w = tool.walk, gait = m => m >= 1000 ? `${(m / 1000).toFixed(1)} km` : `${Math.round(m)} m`;
    panel.setSummary(!tool.start ? 'Click the map (or a pin) to set the start.' : errors.length ? errors.join('\n')
      : !w ? 'One leg per line: bearing, seconds, gait — e.g. NE 40 jog' : `${legs.length} leg${legs.length === 1 ? '' : 's'}, ${gait(w.metres)} in ${Math.round(w.seconds)} s · end ±${w.error} m`);
    panel.setStart(tool.start ? (tool.start.name || `${Math.round(tool.start.x)}, ${Math.round(tool.start.z)}`) : '—');
    app.requestRender();
  };
  tool.place = () => {
    if (!tool.walk || tool.errors.length) return false;
    const cmd = logCommand(app, tool.walk, { color: app.tools.options.inkColor, revealInk });
    app.history.push(cmd); app.markDirty();
    tool.start = { x: tool.walk.end[0], z: tool.walk.end[1], name: `log end ±${tool.walk.error} m` };   // chain the next log from here
    panel.clear?.(); tool.update();
    return true;
  };
  tool.down = (e, wx, wz) => { const hit = snapTo(wx, wz); tool.start = hit ? { x: hit.x, z: hit.z, name: hit.name || hit.type } : { x: wx, z: wz, name: '' }; tool.update(); };
  tool.cursor = (ctx, view, w, h) => {
    if (!tool.start) return;
    const dpr = app.dpr(), P = (x, z) => view.worldToScreen(x, z, w, h);
    const [sx, sy] = P(tool.start.x, tool.start.z);
    ctx.setLineDash([]); ctx.strokeStyle = '#ffd77a'; ctx.lineWidth = 2 * dpr;
    ctx.beginPath(); ctx.arc(sx, sy, 6 * dpr, 0, Math.PI * 2); ctx.stroke();
    if (!tool.walk) return;
    ctx.setLineDash([6 * dpr, 4 * dpr]); ctx.beginPath();
    tool.walk.points.forEach(([x, z], i) => { const [px, py] = P(x, z); i ? ctx.lineTo(px, py) : ctx.moveTo(px, py); }); ctx.stroke();
    const [ex, ey] = P(...tool.walk.end); ctx.beginPath(); ctx.arc(ex, ey, Math.max(tool.walk.error, 8) * view.scale, 0, Math.PI * 2); ctx.stroke(); ctx.setLineDash([]);
  };
  return tool;
}

export { JOG_MPS };
