import { encodeGray, decodeGray, toBase64, fromBase64 } from './png.js';
import { createRaster } from './raster.js';
import { CELLS, ZONE_M } from './world.js';

export const SAVE_VERSION = 1;
const LS_KEY = 'valheim-mapper:map';

export function emptyDoc() {
  return {
    version: SAVE_VERSION, terrain: null, fog: null, ink: [], pins: [],
    player: { x: 0, z: 0, angle: 0 },
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
    player: { ...base.player, ...doc.player },
    settings: { ...base.settings, ...doc.settings, grid: { ...base.settings.grid, ...doc.settings?.grid } },
  };
}

export async function serialize(state) {
  return {
    version: SAVE_VERSION,
    terrain: await rasterTo(state.terrain), fog: await rasterTo(state.fog),
    ink: state.ink, pins: state.pins, player: state.player, settings: state.settings,
  };
}

export function createStoreClient({ url = '/api/map', fetchFn = globalThis.fetch, storage = globalThis.localStorage,
  debounceMs = 2000, retryMs = 3000, onStatus = () => {} } = {}) {
  let timer = null, pending = null, inflight = null;
  const local = { get: () => { try { return JSON.parse(storage?.getItem(LS_KEY)); } catch { return null; } },
                  set: doc => { try { storage?.setItem(LS_KEY, JSON.stringify(doc)); } catch { /* quota / private mode */ } } };

  async function load() {
    try {
      const res = await fetchFn(url); if (!res.ok) throw new Error(res.status);
      if (res.status === 204) return emptyDoc();
      const doc = await res.json(); return doc?.version ? doc : emptyDoc();
    } catch { return local.get() ?? emptyDoc(); }
  }

  async function save(doc, { maxAttempts = Infinity } = {}) {
    local.set(doc);
    for (let attempt = 0; attempt < maxAttempts; attempt++) {
      onStatus('saving');
      try {
        const res = await fetchFn(url, { method: 'PUT', headers: { 'content-type': 'application/json' }, body: JSON.stringify(doc) });
        if (!res.ok) throw new Error(`HTTP ${res.status}`);
        onStatus('saved'); return true;
      } catch {
        onStatus('error');
        if (attempt + 1 >= maxAttempts) return false;
        await new Promise(r => setTimeout(r, Math.min(retryMs * 2 ** attempt, 60_000)));
      }
    }
    return false;
  }

  function schedule(getDoc) {
    pending = getDoc; onStatus('dirty');
    clearTimeout(timer); timer = setTimeout(flush, debounceMs);
  }
  async function flush({ maxAttempts } = {}) {
    clearTimeout(timer);
    if (inflight) await inflight;
    if (!pending) return true;
    const getDoc = pending; pending = null;
    let ok;
    inflight = (async () => { ok = await save(await getDoc(), { maxAttempts }); })();
    await inflight; inflight = null;
    if (pending) return flush({ maxAttempts });
    return ok;
  }
  return { load, save, schedule, flush };
}
