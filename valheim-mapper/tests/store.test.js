import { test } from 'node:test';
import assert from 'node:assert/strict';
import { emptyDoc, createState, serialize, SAVE_VERSION } from '../web/store.js';

test('empty doc -> state -> doc round trip', async () => {
  const s = await createState(emptyDoc());
  assert.equal(s.terrain.cells, 2560); assert.equal(s.fog.data[0], 0);
  s.terrain.stamp(100, 100, 50, () => 2);
  s.fog.stamp(0, 0, 200, () => 255);
  s.ink.push({ color: '#000', width: 5, points: [[0, 0], [10, 10]] });
  s.pins.push({ id: 'a', x: 1, z: 2, type: 'fire', name: 'Camp', checked: false });
  const doc = await serialize(s);
  assert.equal(doc.version, SAVE_VERSION);
  assert.equal(typeof doc.terrain, 'string');
  const s2 = await createState(JSON.parse(JSON.stringify(doc)));
  assert.deepEqual(s2.terrain.data, s.terrain.data);
  assert.deepEqual(s2.fog.data, s.fog.data);
  assert.deepEqual(s2.ink, s.ink); assert.deepEqual(s2.pins, s.pins);
});

test('createState rejects unknown versions', async () => {
  await assert.rejects(createState({ ...emptyDoc(), version: 99 }), /version/);
});

test('every state has exactly one fixed start pin at spawn', async () => {
  const s = await createState(emptyDoc());
  const starts = s.pins.filter(p => p.type === 'start');
  assert.equal(starts.length, 1);
  assert.deepEqual([starts[0].x, starts[0].z, starts[0].fixed], [0, 0, true]);
  // an older save without a start pin gets one added first; a save with one is left alone
  const doc = { ...emptyDoc(), pins: [{ id: 'a', x: 5, z: 5, type: 'fire', name: '', checked: false }, { id: 'b', x: 99, z: 99, type: 'start', name: 'moved', checked: false }] };
  const s2 = await createState(doc);
  assert.equal(s2.pins[0].type, 'start'); assert.equal(s2.pins.length, 2);   // stray start pin replaced by the canonical one
  assert.deepEqual([s2.pins[0].x, s2.pins[0].z], [0, 0]);
  const s3 = await createState(await serialize(s2));
  assert.equal(s3.pins.filter(p => p.type === 'start').length, 1);
});
