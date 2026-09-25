// Authoritative map state and the rules for changing it. Pure: no storage, no sockets.
import { createRaster } from '../web/raster.js';
import { CELLS, PIN_TYPES, BIOMES } from '../web/world.js';
import { encodeGray, toBase64 } from '../web/png.js';
import { ensureStartPin, SAVE_VERSION } from '../web/store.js';
import { rectValid, rectArea, MAX_RECT_AREA } from '../web/proto.js';

export const TILE = 128, TILES = CELLS / TILE;
export const tileKey = (layer, tx, tz) => `${layer}:${tx}:${tz}`;
export const parseTileKey = k => { const [layer, tx, tz] = k.split(':').map(Number); return { layer, tx, tz }; };

export function tilesForRect(r) {
  const out = [];
  for (let tz = Math.floor(r.z0 / TILE); tz <= Math.floor(r.z1 / TILE); tz++) for (let tx = Math.floor(r.x0 / TILE); tx <= Math.floor(r.x1 / TILE); tx++) out.push({ tx, tz });
  return out;
}
export const tileBytes = (raster, tx, tz) => raster.snapshot({ x0: tx * TILE, z0: tz * TILE, x1: tx * TILE + TILE - 1, z1: tz * TILE + TILE - 1 });
export const putTile = (raster, tx, tz, bytes) => raster.restore({ x0: tx * TILE, z0: tz * TILE, x1: tx * TILE + TILE - 1, z1: tz * TILE + TILE - 1 }, bytes);

export function makeState() {
  const pins = new Map(); for (const p of ensureStartPin([])) pins.set(p.id, p);
  return { terrain: createRaster(), fog: createRaster(), ink: new Map(), pins };
}

const MAX_BIOME = BIOMES.length - 1, USER_PIN_TYPES = new Set(PIN_TYPES.filter(t => t !== 'start'));
const isId = v => typeof v === 'string' && v.length > 0 && v.length <= 64;
const isNum = v => typeof v === 'number' && Number.isFinite(v);
const isColor = v => typeof v === 'string' && /^#[0-9a-f]{6}$/i.test(v);

export { MAX_RECT_AREA };                        // the cap lives in proto.js: the client splits against the same number

export function validateRaster({ layer, rect, bytes }) {
  if (!(layer === 0 || layer === 1)) return 'bad layer';
  if (!rect || !rectValid(rect)) return 'bad rect';
  if (rectArea(rect) > MAX_RECT_AREA) return 'rect too large';
  if (!(bytes instanceof Uint8Array) || bytes.length !== rectArea(rect)) return 'bad length';
  if (layer === 0) for (let i = 0; i < bytes.length; i++) if (bytes[i] > MAX_BIOME) return 'bad biome id';
  return null;
}
/** A leg log stored on its end pin: where it started, the legs as typed, and the ink stroke it drew. */
function validateLog(l) {
  if (!l || typeof l !== 'object') return 'bad log';
  for (const k of Object.keys(l)) if (!['from', 'start', 'legs', 'ink'].includes(k)) return 'bad log key';
  if (l.from !== null && !isId(l.from)) return 'bad log from';
  if (!Array.isArray(l.start) || l.start.length !== 2 || !l.start.every(isNum)) return 'bad log start';
  if (typeof l.legs !== 'string' || l.legs.length === 0 || l.legs.length > 1000) return 'bad log legs';
  if (!isId(l.ink)) return 'bad log ink';
  return null;
}
const isBearing = b => isNum(b) && b >= 0 && b < 360 && Number.isInteger(b / 22.5);
/** Sightings stored on a target pin: compass-point bearings from other pins. */
function validateSightings(list, id) {
  if (!Array.isArray(list) || list.length > 32) return 'bad sightings';
  for (const s of list) {
    if (!s || typeof s !== 'object' || !isId(s.from) || s.from === id || !isBearing(s.bearing)) return 'bad sighting';
    for (const k of Object.keys(s)) if (!['from', 'bearing'].includes(k)) return 'bad sighting key';
  }
  if (new Set(list.map(s => s.from)).size !== list.length) return 'duplicate sighting from';
  return null;
}
/** A pin's sightings with `from` upserted (bearing given, replacing in place) or removed (bearing undefined); undefined when empty. */
function withSighting(pin, from, bearing) {
  const list = pin.sightings ?? [];
  if (bearing === undefined) { const next = list.filter(s => s.from !== from); return next.length ? next : undefined; }
  const i = list.findIndex(s => s.from === from);
  const next = i >= 0 ? list.map((s, idx) => idx === i ? { from, bearing } : s) : [...list, { from, bearing }];
  return next;
}

export function validateOp(op) {
  if (!op || typeof op !== 'object') return 'bad op';
  switch (op.type) {
    case 'ink.add': { const s = op.stroke;
      if (!s || !isId(s.id)) return 'bad id';
      if (!isNum(s.width) || s.width <= 0 || s.width > 512) return 'bad width';
      if (!Array.isArray(s.points) || s.points.length < 1 || s.points.length > 5000 || !s.points.every(p => Array.isArray(p) && p.length === 2 && p.every(isNum))) return 'bad points';
      if (!isColor(s.color)) return 'bad color';
      return null; }
    case 'ink.remove': return isId(op.id) ? null : 'bad id';
    case 'pin.add': { const p = op.pin;
      if (!p || !isId(p.id) || p.id === 'start') return 'bad id'; if (!USER_PIN_TYPES.has(p.type)) return 'bad type';
      if (!isNum(p.x) || !isNum(p.z)) return 'bad position'; if (typeof p.name !== 'string' || p.name.length > 40) return 'bad name';
      if (typeof p.checked !== 'boolean') return 'bad checked';
      if ('log' in p && p.log !== undefined) { const e = validateLog(p.log); if (e) return e; }
      if ('sightings' in p && p.sightings !== undefined) return validateSightings(p.sightings, p.id);
      return null; }
    case 'pin.update': { if (!isId(op.id)) return 'bad id'; if (op.id === 'start') return 'start pin is fixed';
      const p = op.patch; if (!p || typeof p !== 'object') return 'bad patch';
      for (const k of Object.keys(p)) if (!['name', 'checked', 'x', 'z'].includes(k)) return 'bad patch key';
      if ('name' in p && (typeof p.name !== 'string' || p.name.length > 40)) return 'bad name';
      if ('checked' in p && typeof p.checked !== 'boolean') return 'bad checked';
      if (('x' in p && !isNum(p.x)) || ('z' in p && !isNum(p.z))) return 'bad position'; return null; }
    case 'pin.remove': if (!isId(op.id)) return 'bad id'; return op.id === 'start' ? 'start pin is fixed' : null;
    case 'pin.sight': if (!isId(op.id)) return 'bad id'; if (!isId(op.from) || op.from === op.id) return 'bad from'; return isBearing(op.bearing) ? null : 'bad bearing';
    case 'pin.unsight': if (!isId(op.id)) return 'bad id'; return isId(op.from) ? null : 'bad from';
    default: return 'bad type';
  }
}

export function applyRaster(state, { layer, rect, bytes }) {
  const raster = layer === 0 ? state.terrain : state.fog;
  raster.restore(rect, bytes);
  return new Set(tilesForRect(rect).map(({ tx, tz }) => tileKey(layer, tx, tz)));
}
/** The rows `applyOp` would write, computed without touching `state`. Lets the caller persist before mutating memory. */
export function planOp(state, op) {
  const persist = [];
  switch (op.type) {
    case 'ink.add': { const s = { id: op.stroke.id, color: op.stroke.color, width: op.stroke.width, points: op.stroke.points }; persist.push({ table: 'ink', id: s.id, json: JSON.stringify(s) }); break; }
    case 'ink.remove': if (state.ink.has(op.id)) persist.push({ table: 'ink', id: op.id, json: null }); break;
    case 'pin.add': { const p = { id: op.pin.id, x: op.pin.x, z: op.pin.z, type: op.pin.type, name: op.pin.name, checked: op.pin.checked, ...(op.pin.log ? { log: op.pin.log } : {}), ...(op.pin.sightings?.length ? { sightings: op.pin.sightings } : {}) }; persist.push({ table: 'pins', id: p.id, json: JSON.stringify(p) }); break; }
    case 'pin.update': { const p = state.pins.get(op.id); if (p) persist.push({ table: 'pins', id: p.id, json: JSON.stringify({ ...p, ...op.patch }) }); break; }
    case 'pin.remove': if (state.pins.has(op.id)) persist.push({ table: 'pins', id: op.id, json: null }); break;
    case 'pin.sight': case 'pin.unsight': { const p = state.pins.get(op.id); if (!p) break;
      const { sightings: _, ...rest } = p, next = withSighting(p, op.from, op.type === 'pin.sight' ? op.bearing : undefined);
      persist.push({ table: 'pins', id: p.id, json: JSON.stringify(next ? { ...rest, sightings: next } : rest) }); break; }
  }
  return { persist };
}
export function applyOp(state, op) {
  const { persist } = planOp(state, op);
  switch (op.type) {
    case 'ink.add': { const s = { id: op.stroke.id, color: op.stroke.color, width: op.stroke.width, points: op.stroke.points }; state.ink.set(s.id, s); break; }
    case 'ink.remove': state.ink.delete(op.id); break;
    case 'pin.add': { const p = { id: op.pin.id, x: op.pin.x, z: op.pin.z, type: op.pin.type, name: op.pin.name, checked: op.pin.checked, ...(op.pin.log ? { log: op.pin.log } : {}), ...(op.pin.sightings?.length ? { sightings: op.pin.sightings } : {}) }; state.pins.set(p.id, p); break; }
    case 'pin.update': { const p = state.pins.get(op.id); if (p) Object.assign(p, op.patch); break; }
    case 'pin.remove': state.pins.delete(op.id); break;
    case 'pin.sight': case 'pin.unsight': { const p = state.pins.get(op.id); if (!p) break;
      const next = withSighting(p, op.from, op.type === 'pin.sight' ? op.bearing : undefined);
      if (next) p.sightings = next; else delete p.sightings; break; }
  }
  return { persist };
}

export async function snapshotDoc(state) {
  const enc = async r => toBase64(await encodeGray(r.data, r.cells, r.cells));
  return { version: SAVE_VERSION, terrain: await enc(state.terrain), fog: await enc(state.fog), ink: [...state.ink.values()], pins: [...state.pins.values()] };
}
