import { test } from 'node:test';
import assert from 'node:assert/strict';
import { makeState, validateOp, validateRaster, applyOp, applyRaster, tilesForRect, tileBytes, putTile, snapshotDoc, TILE } from '../worker/ops.js';
import { createState } from '../web/store.js';

test('makeState has the fixed start pin and empty rasters', () => {
  const s = makeState();
  assert.equal(s.pins.get('start').fixed, true); assert.equal(s.terrain.data.length, 2560 * 2560); assert.equal(s.ink.size, 0);
});
test('tiles: rect → tiles, get/put round trip', () => {
  assert.deepEqual(tilesForRect({ x0: 0, z0: 0, x1: 127, z1: 127 }), [{ tx: 0, tz: 0 }]);
  assert.deepEqual(tilesForRect({ x0: 120, z0: 250, x1: 130, z1: 260 }), [{ tx: 0, tz: 1 }, { tx: 1, tz: 1 }, { tx: 0, tz: 2 }, { tx: 1, tz: 2 }]);
  const s = makeState(); s.terrain.data[129 * 2560 + 130] = 9;      // cell (130,129) → tile (1,1) local (2,1)
  const t = tileBytes(s.terrain, 1, 1); assert.equal(t.length, TILE * TILE); assert.equal(t[1 * TILE + 2], 9);
  const s2 = makeState(); putTile(s2.terrain, 1, 1, t); assert.equal(s2.terrain.data[129 * 2560 + 130], 9);
});
test('raster op validation and apply', () => {
  const s = makeState();
  assert.equal(validateRaster({ layer: 0, rect: { x0: 0, z0: 0, x1: 1, z1: 0 }, bytes: new Uint8Array([1, 2]) }), null);
  assert.match(validateRaster({ layer: 0, rect: { x0: 0, z0: 0, x1: 1, z1: 0 }, bytes: new Uint8Array(3) }), /length/);
  assert.match(validateRaster({ layer: 2, rect: { x0: 0, z0: 0, x1: 0, z1: 0 }, bytes: new Uint8Array(1) }), /layer/);
  assert.match(validateRaster({ layer: 0, rect: { x0: 0, z0: 0, x1: 0, z1: 0 }, bytes: new Uint8Array([10]) }), /biome/);   // terrain ids ≤ 9
  const touched = applyRaster(s, { layer: 1, rect: { x0: 126, z0: 0, x1: 129, z1: 0 }, bytes: new Uint8Array([255, 255, 255, 255]) });
  assert.deepEqual([...touched].sort(), ['1:0:0', '1:1:0']); assert.equal(s.fog.data[128], 255);
});
test('json op validation', () => {
  assert.equal(validateOp({ type: 'pin.add', pin: { id: 'p1', x: 1, z: 2, type: 'fire', name: 'Camp', checked: false } }), null);
  assert.match(validateOp({ type: 'pin.add', pin: { id: 'p1', x: 1, z: 2, type: 'start', name: '', checked: false } }), /type/);
  assert.match(validateOp({ type: 'pin.update', id: 'start', patch: { x: 5 } }), /start/);
  assert.match(validateOp({ type: 'pin.remove', id: 'start' }), /start/);
  assert.match(validateOp({ type: 'pin.update', id: 'p1', patch: { name: 'x'.repeat(41) } }), /name/);
  assert.match(validateOp({ type: 'ink.add', stroke: { id: 's', color: '#000', width: 4, points: Array.from({ length: 5001 }, () => [0, 0]) } }), /points/);
  assert.match(validateOp({ type: 'ink.add', stroke: { id: 's', color: 'javascript:x', width: 4, points: [[0, 0]] } }), /color/);
  assert.match(validateOp({ type: 'nope' }), /type/);
  assert.match(validateOp({ type: 'ink.remove', id: 'x'.repeat(65) }), /id/);
});
test('apply json ops mutates state and reports rows', () => {
  const s = makeState();
  let r = applyOp(s, { type: 'ink.add', stroke: { id: 's1', color: '#123456', width: 4, points: [[0, 0], [1, 1]] } });
  assert.deepEqual(r.persist, [{ table: 'ink', id: 's1', json: JSON.stringify(s.ink.get('s1')) }]);
  r = applyOp(s, { type: 'pin.add', pin: { id: 'p1', x: 1, z: 2, type: 'fire', name: 'Camp', checked: false } });
  assert.equal(s.pins.get('p1').name, 'Camp');
  applyOp(s, { type: 'pin.update', id: 'p1', patch: { checked: true, name: 'Camp 2' } });
  assert.equal(s.pins.get('p1').checked, true); assert.equal(s.pins.get('p1').name, 'Camp 2'); assert.equal(s.pins.get('p1').x, 1);
  assert.equal(applyOp(s, { type: 'pin.update', id: 'missing', patch: { checked: true } }).persist.length, 0);
  r = applyOp(s, { type: 'pin.remove', id: 'p1' }); assert.deepEqual(r.persist, [{ table: 'pins', id: 'p1', json: null }]); assert.ok(!s.pins.has('p1'));
  r = applyOp(s, { type: 'ink.remove', id: 's1' }); assert.ok(!s.ink.has('s1'));
});
test('snapshotDoc round-trips through the client state factory', async () => {
  const s = makeState();
  applyRaster(s, { layer: 0, rect: { x0: 5, z0: 5, x1: 5, z1: 5 }, bytes: new Uint8Array([3]) });
  applyOp(s, { type: 'ink.add', stroke: { id: 's1', color: '#000000', width: 4, points: [[0, 0], [1, 1]] } });
  const doc = await snapshotDoc(s);
  assert.equal(doc.version, 1); assert.equal(doc.ink.length, 1); assert.equal(doc.pins[0].type, 'start');
  const c = await createState(JSON.parse(JSON.stringify(doc)));
  assert.equal(c.terrain.get(-10240 + 5 * 8 + 4, -10240 + 5 * 8 + 4), 3); assert.equal(c.ink[0].id, 's1');
});
