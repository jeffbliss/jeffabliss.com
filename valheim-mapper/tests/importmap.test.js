import { test } from 'node:test';
import assert from 'node:assert/strict';
import { replaceOps, parseDocument, TILE } from '../web/importmap.js';
import { createState, serialize, emptyDoc } from '../web/store.js';

test('replaceOps sends only the raster tiles that differ, swaps ink, and replaces every non-fixed pin', async () => {
  const cur = await createState(), next = await createState();
  cur.terrain.data[5 * cur.terrain.cells + 5] = 3;                              // painted cell in tile (0,0), to be erased
  next.fog.data[300 * next.fog.cells + 300] = 255;                              // revealed cell in tile (2,2)
  cur.ink.push({ id: 's1', color: '#000', width: 4, points: [[0, 0], [1, 1]] });
  next.ink.push({ id: 's2', color: '#000', width: 4, points: [[5, 5]] });
  cur.pins.push({ id: 'old', x: 1, z: 1, type: 'fire', name: 'Camp', checked: false });
  next.pins.push({ id: 'table-boss-1-2', x: 1, z: 2, type: 'boss', name: 'Eikthyr', checked: false });
  const { ops, apply } = replaceOps(cur, next);
  const rasters = ops.filter(o => o.type === 'raster');
  assert.deepEqual(rasters.map(o => [o.layer, o.rect.x0, o.rect.z0]), [[0, 0, 0], [1, 2 * TILE, 2 * TILE]]);
  assert.equal(rasters[0].bytes.length, TILE * TILE); assert.equal(rasters[0].bytes[5 * TILE + 5], 0);
  assert.deepEqual(ops.filter(o => o.type !== 'raster').map(o => o.type), ['ink.remove', 'ink.add', 'pin.remove', 'pin.add']);
  assert.equal(ops.find(o => o.type === 'pin.add').pin.id, 'table-boss-1-2');
  apply();
  assert.equal(cur.terrain.data[5 * cur.terrain.cells + 5], 0); assert.equal(cur.fog.data[300 * cur.fog.cells + 300], 255);
  assert.deepEqual(cur.ink.map(s => s.id), ['s2']);
  assert.deepEqual(cur.pins.map(p => p.id), ['start', 'table-boss-1-2']);
  assert.equal(replaceOps(cur, next).ops.length, 2 + 1 + 1);                   // already equal rasters: only ink and pin churn remains
});

test('parseDocument accepts an export and rejects other text', async () => {
  const state = await parseDocument(JSON.stringify(await serialize(await createState(emptyDoc()))));
  assert.equal(state.pins[0].id, 'start');
  await assert.rejects(parseDocument('nope'), /not a JSON/);
  await assert.rejects(parseDocument('{"a":1}'), /not a mapper export/);
});
