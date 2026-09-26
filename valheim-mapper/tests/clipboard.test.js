import { test } from 'node:test';
import assert from 'node:assert/strict';
import { createRaster } from '../web/raster.js';
import { createHistory } from '../web/history.js';
import { cellRect, copyRegion, parseClip, pasteCommand } from '../web/clipboard.js';

globalThis.crypto ??= (await import('node:crypto')).webcrypto;
// 20×20 cells of 1 m centred on the origin: cell (cx, cz) spans world [cx-10, cx-9).
const world = () => ({ terrain: createRaster({ cells: 20, cellM: 1 }), fog: createRaster({ cells: 20, cellM: 1 }), ink: [], pins: [] });
const at = (r, cx, cz) => r.data[cz * r.cells + cx];

test('cellRect snaps a world rect to whole cells and clamps to the raster', () => {
  const r = createRaster({ cells: 20, cellM: 1 });
  assert.deepEqual(cellRect(r, { x0: -8.5, z0: -8.2, x1: -6.1, z1: -5 }), { x0: 1, z0: 1, x1: 3, z1: 4 });
  assert.deepEqual(cellRect(r, { x0: -50, z0: -50, x1: -9, z1: -9 }), { x0: 0, z0: 0, x1: 0, z1: 0 });
  assert.equal(cellRect(r, { x0: 50, z0: 50, x1: 60, z1: 60 }), null);
});

test('copy takes terrain, fog, wholly-inside ink and non-start pins, relative to the corner; round-trips through text', () => {
  const w = world();
  w.terrain.data[2 * 20 + 2] = 3; w.fog.data[2 * 20 + 2] = 255;
  w.ink.push({ id: 'in', color: '#f00', width: 1, points: [[-7.5, -7.5], [-7, -7]] }, { id: 'out', color: '#0f0', width: 1, points: [[-7.5, -7.5], [5, 5]] });
  w.pins.push({ id: 'start', x: -7.5, z: -7.5, type: 'start', fixed: true }, { id: 'p', x: -7.5, z: -7.5, type: 'fire', name: 'camp', checked: true, shore: true }, { id: 'far', x: 5, z: 5, type: 'pin', name: '' });
  const rect = { x0: 1, z0: 1, x1: 4, z1: 4 };                    // world [-9, -5)
  const clip = parseClip(JSON.stringify(copyRegion(w, rect)));
  assert.equal(clip.w, 4); assert.equal(clip.h, 4);
  assert.equal(clip.terrain[1 * 4 + 1], 3); assert.equal(clip.fog[1 * 4 + 1], 255); assert.equal(clip.terrain[0], 0);
  assert.deepEqual(clip.ink.map(s => s.color), ['#f00']); assert.deepEqual(clip.ink[0].points[0], [1.5, 1.5]);
  assert.deepEqual(clip.pins, [{ type: 'fire', name: 'camp', checked: true, shore: true, x: 1.5, z: 1.5 }]);
  assert.equal(parseClip('{"hello":1}'), null); assert.equal(parseClip('nope'), null);
});

test('paste coerces shore to a real boolean, even from untrusted clipboard text', () => {
  const dst = world();
  const clip = { type: 'valheim-mapper/clip', cellM: 1, w: 1, h: 1, terrain: new Uint8Array(1), fog: new Uint8Array(1), ink: [],
    pins: [{ type: 'fire', name: 'a', checked: true, shore: 'yes', x: 0, z: 0 }, { type: 'fire', name: 'b', checked: true, x: 0, z: 0 }] };
  pasteCommand(dst, clip, 0, 0);
  assert.equal(dst.pins[0].shore, true); assert.equal(dst.pins[1].shore, false);
});

test('paste is transparent for blank terrain, merges fog reveal, offsets ink and pins with fresh ids, and undoes as one step', () => {
  const src = world(); src.terrain.data[2 * 20 + 2] = 3; src.fog.data[2 * 20 + 2] = 255;
  src.ink.push({ id: 'in', color: '#f00', width: 1, points: [[-7.5, -7.5]] });
  src.pins.push({ id: 'p', x: -7.5, z: -7.5, type: 'fire', name: 'camp', checked: false });
  const clip = parseClip(JSON.stringify(copyRegion(src, { x0: 1, z0: 1, x1: 4, z1: 4 })));
  const dst = world(); dst.terrain.data[10 * 20 + 10] = 5; dst.fog.data[11 * 20 + 11] = 40;
  // centre at world (2, 2): the 4×4 clip lands on cells 10..13, so clip cell (1,1) -> cell (11,11)
  const cmd = pasteCommand(dst, clip, 2, 2);
  assert.equal(at(dst.terrain, 11, 11), 3); assert.equal(at(dst.terrain, 10, 10), 5);   // painted cell lands, blank cell leaves what was there
  assert.equal(at(dst.fog, 11, 11), 255); assert.equal(at(dst.fog, 10, 10), 0);
  assert.equal(dst.ink.length, 1); assert.deepEqual(dst.ink[0].points[0], [1.5, 1.5]); assert.notEqual(dst.ink[0].id, 'in');
  assert.equal(dst.pins.length, 1); assert.equal(dst.pins[0].x, 1.5); assert.equal(dst.pins[0].type, 'fire'); assert.notEqual(dst.pins[0].id, 'p');
  assert.deepEqual(cmd.ops.map(o => o.type), ['raster', 'raster', 'ink.add', 'pin.add']);
  const h = createHistory(); h.push(cmd); h.undo();
  assert.equal(at(dst.terrain, 11, 11), 0); assert.equal(at(dst.fog, 11, 11), 40); assert.equal(dst.ink.length, 0); assert.equal(dst.pins.length, 0);   // undo restores the old fog value
  h.redo(); assert.equal(at(dst.terrain, 11, 11), 3); assert.equal(dst.pins.length, 1);
});

test('paste clamps at the raster edge and returns null when nothing changes', () => {
  const src = world(); src.terrain.data[2 * 20 + 2] = 3;
  const clip = parseClip(JSON.stringify(copyRegion(src, { x0: 1, z0: 1, x1: 4, z1: 4 })));
  const dst = world();
  const cmd = pasteCommand(dst, clip, 9.5, 9.5);                     // hangs off the north-east corner
  assert.ok(cmd); assert.equal(dst.terrain.data.filter(v => v === 3).length, 1);
  assert.equal(pasteCommand(dst, parseClip(JSON.stringify(copyRegion(world(), { x0: 1, z0: 1, x1: 4, z1: 4 }))), 0, 0), null);
});
