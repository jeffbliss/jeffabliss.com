import { test } from 'node:test';
import assert from 'node:assert/strict';
import { createRaster } from '../web/raster.js';

test('toCell / cellCenter: row 0 is the south edge', () => {
  const r = createRaster({ cells: 4, cellM: 10 });          // world 40 m, -20..20
  assert.deepEqual(r.toCell(-20, -20), [0, 0]);
  assert.deepEqual(r.toCell(19.9, 19.9), [3, 3]);
  assert.deepEqual(r.cellCenter(0, 0), [-15, -15]);
});

test('stamp sets cells within radius and reports dirty rect', () => {
  const r = createRaster({ cells: 10, cellM: 1 });          // -5..5
  const rect = r.stamp(0.5, 0.5, 1.6, () => 7);              // centre of cell (5,5)
  assert.equal(r.get(0.5, 0.5), 7);
  assert.equal(r.get(1.5, 0.5), 7); assert.equal(r.get(-0.5, 0.5), 7);
  assert.equal(r.get(1.5, 1.5), 7);                          // diagonal at 1.41 < 1.6
  assert.equal(r.get(2.5, 0.5), 0);                          // 2 > 1.6
  assert.deepEqual(rect, { x0: 3, z0: 3, x1: 7, z1: 7 });
  assert.deepEqual(r.takeDirty(), rect); assert.equal(r.takeDirty(), null);
});

test('stamp passes falloff t (1 at centre, 0 at edge) and clamps to bounds', () => {
  const r = createRaster({ cells: 4, cellM: 1 });            // -2..2
  const ts = [];
  const rect = r.stamp(-1.5, -1.5, 1.2, (cur, t) => { ts.push(+t.toFixed(3)); return 1; });
  assert.equal(Math.max(...ts), 1);
  assert.deepEqual(rect, { x0: 0, z0: 0, x1: 1, z1: 1 });
  assert.equal(r.stamp(100, 100, 1, () => 1), null);
});

test('dirty rects union across stamps and version increments', () => {
  const r = createRaster({ cells: 10, cellM: 1 });
  const v = r.version;
  r.stamp(-4.5, -4.5, 0.5, () => 1); r.stamp(4.5, 4.5, 0.5, () => 1);
  assert.deepEqual(r.takeDirty(), { x0: 0, z0: 0, x1: 9, z1: 9 });
  assert.equal(r.version, v + 2);
});

test('snapshot/restore round-trip a rect', () => {
  const r = createRaster({ cells: 6, cellM: 1 });
  const rect = { x0: 1, z0: 2, x1: 3, z1: 4 };
  const before = r.snapshot(rect);
  r.stamp(0, 0, 10, () => 5);
  assert.equal(r.get(0.5, 0.5), 5);
  r.restore(rect, before);
  assert.equal(r.get(-0.5, 0.5), 0);     // inside rect: restored
  assert.equal(r.get(-2.5, -2.5), 5);   // outside rect: untouched
  assert.deepEqual(r.takeDirty(), { x0: 0, z0: 0, x1: 5, z1: 5 });
});
