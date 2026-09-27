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

const indexes = readdirSync(saveDir).filter(f => /^_main\.\d+\.chunks$/.test(f)).sort((a, b) => Number(a.split('.')[1]) - Number(b.split('.')[1]));
if (!indexes.length) { console.error(`no _main.N.chunks index in ${saveDir}`); process.exit(1); }
const index = indexes[indexes.length - 1], names = chunkNames(readFileSync(join(saveDir, index)));

let records = 0, temple = null; const tables = [];
for (const name of names) {
  for (const r of readChunk(new Uint8Array(readFileSync(join(saveDir, name))))) {
    records++;
    if (r.prefab === TABLE && r.bytes.has(DATA)) tables.push(r);
    if (r.prefab === LOCATION_PROXY && (r.ints.get(LOCATION_KEY) >>> 0) === START_TEMPLE) temple = r;
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
const pinList = [...pins.values()].sort((a, b) => a.id.localeCompare(b.id));
const doc = {
  version: SAVE_VERSION,
  terrain: toBase64(await encodeGray(new Uint8Array(CELLS * CELLS), CELLS, CELLS)),
  fog: toBase64(await encodeGray(fog, CELLS, CELLS)),
  ink: [], pins: pinList, settings: { layers: {}, camera: { x: 0, z: 0, scale: 0.04 } },
};
writeFileSync(out, JSON.stringify(doc, null, 0) + '\n');
console.log(`${exploredPixels} explored pixels → ${marked} fog cells revealed; ${pinList.length} pins: ${pinList.map(p => `${p.name} (${p.x}, ${p.z})`).join(', ') || 'none'}`);
console.log(`wrote ${out}`);
