import { encodeGray, decodeGray, toBase64, fromBase64 } from './png.js';
import { createRaster } from './raster.js';
import { CELLS, ZONE_M } from './world.js';

export const SAVE_VERSION = 1;

export function emptyDoc() {
  return {
    version: SAVE_VERSION, terrain: null, fog: null, ink: [], pins: [],
    settings: { grid: { visible: true, spacing: ZONE_M }, layers: {}, camera: { x: 0, z: 0, scale: 0.04 } },
  };
}

async function rasterFrom(b64) {
  if (!b64) return createRaster();
  const { data, width, height } = await decodeGray(fromBase64(b64));
  if (width !== CELLS || height !== CELLS) throw new Error(`raster is ${width}x${height}, expected ${CELLS}`);
  return createRaster({ data });
}
const rasterTo = async r => toBase64(await encodeGray(r.data, r.cells, r.cells));

/** The spawn marker: fixed at the world centre like the in-game start pin. Added to any pin list that lacks one. */
export function ensureStartPin(pins) {
  const rest = pins.filter(p => p.type !== 'start');           // drop any hand-placed or moved start pins
  pins.length = 0;
  pins.push({ id: 'start', x: 0, z: 0, type: 'start', name: '', checked: false, fixed: true }, ...rest);
  return pins;
}

export async function createState(doc = emptyDoc()) {
  if (doc.version !== SAVE_VERSION) throw new Error(`unsupported save version ${doc.version}`);
  const base = emptyDoc();
  return {
    terrain: await rasterFrom(doc.terrain),
    fog: await rasterFrom(doc.fog),
    ink: structuredClone(doc.ink ?? []),
    pins: ensureStartPin(structuredClone(doc.pins ?? [])),
    settings: { ...base.settings, ...doc.settings, grid: { ...base.settings.grid, ...doc.settings?.grid } },
  };
}

export async function serialize(state) {
  return {
    version: SAVE_VERSION,
    terrain: await rasterTo(state.terrain), fog: await rasterTo(state.fog),
    ink: state.ink, pins: state.pins, settings: state.settings,
  };
}
