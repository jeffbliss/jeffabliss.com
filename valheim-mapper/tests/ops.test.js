import { test } from 'node:test';
import assert from 'node:assert/strict';
import { makeState, validateOp, validateRaster, planOp, applyOp, applyRaster, tilesForRect, tileBytes, putTile, snapshotDoc, TILE } from '../worker/ops.js';
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
  assert.equal(validateRaster({ layer: 1, rect: { x0: 0, z0: 0, x1: 511, z1: 511 }, bytes: new Uint8Array(512 * 512) }), null);
  assert.match(validateRaster({ layer: 1, rect: { x0: 0, z0: 0, x1: 512, z1: 511 }, bytes: new Uint8Array(513 * 512) }), /too large/);
  const touched = applyRaster(s, { layer: 1, rect: { x0: 126, z0: 0, x1: 129, z1: 0 }, bytes: new Uint8Array([255, 255, 255, 255]) });
  assert.deepEqual([...touched].sort(), ['1:0:0', '1:1:0']); assert.equal(s.fog.data[128], 255);
});
test('json op validation', () => {
  assert.equal(validateOp({ type: 'pin.add', pin: { id: 'p1', x: 1, z: 2, type: 'fire', name: 'Camp', checked: false } }), null);
  assert.match(validateOp({ type: 'pin.add', pin: { id: 'p1', x: 1, z: 2, type: 'start', name: '', checked: false } }), /type/);
  const logged = log => ({ type: 'pin.add', pin: { id: 'p1', x: 1, z: 2, type: 'pin', name: 'log end', checked: false, log } });
  assert.equal(validateOp(logged({ from: 'start', start: [0, 0], legs: 'N 70 jog', ink: 's1' })), null);
  assert.equal(validateOp(logged({ from: null, start: [3, 4], legs: 'N 70 jog', ink: 's1' })), null);
  assert.match(validateOp(logged({ from: 'start', start: [0], legs: 'N 70 jog', ink: 's1' })), /log start/);
  assert.match(validateOp(logged({ from: 'start', start: [0, 0], legs: '', ink: 's1' })), /log legs/);
  assert.match(validateOp(logged({ from: 'start', start: [0, 0], legs: 'x'.repeat(1001), ink: 's1' })), /log legs/);
  assert.match(validateOp(logged({ from: 'start', start: [0, 0], legs: 'N 70 jog', ink: 's1', extra: 1 })), /log key/);
  assert.match(validateOp(logged({ from: 'start', start: [0, 0], legs: 'N 70 jog' })), /log ink/);
  assert.match(validateOp(logged('nope')), /bad log/);
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
test('pin.sight / pin.unsight validation and apply', () => {
  assert.equal(validateOp({ type: 'pin.sight', id: 'p1', from: 'start', bearing: 45 }), null);
  assert.equal(validateOp({ type: 'pin.sight', id: 'p1', from: 'start', bearing: 337.5 }), null);
  assert.match(validateOp({ type: 'pin.sight', id: 'p1', from: 'p1', bearing: 45 }), /from/);
  assert.match(validateOp({ type: 'pin.sight', id: 'p1', from: 'start', bearing: 30 }), /bearing/);
  assert.match(validateOp({ type: 'pin.sight', id: 'p1', from: 'start', bearing: 360 }), /bearing/);
  assert.match(validateOp({ type: 'pin.sight', id: '', from: 'start', bearing: 45 }), /id/);
  assert.equal(validateOp({ type: 'pin.unsight', id: 'p1', from: 'start' }), null);
  assert.match(validateOp({ type: 'pin.unsight', id: 'p1', from: '' }), /from/);
  assert.equal(validateOp({ type: 'pin.sight', id: 'start', from: 'p1', bearing: 45 }), 'start pin is fixed');
  assert.equal(validateOp({ type: 'pin.unsight', id: 'start', from: 'p1' }), 'start pin is fixed');
  assert.equal(validateOp({ type: 'pin.add', pin: { id: 'p1', x: 1, z: 2, type: 'pin', name: '', checked: false, sightings: [{ from: 'start', bearing: 45 }] } }), null);
  assert.match(validateOp({ type: 'pin.add', pin: { id: 'p1', x: 1, z: 2, type: 'pin', name: '', checked: false, sightings: [{ from: 'p1', bearing: 45 }] } }), /sighting/);
  assert.match(validateOp({ type: 'pin.add', pin: { id: 'p1', x: 1, z: 2, type: 'pin', name: '', checked: false, sightings: [{ from: 'a', bearing: 0 }, { from: 'a', bearing: 90 }] } }), /duplicate/);

  const s = makeState();
  applyOp(s, { type: 'pin.add', pin: { id: 'p1', x: 1, z: 2, type: 'pin', name: '', checked: false } });
  applyOp(s, { type: 'pin.sight', id: 'p1', from: 'start', bearing: 45 });
  applyOp(s, { type: 'pin.sight', id: 'p1', from: 'p2', bearing: 90 });
  applyOp(s, { type: 'pin.sight', id: 'p1', from: 'start', bearing: 67.5 });          // replaces the first
  assert.deepEqual(s.pins.get('p1').sightings, [{ from: 'start', bearing: 67.5 }, { from: 'p2', bearing: 90 }]);
  const { persist } = planOp(s, { type: 'pin.unsight', id: 'p1', from: 'p2' });
  assert.deepEqual(JSON.parse(persist[0].json).sightings, [{ from: 'start', bearing: 67.5 }]);
  applyOp(s, { type: 'pin.unsight', id: 'p1', from: 'p2' });
  applyOp(s, { type: 'pin.unsight', id: 'p1', from: 'start' });
  assert.equal('sightings' in s.pins.get('p1'), false);                               // empty array is dropped
  assert.equal(applyOp(s, { type: 'pin.sight', id: 'nope', from: 'start', bearing: 0 }).persist.length, 0);
  for (let i = 0; i < 32; i++) applyOp(s, { type: 'pin.sight', id: 'p1', from: `o${i}`, bearing: 0 });
  assert.equal(s.pins.get('p1').sightings.length, 32);
  assert.equal(planOp(s, { type: 'pin.sight', id: 'p1', from: 'o32', bearing: 0 }).persist.length, 0);   // cap: a new observer is a no-op
  applyOp(s, { type: 'pin.sight', id: 'p1', from: 'o32', bearing: 0 });
  assert.equal(s.pins.get('p1').sightings.length, 32);
  assert.equal(s.pins.get('p1').sightings.some(x => x.from === 'o32'), false);
  applyOp(s, { type: 'pin.sight', id: 'p1', from: 'o5', bearing: 90 });                  // replacing an existing observer still applies
  assert.deepEqual(s.pins.get('p1').sightings[5], { from: 'o5', bearing: 90 });
});
test('planOp returns applyOp\'s rows without mutating the state', () => {
  const base = makeState();
  applyOp(base, { type: 'pin.add', pin: { id: 'p1', x: 1, z: 2, type: 'fire', name: 'Camp', checked: false } });
  const ops = [
    { type: 'pin.add', pin: { id: 'p2', x: 3, z: 4, type: 'fire', name: 'Other', checked: true } },
    { type: 'pin.update', id: 'p1', patch: { checked: true, name: 'Camp 2' } },
    { type: 'pin.update', id: 'missing', patch: { checked: true } },
    { type: 'pin.remove', id: 'p1' },
    { type: 'pin.remove', id: 'nope' },
    { type: 'ink.add', stroke: { id: 's1', color: '#123456', width: 4, points: [[0, 0], [1, 1]] } },
    { type: 'ink.remove', id: 's1' },
    { type: 'ink.remove', id: 'gone' },
  ];
  for (const op of ops) {
    const s = makeState();
    applyOp(s, { type: 'pin.add', pin: { id: 'p1', x: 1, z: 2, type: 'fire', name: 'Camp', checked: false } });
    applyOp(s, { type: 'ink.add', stroke: { id: 's1', color: '#123456', width: 4, points: [[0, 0], [1, 1]] } });
    const pins = s.pins.size, ink = s.ink.size, before = JSON.stringify([...s.pins.values()]);
    const planned = planOp(s, op);
    assert.equal(s.pins.size, pins, op.type); assert.equal(s.ink.size, ink, op.type);
    assert.equal(JSON.stringify([...s.pins.values()]), before, op.type);
    assert.deepEqual(planned.persist, applyOp(s, op).persist, op.type);
  }
});
