import { nearestPin, pinOps } from './pins.js';
import { combine, createStrokeRecorder } from './history.js';
import { ZONE_M } from './world.js';

/** The chain of logs ending at `end`, oldest first, by following log.from. Empty when `end` has no log. */
export function chainFor(pins, end) {
  const byId = new Map(pins.map(p => [p.id, p]));
  const chain = [], seen = new Set();
  for (let p = end; p?.log && !seen.has(p.id); p = p.log.from ? byId.get(p.log.from) : null) { seen.add(p.id); chain.unshift(p); }
  return chain;
}

/** The chain's route as one polyline: each log's ink stroke where it still exists, else the straight line start → pin. */
export function chainRoute(chain, ink) {
  const pts = [];
  const push = ([x, z]) => { const l = pts[pts.length - 1]; if (!l || l[0] !== x || l[1] !== z) pts.push([x, z]); };
  for (const p of chain) {
    const s = ink.find(st => st.id === p.log.ink);
    for (const q of s ? s.points : [p.log.start, [p.x, p.z]]) push(q);
  }
  return pts;
}

/** Error the chain claims at its end: the last pin's "±N m" name, or 0. */
export function chainError(chain) { const m = /±\s*(\d+)/.exec(chain[chain.length - 1]?.name ?? ''); return m ? Number(m[1]) : 0; }

/**
 * Displacement field for a correction (dx, dz) applied at the end of `route`: a point at arc fraction t of the
 * route, d metres from it, moves by w(d)·t·(dx, dz) with w = 1 inside `radius`, fading to 0 at 2·radius.
 */
export function createField(route, dx, dz, radius) {
  const cum = [0];
  for (let i = 1; i < route.length; i++) cum.push(cum[i - 1] + Math.hypot(route[i][0] - route[i - 1][0], route[i][1] - route[i - 1][1]));
  const total = cum[cum.length - 1] || 1;
  return (x, z) => {
    let best = Infinity, t = 0;
    if (route.length === 1) { best = Math.hypot(x - route[0][0], z - route[0][1]); t = 1; }
    for (let i = 1; i < route.length; i++) {
      const [ax, az] = route[i - 1], [bx, bz] = route[i], vx = bx - ax, vz = bz - az, len2 = vx * vx + vz * vz;
      const u = len2 ? Math.max(0, Math.min(1, ((x - ax) * vx + (z - az) * vz) / len2)) : 0;
      const d = Math.hypot(x - (ax + u * vx), z - (az + u * vz));
      if (d < best) { best = d; t = (cum[i - 1] + u * (cum[i] - cum[i - 1])) / total; }
    }
    const w = best <= radius ? 1 : best >= 2 * radius ? 0 : 1 - (best - radius) / radius;
    const k = w * t;
    return k ? [k * dx, k * dz] : null;
  };
}

/** Cell rect covering `route` grown by `pad` metres, clamped to the raster. */
export function routeRect(raster, route, pad) {
  let x0 = Infinity, z0 = Infinity, x1 = -Infinity, z1 = -Infinity;
  for (const [x, z] of route) { x0 = Math.min(x0, x); z0 = Math.min(z0, z); x1 = Math.max(x1, x); z1 = Math.max(z1, z); }
  const c = n => Math.max(0, Math.min(raster.cells - 1, n));
  const [ax, az] = raster.toCell(x0 - pad, z0 - pad), [bx, bz] = raster.toCell(x1 + pad, z1 + pad);
  return { x0: c(ax), z0: c(az), x1: c(bx), z1: c(bz) };
}

/** Moves the raster's cells inside `rect` by `field`, nearest-neighbour: a cell takes the value from where it came from. */
export function warpRaster(raster, field, rect) {
  const w = rect.x1 - rect.x0 + 1, h = rect.z1 - rect.z0 + 1, src = raster.snapshot(rect);
  const at = (cx, cz) => { const lx = cx - rect.x0, lz = cz - rect.z0; return lx >= 0 && lz >= 0 && lx < w && lz < h ? src[lz * w + lx] : raster.data[cz * raster.cells + cx] ?? 0; };
  let changed = false;
  for (let cz = rect.z0; cz <= rect.z1; cz++) for (let cx = rect.x0; cx <= rect.x1; cx++) {
    const [px, pz] = raster.cellCenter(cx, cz), d = field(px, pz); if (!d) continue;
    const [sx, sz] = raster.toCell(px - d[0], pz - d[1]);
    if (sx < 0 || sz < 0 || sx >= raster.cells || sz >= raster.cells) continue;
    const v = at(sx, sz), i = cz * raster.cells + cx;
    if (raster.data[i] !== v) { raster.data[i] = v; changed = true; }
  }
  if (changed) raster.markDirty(rect);
  return changed;
}

/** Corrects the chain ending at `end` so that pin lands on `target` = [x, z]. One undoable command, or null. */
export function correctionCommand(app, end, target) {
  const { state } = app;
  const chain = chainFor(state.pins, end); if (!chain.length) return null;
  const route = chainRoute(chain, state.ink);
  const dx = target[0] - end.x, dz = target[1] - end.z; if (!dx && !dz) return null;
  const radius = chainError(chain) + ZONE_M, field = createField(route, dx, dz, radius);
  const pad = 2 * radius + Math.hypot(dx, dz);

  const rasterCmd = (raster, layer) => { const rec = createStrokeRecorder(raster, layer); rec.begin(); warpRaster(raster, field, routeRect(raster, route, pad)); return rec.end(layer); };
  const terrain = rasterCmd(state.terrain, 'terrain'), fog = rasterCmd(state.fog, 'fog');

  const moved = [];
  for (const s of state.ink) {
    if (!s.points.some(([x, z]) => field(x, z))) continue;
    const after = { ...s, points: s.points.map(([x, z]) => { const d = field(x, z); return d ? [+(x + d[0]).toFixed(1), +(z + d[1]).toFixed(1)] : [x, z]; }) };
    moved.push({ before: s, after });
  }
  const swap = pick => { for (const m of moved) { const i = state.ink.findIndex(s => s.id === m.before.id); if (i >= 0) state.ink[i] = pick(m); } };
  const ink = moved.length ? { ops: moved.map(m => ({ type: 'ink.add', stroke: m.after })), inverseOps: moved.map(m => ({ type: 'ink.add', stroke: m.before })),
    undo: () => swap(m => m.before), redo: () => swap(m => m.after) } : null;

  const pinMoves = [];
  for (const p of state.pins) {
    if (p.fixed) continue;
    const d = p === end ? [dx, dz] : field(p.x, p.z); if (!d) continue;
    pinMoves.push({ pin: p, before: { x: p.x, z: p.z }, after: { x: +(p.x + d[0]).toFixed(1), z: +(p.z + d[1]).toFixed(1) } });
  }
  const apply = pick => { for (const m of pinMoves) Object.assign(m.pin, pick(m)); };
  const pins = pinMoves.length ? { ops: pinMoves.flatMap(m => pinOps.update(m.pin, m.after, m.before).ops), inverseOps: pinMoves.flatMap(m => pinOps.update(m.pin, m.after, m.before).inverseOps),
    undo: () => apply(m => m.before), redo: () => apply(m => m.after) } : null;
  ink?.redo(); pins?.redo();
  return combine('correct log', terrain, fog, ink, pins);
}

/** Wires the popup's Correct button: click it, then click where the pin really is (snapping to pins). */
export function wireCorrection(app, button) {
  let correcting = null, prevOverlay = null;
  const stop = () => { correcting = null; app.tools.intercept = null; app.tools.overlay = prevOverlay; app.toast(''); app.requestRender(); };
  const place = (e, wx, wz) => {
    if (!correcting || e.button !== 0) return false;
    const hit = nearestPin(app.state.pins.filter(p => p !== correcting), wx, wz, 14 * app.dpr() / app.view.scale);
    const cmd = correctionCommand(app, correcting, hit ? [hit.x, hit.z] : [wx, wz]);
    if (cmd) { app.history.push(cmd); app.markDirty(); }
    stop(); return true;
  };
  button.onclick = () => {
    const pin = app.state.pins.find(p => p.id === app.pinsLayer?.selected); if (!pin?.log) return;
    correcting = pin; app.tools.intercept = place; prevOverlay = app.tools.overlay;
    app.toast('Click where this pin really is (pins snap) · Esc cancels', 0);
    app.tools.overlay = (ctx, view, w, h) => {
      if (!app.tools.pointer) return; const [sx, sy, wx, wz] = app.tools.pointer, [px, py] = view.worldToScreen(pin.x, pin.z, w, h);
      ctx.save(); ctx.setLineDash([6, 4]); ctx.strokeStyle = '#fff'; ctx.lineWidth = 2; ctx.beginPath(); ctx.moveTo(px, py); ctx.lineTo(sx, sy); ctx.stroke(); ctx.restore();
      ctx.fillStyle = '#fff'; ctx.font = `${13 * app.dpr()}px 'Averia Serif', serif`; ctx.fillText(`${Math.round(Math.hypot(wx - pin.x, wz - pin.z))} m`, sx + 10, sy - 10);
    };
    app.requestRender();
  };
  addEventListener('keydown', e => { if (e.key === 'Escape' && correcting) stop(); });
  return { get active() { return !!correcting; } };
}
