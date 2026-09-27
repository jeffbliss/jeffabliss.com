#!/usr/bin/env node
// Turns a Valheim 1.0 world folder into a mapper document: the cartography table's explored area as cleared fog
// and its pins as mapper pins, shifted so the start temple sits on the mapper's START.
//   node scripts/import-world.mjs [saveDir=import/savegame] [out=import/world.json]
import { readFileSync, readdirSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
import { stableHash, readChunk, chunkNames, decodeMapData, exploredToFog, toMapperPin } from './lib/valheimsave.mjs';
import { encodeGray, toBase64 } from '../web/png.js';
import { SAVE_VERSION } from '../web/store.js';
import { CELLS } from '../web/world.js';

const saveDir = process.argv[2] ?? 'import/savegame', out = process.argv[3] ?? 'import/world.json';
const TABLE = stableHash('piece_cartographytable'), DATA = stableHash('data');
const LOCATION_PROXY = stableHash('LocationProxy'), LOCATION_KEY = stableHash('location'), START_TEMPLE = stableHash('StartTemple');
// Placed locations worth a pin once their zone has been generated (a player came within a couple of zones).
const LOCATION_PINS = { Vendor_BlackForest: { type: 'trader', name: 'Haldor' } };
const LOCATION_HASHES = new Map(Object.entries(LOCATION_PINS).map(([k, v]) => [stableHash(k), { key: k, ...v }]));

const indexes = readdirSync(saveDir).filter(f => /^_main\.\d+\.chunks$/.test(f)).sort((a, b) => Number(a.split('.')[1]) - Number(b.split('.')[1]));
if (!indexes.length) { console.error(`no _main.N.chunks index in ${saveDir}`); process.exit(1); }
const index = indexes[indexes.length - 1], names = chunkNames(readFileSync(join(saveDir, index)));

let records = 0, temple = null; const tables = [], located = [];
for (const name of names) {
  for (const r of readChunk(new Uint8Array(readFileSync(join(saveDir, name))))) {
    records++;
    if (r.prefab === TABLE && r.bytes.has(DATA)) tables.push(r);
    if (r.prefab === LOCATION_PROXY) {
      const loc = r.ints.get(LOCATION_KEY) >>> 0;
      if (loc === START_TEMPLE) temple = r;
      const known = LOCATION_HASHES.get(loc); if (known) located.push({ ...known, x: r.x, z: r.z });
    }
  }
}
const dx = temple ? -temple.x : 0, dz = temple ? -temple.z : 0;
console.log(`${index}: ${names.length} chunks, ${records} records, ${tables.length} cartography table(s), temple ${temple ? `at (${temple.x.toFixed(1)}, ${temple.z.toFixed(1)})` : 'not found'} → shift (${dx.toFixed(1)}, ${dz.toFixed(1)})`);

let fog = new Uint8Array(CELLS * CELLS), exploredPixels = 0, marked = 0; const pins = new Map();
for (const t of tables) {
  const m = decodeMapData(t.bytes.get(DATA));
  for (const v of m.explored) if (v) exploredPixels++;
  ({ fog, marked } = exploredToFog(m.explored, m.texture, { dx, dz, fog }));
  for (const p of m.pins) { const mp = toMapperPin(p, { dx, dz }); pins.set(mp.id, mp); }
}
for (const l of located) { const x = +(l.x + dx).toFixed(1), z = +(l.z + dz).toFixed(1); pins.set(`loc-${l.key}-${x}-${z}`, { id: `loc-${l.key}-${x}-${z}`, x, z, type: l.type, name: l.name, checked: false }); }
const pinList = [...pins.values()].sort((a, b) => a.id.localeCompare(b.id));
const doc = {
  version: SAVE_VERSION,
  terrain: toBase64(await encodeGray(new Uint8Array(CELLS * CELLS), CELLS, CELLS)),
  fog: toBase64(await encodeGray(fog, CELLS, CELLS)),
  ink: [], pins: pinList, settings: { layers: {}, camera: { x: 0, z: 0, scale: 0.04 } },
};
writeFileSync(out, JSON.stringify(doc, null, 0) + '\n');
writeFileSync(out.replace(/\.json$/, '') + '.meta.json', JSON.stringify({ shift: { dx: +dx.toFixed(2), dz: +dz.toFixed(2) }, index, records, tables: tables.length, exploredPixels, fogCells: marked }) + '\n');
console.log(`${exploredPixels} explored pixels → ${marked} fog cells revealed; ${pinList.length} pins: ${pinList.map(p => `${p.name} (${p.x}, ${p.z})`).join(', ') || 'none'}`);
console.log(`wrote ${out}`);
