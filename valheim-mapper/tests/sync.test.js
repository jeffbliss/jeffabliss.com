import { test } from 'node:test';
import assert from 'node:assert/strict';
import { createSync, applyRemoteOp } from '../web/sync.js';
import { createState, emptyDoc } from '../web/store.js';
import { encodeRasterOp, wrapServerRaster, decodeRasterOp } from '../web/proto.js';

class FakeWS { constructor(url) { this.url = url; this.sent = []; this.readyState = 0; this.closes = 0; FakeWS.last = this; } send(d) { this.sent.push(d); } close() { this.closes++; this.onclose?.({}); }
  open() { this.readyState = 1; this.onopen?.(); } msg(d) { this.onmessage?.({ data: d }); } }
async function fakeApp() {
  const state = await createState(emptyDoc()); const statuses = [], renders = { n: 0 };
  const app = { state, history: { onApply: null, clear() { this.cleared = (this.cleared ?? 0) + 1; } }, requestRender: () => renders.n++, setStatus: () => {},
    onSnapshot: async (doc, you) => { app.state = await createState(doc); app.you = you; app.snapshots = (app.snapshots ?? 0) + 1; } };
  return { app, statuses, renders };
}
test('sends ops as binary or json frames', async () => {
  const { app } = await fakeApp(); const sync = createSync(app, { WebSocketImpl: FakeWS, url: 'ws://x/api/ws' }); sync.connect(); FakeWS.last.open();
  app.history.onApply([{ type: 'raster', layer: 'fog', rect: { x0: 1, z0: 1, x1: 1, z1: 1 }, bytes: new Uint8Array([255]) }, { type: 'pin.remove', id: 'p' }]);
  assert.equal(FakeWS.last.sent.length, 2); assert.ok(FakeWS.last.sent[0] instanceof Uint8Array); assert.equal(decodeRasterOp(FakeWS.last.sent[0]).layer, 1);
  assert.deepEqual(JSON.parse(FakeWS.last.sent[1]), { t: 'op', op: { type: 'pin.remove', id: 'p' } });
});
test('hello replaces state; remote raster and json ops apply without touching the recorder', async () => {
  const { app, renders } = await fakeApp(); const sync = createSync(app, { WebSocketImpl: FakeWS, url: 'ws://x' }); sync.connect(); FakeWS.last.open();
  const doc = emptyDoc(); doc.pins = [{ id: 'q', x: 0, z: 0, type: 'fire', name: 'Q', checked: false }];
  await sync.handleMessage(JSON.stringify({ t: 'hello', you: { email: 'a@x', name: 'a', color: 'hsl(0 70% 55%)' }, seq: 3, doc }));
  assert.equal(app.snapshots, 1); assert.equal(sync.status, 'connected'); assert.equal(app.state.pins.find(p => p.id === 'q').name, 'Q');
  app.state.terrain.takeTouched();
  await sync.handleMessage(wrapServerRaster(4, 'bob', encodeRasterOp({ layer: 0, rect: { x0: 0, z0: 0, x1: 0, z1: 0 }, bytes: new Uint8Array([2]) })).buffer);
  assert.equal(app.state.terrain.data[0], 2); assert.equal(app.state.terrain.takeTouched(), null); assert.ok(app.state.terrain.takeDirty());
  await sync.handleMessage(JSON.stringify({ t: 'op', seq: 5, by: { name: 'bob' }, op: { type: 'pin.update', id: 'q', patch: { checked: true } } }));
  assert.equal(app.state.pins.find(p => p.id === 'q').checked, true); assert.ok(renders.n >= 2);
});
test('presence and error callbacks; cursor throttle sends the latest position', async () => {
  const { app } = await fakeApp(); let t = 0; const timers = [];
  const sync = createSync(app, { WebSocketImpl: FakeWS, url: 'ws://x', now: () => t, setTimeoutFn: (fn, ms) => timers.push({ fn, at: t + ms }) });
  let users = null; sync.onPresence = u => (users = u); sync.connect(); FakeWS.last.open();
  await sync.handleMessage(JSON.stringify({ t: 'presence', users: [{ name: 'bob' }] })); assert.equal(users[0].name, 'bob');
  sync.cursor(1, 1, 'paint', 64); sync.cursor(2, 2, 'paint', 64); sync.cursor(3, 3, 'paint', 64);
  assert.equal(FakeWS.last.sent.length, 1); assert.equal(JSON.parse(FakeWS.last.sent[0]).x, 1);
  t = 250; timers.shift().fn(); assert.equal(FakeWS.last.sent.length, 2); assert.equal(JSON.parse(FakeWS.last.sent[1]).x, 3);
});
test('reconnects with backoff and clears history on the new hello', async () => {
  const { app } = await fakeApp(); const timers = [];
  const sync = createSync(app, { WebSocketImpl: FakeWS, url: 'ws://x', setTimeoutFn: (fn, ms) => timers.push({ fn, ms }) });
  sync.connect(); const first = FakeWS.last; first.open(); first.close();
  assert.equal(sync.status, 'reconnecting'); assert.equal(timers[0].ms, 1000); timers.shift().fn(); assert.notEqual(FakeWS.last, first);
  FakeWS.last.close(); assert.equal(timers[0].ms, 2000);
  timers.shift().fn(); FakeWS.last.open();
  await sync.handleMessage(JSON.stringify({ t: 'hello', you: { name: 'a' }, seq: 9, doc: emptyDoc() }));
  assert.equal(app.history.cleared, 1); assert.equal(sync.status, 'connected');
});
test('incoming messages are serialised: an op arriving mid-snapshot waits for the new state', async () => {
  const { app } = await fakeApp();
  let release; const gate = new Promise(r => (release = r));
  app.onSnapshot = async doc => { await gate; app.state = await createState(doc); };
  const sync = createSync(app, { WebSocketImpl: FakeWS, url: 'ws://x' });
  sync.connect(); const ws = FakeWS.last; ws.open();
  const doc = emptyDoc(); doc.pins = [{ id: 'q', x: 0, z: 0, type: 'fire', name: 'Q', checked: false }];
  ws.msg(JSON.stringify({ t: 'hello', you: { email: 'a@x', name: 'a' }, seq: 1, doc }));
  ws.msg(JSON.stringify({ t: 'op', seq: 2, op: { type: 'pin.add', pin: { id: 'r', x: 1, z: 1, type: 'fire', name: 'R', checked: false } } }));
  await Promise.resolve(); await Promise.resolve();
  assert.equal(app.state.pins.find(p => p.id === 'r'), undefined);      // not applied to the OLD state
  assert.equal(app.state.pins.find(p => p.id === 'q'), undefined);      // snapshot still decoding
  release();
  await new Promise(r => setTimeout(r, 10));
  assert.ok(app.state.pins.find(p => p.id === 'q'));                    // snapshot landed
  assert.ok(app.state.pins.find(p => p.id === 'r'));                    // and the queued op applied to the NEW state
});

test('an over-cap raster op is split into server-sized frames before sending', async () => {
  const { app } = await fakeApp(); const sync = createSync(app, { WebSocketImpl: FakeWS, url: 'ws://x' }); sync.connect(); FakeWS.last.open();
  const rect = { x0: 100, z0: 100, x1: 612, z1: 612 };
  app.history.onApply([{ type: 'raster', layer: 'terrain', rect, bytes: new Uint8Array(513 * 513) }]);
  assert.equal(FakeWS.last.sent.length, 25);
  for (const frame of FakeWS.last.sent) { const d = decodeRasterOp(frame); assert.ok((d.rect.x1 - d.rect.x0 + 1) * (d.rect.z1 - d.rect.z0 + 1) <= 512 * 512); }
});
test('a server error closes the socket so the reconnect resyncs', async () => {
  const { app } = await fakeApp(); const timers = []; const texts = [];
  app.setStatus = t => texts.push(t);
  const sync = createSync(app, { WebSocketImpl: FakeWS, url: 'ws://x', setTimeoutFn: (fn, ms) => timers.push({ fn, ms }) });
  sync.connect(); const ws = FakeWS.last; ws.open();
  await sync.handleMessage(JSON.stringify({ t: 'hello', you: { name: 'a' }, seq: 1, doc: emptyDoc() }));
  await sync.handleMessage(JSON.stringify({ t: 'error', message: 'rect too large' }));
  assert.match(texts.at(-1), /rejected: rect too large — resyncing…/);
  assert.equal(ws.closes, 1); assert.equal(sync.status, 'reconnecting');       // onclose ran and scheduled a retry
  assert.equal(timers.length, 1);
});
test('five connection attempts without a hello report offline', async () => {
  const { app } = await fakeApp(); const timers = [];
  const sync = createSync(app, { WebSocketImpl: FakeWS, url: 'ws://x', setTimeoutFn: (fn, ms) => timers.push({ fn, ms }) });
  sync.connect();
  for (let i = 0; i < 4; i++) { FakeWS.last.close(); assert.equal(sync.status, 'reconnecting'); timers.shift().fn(); }
  FakeWS.last.close();
  assert.equal(sync.status, 'offline');
  assert.equal(timers[0].ms, 16_000);                                          // still retrying, backoff capped at 30 s
  timers.shift().fn(); FakeWS.last.open();
  await sync.handleMessage(JSON.stringify({ t: 'hello', you: { name: 'a' }, seq: 1, doc: emptyDoc() }));
  assert.equal(sync.status, 'connected');
  FakeWS.last.close(); assert.equal(sync.status, 'reconnecting');              // the counter reset on hello
});

test('applyRemoteOp on arrays', () => {
  const state = { ink: [], pins: [] };
  applyRemoteOp(state, { type: 'ink.add', stroke: { id: 's', color: '#000000', width: 1, points: [[0, 0]] } }); assert.equal(state.ink.length, 1);
  applyRemoteOp(state, { type: 'ink.add', stroke: { id: 's', color: '#ffffff', width: 2, points: [[1, 1]] } });   // same id replaces, no duplicate
  assert.equal(state.ink.length, 1); assert.equal(state.ink[0].color, '#ffffff');
  applyRemoteOp(state, { type: 'pin.add', pin: { id: 'p', x: 0, z: 0, type: 'fire', name: '', checked: false } });
  applyRemoteOp(state, { type: 'pin.add', pin: { id: 'p', x: 9, z: 9, type: 'fire', name: 'again', checked: false } });
  assert.equal(state.pins.length, 1); assert.equal(state.pins[0].x, 9);
  applyRemoteOp(state, { type: 'pin.update', id: 'p', patch: { name: 'N' } }); assert.equal(state.pins[0].name, 'N');
  applyRemoteOp(state, { type: 'pin.update', id: 'zzz', patch: { name: 'N' } });
  applyRemoteOp(state, { type: 'pin.remove', id: 'p' }); applyRemoteOp(state, { type: 'ink.remove', id: 's' });
  assert.deepEqual([state.ink.length, state.pins.length], [0, 0]);
});
