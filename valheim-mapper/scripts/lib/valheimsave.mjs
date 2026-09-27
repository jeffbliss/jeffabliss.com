// Readers for Valheim 1.0 chunked world saves: ZDO records, the cartography table's map package, and the
// conversion of its explored pixels onto the mapper's fog grid. Pure functions; the CLI in ../import-world.mjs
// does the file handling. Format notes: docs/superpowers/specs/2026-09-27-world-import-design.md.
import { gunzipSync } from 'node:zlib';
import { CELLS, CELL_M } from '../../web/world.js';

/** Valheim's StableHashCode: two DJB2 accumulators over even and odd characters. */
export function stableHash(s) {
  let h1 = 5381, h2 = 5381;
  for (let i = 0; i < s.length; i++) {
    const c = s.charCodeAt(i);
    if (i % 2 === 0) h1 = (((h1 << 5) + h1) ^ c) >>> 0; else h2 = (((h2 << 5) + h2) ^ c) >>> 0;
  }
  return (h1 + Math.imul(h2, 1566083941)) >>> 0;
}

const FLAG = { conn: 1 << 0, floats: 1 << 1, vec3s: 1 << 2, quats: 1 << 3, ints: 1 << 4, longs: 1 << 5, strings: 1 << 6, bytes: 1 << 7, rotation: 1 << 12, shortPos: 1 << 13 };
const SEGMENTS = [['floats', FLAG.floats, 4], ['vec3s', FLAG.vec3s, 12], ['quats', FLAG.quats, 16], ['ints', FLAG.ints, 4], ['longs', FLAG.longs, 8], ['strings', FLAG.strings, 0], ['bytes', FLAG.bytes, 0]];

/** Variable-length count: 7 bits per byte, high bit continues (C# BinaryWriter 7-bit int). */
export function readVarint(view, p) {
  let n = 0, shift = 0, c;
  do { c = view.getUint8(p++); n |= (c & 127) << shift; shift += 7; } while (c & 128);
  return [n, p];
}

/**
 * Decodes the ZDO record at byte offset p. Returns { next, flags, x, y, z, prefab, ints, bytes, longs } where
 * ints/longs/bytes are Maps from field hash to value (ints as int32, longs as BigInt, bytes as Uint8Array).
 * Strings are kept as text; floats, vec3s and quats are skipped, since nothing here needs them.
 */
export function readRecord(u8, p) {
  const view = new DataView(u8.buffer, u8.byteOffset, u8.byteLength);
  const flags = view.getUint16(p, true); p += 2;
  let x, y = 0, z;
  if (flags & FLAG.shortPos) { x = view.getInt16(p, true); z = view.getInt16(p + 2, true); p += 4; }
  else { x = view.getFloat32(p, true); y = view.getFloat32(p + 4, true); z = view.getFloat32(p + 8, true); p += 12; }
  const prefab = view.getUint32(p, true); p += 4;
  if (flags & FLAG.rotation) { p += 2; if (!(view.getUint8(p - 1) & 0x80)) p += 2; }
  if (flags & FLAG.conn) p += 5;
  const ints = new Map(), longs = new Map(), bytes = new Map(), strings = new Map();
  for (const [name, bit, size] of SEGMENTS) {
    if (!(flags & bit)) continue;
    let count; [count, p] = readVarint(view, p);
    for (let i = 0; i < count; i++) {
      const key = view.getUint32(p, true); p += 4;
      if (name === 'strings') { let len; [len, p] = readVarint(view, p); strings.set(key, new TextDecoder().decode(u8.subarray(p, p + len))); p += len; }
      else if (name === 'bytes') { const len = view.getInt32(p, true); p += 4; bytes.set(key, u8.subarray(p, p + len)); p += len; }
      else { if (name === 'ints') ints.set(key, view.getInt32(p, true)); if (name === 'longs') longs.set(key, view.getBigInt64(p, true)); p += size; }
    }
  }
  return { next: p, flags, x, y, z, prefab, ints, longs, bytes, strings };
}

/** Every record of one chunk file: `[u16 version][u32 count]` then the records. Throws if the count does not use the whole file. */
export function readChunk(u8) {
  const view = new DataView(u8.buffer, u8.byteOffset, u8.byteLength);
  const count = view.getUint32(2, true), out = [];
  let p = 6;
  for (let i = 0; i < count; i++) { const r = readRecord(u8, p); out.push(r); p = r.next; }
  if (p !== u8.length) throw new Error(`chunk: ${u8.length - p} bytes left after ${count} records`);
  return out;
}

/** Chunk file names listed by a `_main.N.chunks` index. */
export function chunkNames(u8) {
  const view = new DataView(u8.buffer, u8.byteOffset, u8.byteLength);
  const n = view.getUint32(6, true), names = [];
  for (let k = 0; k < n; k++) {
    const off = 10 + k * 11, y = u8[off], x = u8[off + 1], gen = u8[off + 2], sv = view.getInt32(off + 3, true);
    names.push(`${x.toString(16).padStart(2, '0')}_${y.toString(16).padStart(2, '0')}__${gen}_${sv}.chunk`);
  }
  return names;
}

export const MAP_TEXTURE = 2048, MAP_PIXEL_M = 12;

/** Reads a string: varint length then UTF-8. */
function readString(view, u8, p) { let len; [len, p] = readVarint(view, p); return [new TextDecoder().decode(u8.subarray(p, p + len)), p + len]; }

/** Decodes a cartography table's `data` field (gzip of a version-3 shared map package). */
export function decodeMapData(gz) {
  const u8 = gunzipSync(gz), view = new DataView(u8.buffer, u8.byteOffset, u8.byteLength);
  let p = 0;
  const version = view.getInt32(p, true); p += 4;
  const n = view.getInt32(p, true); p += 4;
  const explored = u8.subarray(p, p + n); p += n;
  const pinCount = view.getInt32(p, true); p += 4;
  const pins = [];
  for (let i = 0; i < pinCount; i++) {
    p += 8;                                                   // owner id, not needed
    let name; [name, p] = readString(view, u8, p);
    const x = view.getFloat32(p, true), y = view.getFloat32(p + 4, true), z = view.getFloat32(p + 8, true); p += 12;
    const type = view.getInt32(p, true); p += 4;
    const checked = !!u8[p]; p += 1;
    let author; [author, p] = readString(view, u8, p);
    pins.push({ name, x, y, z, type, checked, author });
  }
  return { version, explored, texture: Math.round(Math.sqrt(n)), pins };
}

/**
 * Marks fog cells revealed (255) for every explored map pixel, after shifting world coordinates by (dx, dz).
 * A pixel covers [(i − texture/2) · px, +px) in x and z; every cell it overlaps is revealed, so no gaps appear
 * between the 12 m pixels and the 8 m cells.
 */
export function exploredToFog(explored, texture, { dx = 0, dz = 0, pixelM = MAP_PIXEL_M, cells = CELLS, cellM = CELL_M, fog = new Uint8Array(cells * cells) } = {}) {
  const half = cells * cellM / 2, origin = texture / 2;
  let marked = 0;
  for (let j = 0; j < texture; j++) for (let i = 0; i < texture; i++) {
    if (!explored[j * texture + i]) continue;
    const wx0 = (i - origin) * pixelM + dx, wz0 = (j - origin) * pixelM + dz;
    const cx0 = Math.floor((wx0 + half) / cellM), cx1 = Math.ceil((wx0 + pixelM + half) / cellM) - 1;
    const cz0 = Math.floor((wz0 + half) / cellM), cz1 = Math.ceil((wz0 + pixelM + half) / cellM) - 1;
    for (let cz = Math.max(0, cz0); cz <= Math.min(cells - 1, cz1); cz++) for (let cx = Math.max(0, cx0); cx <= Math.min(cells - 1, cx1); cx++) {
      const k = cz * cells + cx; if (fog[k] !== 255) { fog[k] = 255; marked++; }
    }
  }
  return { fog, marked };
}

const PIN_TYPES = { 0: 'fire', 1: 'house', 2: 'hammer', 3: 'pin', 4: 'death', 5: 'bed', 6: 'portal', 9: 'boss' };
const BOSS_NAMES = { $enemy_eikthyr: 'Eikthyr', $enemy_gdking: 'The Elder', $enemy_bonemass: 'Bonemass', $enemy_dragon: 'Moder', $enemy_goblinking: 'Yagluth', $enemy_seekerqueen: 'The Queen', $enemy_fader: 'Fader' };

/** A table pin as a mapper pin, shifted by (dx, dz). Ids are stable across reruns so a reimport replaces rather than duplicates. */
export function toMapperPin(pin, { dx = 0, dz = 0 } = {}) {
  const x = +(pin.x + dx).toFixed(1), z = +(pin.z + dz).toFixed(1), type = PIN_TYPES[pin.type] ?? 'pin';
  const name = BOSS_NAMES[pin.name] ?? pin.name;
  return { id: `table-${type}-${x}-${z}`, x, z, type, name: name.slice(0, 40), checked: pin.checked };
}
