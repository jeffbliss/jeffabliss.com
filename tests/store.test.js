import { test } from 'node:test';
import assert from 'node:assert/strict';
import { emptyDoc, createState, serialize, createStoreClient, SAVE_VERSION } from '../web/store.js';

test('empty doc -> state -> doc round trip', async () => {
  const s = await createState(emptyDoc());
  assert.equal(s.terrain.cells, 2560); assert.equal(s.fog.data[0], 0);
  s.terrain.stamp(100, 100, 50, () => 2);
  s.fog.stamp(0, 0, 200, () => 255);
  s.ink.push({ color: '#000', width: 5, points: [[0, 0], [10, 10]] });
  s.pins.push({ id: 'a', x: 1, z: 2, type: 'fire', name: 'Camp', checked: false });
  s.player = { x: 5, z: 6, angle: 1 };
  const doc = await serialize(s);
  assert.equal(doc.version, SAVE_VERSION);
  assert.equal(typeof doc.terrain, 'string');
  const s2 = await createState(JSON.parse(JSON.stringify(doc)));
  assert.deepEqual(s2.terrain.data, s.terrain.data);
  assert.deepEqual(s2.fog.data, s.fog.data);
  assert.deepEqual(s2.ink, s.ink); assert.deepEqual(s2.pins, s.pins); assert.deepEqual(s2.player, s.player);
});

test('createState rejects unknown versions', async () => {
  await assert.rejects(createState({ ...emptyDoc(), version: 99 }), /version/);
});

test('client saves via PUT, reports status, retries on failure, falls back to storage', async () => {
  const calls = []; let fail = 1; const statuses = []; const mem = new Map();
  const storage = { getItem: k => mem.get(k) ?? null, setItem: (k, v) => mem.set(k, v) };
  const fetchFn = async (url, opts = {}) => {
    calls.push([url, opts.method ?? 'GET']);
    if (opts.method === 'PUT') { if (fail-- > 0) throw new Error('net'); return { ok: true, json: async () => ({}) }; }
    return { ok: true, json: async () => ({ ...emptyDoc(), pins: [{ id: 'x' }] }) };
  };
  const c = createStoreClient({ url: '/api/map', fetchFn, storage, debounceMs: 1, retryMs: 1, onStatus: s => statuses.push(s) });
  const loaded = await c.load(); assert.equal(loaded.pins[0].id, 'x');
  const doc = emptyDoc(); doc.pins.push({ id: 'p' });
  c.schedule(() => doc);
  await c.flush();
  assert.deepEqual(calls.filter(c => c[1] === 'PUT').length, 2);          // one failure, one success
  assert.deepEqual(statuses, ['dirty', 'saving', 'error', 'saving', 'saved']);
  assert.equal(JSON.parse(mem.get('valheim-mapper:map')).pins[0].id, 'p');  // local copy kept
});

test('client load falls back to localStorage when server unreachable', async () => {
  const mem = new Map([['valheim-mapper:map', JSON.stringify({ ...emptyDoc(), pins: [{ id: 'local' }] })]]);
  const storage = { getItem: k => mem.get(k) ?? null, setItem: (k, v) => mem.set(k, v) };
  const c = createStoreClient({ fetchFn: async () => { throw new Error('down'); }, storage });
  assert.equal((await c.load()).pins[0].id, 'local');
});
