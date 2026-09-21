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

test('flush with maxAttempts gives up and reports false', async () => {
  const statuses = [];
  const storage = { getItem: () => null, setItem: () => {} };
  const c = createStoreClient({ fetchFn: async (u, o = {}) => { if (o.method === 'PUT') throw new Error('down'); return { ok: true, json: async () => emptyDoc() }; }, storage, debounceMs: 1, retryMs: 1, onStatus: s => statuses.push(s) });
  c.schedule(() => emptyDoc());
  assert.equal(await c.flush({ maxAttempts: 2 }), false);
  assert.deepEqual(statuses, ['dirty', 'saving', 'error', 'saving', 'error']);
});

test('load returns an empty doc on 204, not the localStorage copy', async () => {
  const mem = new Map([['valheim-mapper:map', JSON.stringify({ ...emptyDoc(), pins: [{ id: 'local' }] })]]);
  const storage = { getItem: k => mem.get(k) ?? null, setItem: (k, v) => mem.set(k, v) };
  const c = createStoreClient({ fetchFn: async () => ({ ok: true, status: 204, json: async () => { throw new Error('no body'); } }), storage });
  assert.equal((await c.load()).pins.length, 0);
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
