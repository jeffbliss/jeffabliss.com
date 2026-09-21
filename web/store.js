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

export async function createState(doc = emptyDoc()) {
  if (doc.version !== SAVE_VERSION) throw new Error(`unsupported save version ${doc.version}`);
  const base = emptyDoc();
  return {
    terrain: await rasterFrom(doc.terrain),
    fog: await rasterFrom(doc.fog),
    ink: structuredClone(doc.ink ?? []),
    pins: structuredClone(doc.pins ?? []),
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
      const doc = await res.json(); return doc?.version ? doc : emptyDoc();
    } catch { return local.get() ?? emptyDoc(); }
  }

  async function save(doc) {
    local.set(doc);
    for (let attempt = 0; ; attempt++) {
      onStatus('saving');
      try {
        const res = await fetchFn(url, { method: 'PUT', headers: { 'content-type': 'application/json' }, body: JSON.stringify(doc) });
        if (!res.ok) throw new Error(`HTTP ${res.status}`);
        onStatus('saved'); return;
      } catch {
        onStatus('error');
        await new Promise(r => setTimeout(r, Math.min(retryMs * 2 ** attempt, 60_000)));
      }
    }
  }

  function schedule(getDoc) {
    pending = getDoc; onStatus('dirty');
    clearTimeout(timer); timer = setTimeout(flush, debounceMs);
  }
  async function flush() {
    clearTimeout(timer);
    if (inflight) await inflight;
    if (!pending) return;
    const getDoc = pending; pending = null;
    inflight = (async () => save(await getDoc()))();
    await inflight; inflight = null;
    if (pending) await flush();
  }
  return { load, save, schedule, flush };
}
