import { test } from 'node:test';
import assert from 'node:assert/strict';
import { gzipSync } from 'node:zlib';
import { stableHash, readRecord, readChunk, chunkNames, decodeMapData, exploredToFog, toMapperPin } from '../scripts/lib/valheimsave.mjs';

test('stableHash matches the game for known prefab names', () => {
  assert.equal(stableHash('piece_cartographytable'), 0xf631b195);
  assert.equal(stableHash('Vegvisir_Eikthyr'), 0xe5764c3e);
  assert.equal(stableHash('data'), 0x0027f92e);
});

const u16 = v => [v & 255, v >> 8], u32 = v => [v & 255, (v >> 8) & 255, (v >> 16) & 255, (v >>> 24) & 255];
const f32 = v => [...new Uint8Array(new Float32Array([v]).buffer)], i16 = v => [v & 255, (v >> 8) & 255];

test('readRecord: float and short positions, rotation of both widths, connection, and segments', () => {
  const plain = [...u16(0x1100), ...f32(10), ...f32(20), ...f32(30), ...u32(0xaaaaaaaa)];              // flags: persistent + rotation, 2-byte rotation
  const rec1 = [...plain, 0x12, 0x80];
  const rec2 = [...u16(0x1100), ...f32(1), ...f32(2), ...f32(3), ...u32(0xbbbbbbbb), 0x12, 0x2c, 0x00, 0x10];   // 4-byte rotation
  const rec3 = [...u16(0x2120), ...i16(-2112), ...i16(-2816), ...u32(0x65835e28), 1, ...u32(0x11223344), ...u32(7), ...u32(0)];   // short pos + one long
  const rec4 = [...u16(0x01d1), ...f32(0), ...f32(0), ...f32(0), ...u32(0xcccccccc), 1, ...u32(5),   // connection
    1, ...u32(0x1111), ...u32(42),                                                                     // ints: one
    1, ...u32(0x2222), 3, 0x61, 0x62, 0x63,                                                             // strings: "abc"
    1, ...u32(0x0027f92e), ...u32(2), 0xde, 0xad];                                                      // bytes: 2 bytes
  const body = [...rec1, ...rec2, ...rec3, ...rec4];
  const u8 = new Uint8Array([...u16(41), ...u32(4), ...body]);
  const recs = readChunk(u8);
  assert.equal(recs.length, 4);
  assert.deepEqual([recs[0].x, recs[0].y, recs[0].z, recs[0].prefab], [10, 20, 30, 0xaaaaaaaa]);
  assert.deepEqual([recs[1].x, recs[1].z], [1, 3]);
  assert.deepEqual([recs[2].x, recs[2].z, recs[2].prefab, recs[2].longs.get(0x11223344)], [-2112, -2816, 0x65835e28, 7n]);
  assert.equal(recs[3].ints.get(0x1111), 42);
  assert.equal(recs[3].strings.get(0x2222), 'abc');
  assert.deepEqual([...recs[3].bytes.get(0x0027f92e)], [0xde, 0xad]);
  assert.throws(() => readChunk(new Uint8Array([...u16(41), ...u32(1), ...rec1, 0])), /bytes left/);
});

test('chunkNames rebuilds file names from the index entries', () => {
  const entry = (y, x, gen, sv, count) => [y, x, gen, ...u32(sv), ...u32(count)];
  const idx = new Uint8Array([...u16(41), ...u32(100), ...u32(2), ...entry(0x1e, 0x20, 1, 186, 50), ...entry(0x00, 0x00, 0, 7, 50)]);
  assert.deepEqual(chunkNames(idx), ['20_1e__1_186.chunk', '00_00__0_7.chunk']);
});

function mapPackage(texture, exploredAt, pins) {
  const explored = new Uint8Array(texture * texture); for (const [i, j] of exploredAt) explored[j * texture + i] = 1;
  const enc = new TextEncoder(), bytes = [...u32(3), ...u32(explored.length), ...explored, ...u32(pins.length)];
  for (const p of pins) {
    const name = enc.encode(p.name), author = enc.encode('Steam_1');
    bytes.push(...new Array(8).fill(0), name.length, ...name, ...f32(p.x), ...f32(p.y), ...f32(p.z), ...u32(p.type), p.checked ? 1 : 0, author.length, ...author);
  }
  return gzipSync(Buffer.from(bytes));
}

test('decodeMapData reads a version-3 package: explored pixels and pins', () => {
  const gz = mapPackage(4, [[1, 2], [3, 3]], [{ name: '$enemy_eikthyr', x: 256.1, y: 37.5, z: -179.4, type: 9, checked: false }]);
  const m = decodeMapData(gz);
  assert.equal(m.version, 3); assert.equal(m.texture, 4);
  assert.equal(m.explored[2 * 4 + 1], 1); assert.equal(m.explored[3 * 4 + 3], 1); assert.equal(m.explored[0], 0);
  assert.equal(m.pins.length, 1); assert.equal(m.pins[0].name, '$enemy_eikthyr'); assert.equal(m.pins[0].type, 9);
  assert.ok(Math.abs(m.pins[0].x - 256.1) < 1e-4 && Math.abs(m.pins[0].z + 179.4) < 1e-4);
});

test('exploredToFog reveals every 8 m cell an explored 12 m pixel overlaps, after the shift', () => {
  const texture = 4, explored = new Uint8Array(16); explored[2 * 4 + 2] = 1;   // pixel (2,2): world x,z in [0,12)
  const cells = 8, cellM = 8;                                                    // world −32..32, cell k covers [−32+8k, −32+8k+8)
  const { fog, marked } = exploredToFog(explored, texture, { cells, cellM, pixelM: 12 });
  const lit = []; for (let cz = 0; cz < cells; cz++) for (let cx = 0; cx < cells; cx++) if (fog[cz * cells + cx]) lit.push([cx, cz]);
  assert.deepEqual(lit, [[4, 4], [5, 4], [4, 5], [5, 5]]);                      // x 0..12 spans cells 4 and 5
  assert.equal(marked, 4);
  const shifted = exploredToFog(explored, texture, { cells, cellM, pixelM: 12, dx: 8, dz: 8 });
  assert.equal(shifted.fog[4 * cells + 4], 0); assert.equal(shifted.fog[5 * cells + 5], 255); assert.equal(shifted.fog[6 * cells + 6], 255);
});

test('toMapperPin maps types and boss names and shifts', () => {
  const p = toMapperPin({ name: '$enemy_gdking', x: 382.7, y: 43, z: -959.7, type: 9, checked: true }, { dx: 65, dz: -4 });
  assert.deepEqual(p, { id: 'table-boss-447.7--963.7', x: 447.7, z: -963.7, type: 'boss', name: 'The Elder', checked: true });
  assert.equal(toMapperPin({ name: 'Camp', x: 0, y: 0, z: 0, type: 0, checked: false }).type, 'fire');
  assert.equal(toMapperPin({ name: 'x', x: 0, y: 0, z: 0, type: 12, checked: false }).type, 'pin');
});
