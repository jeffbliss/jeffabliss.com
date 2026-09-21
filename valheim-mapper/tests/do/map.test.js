import { env, runDurableObjectAlarm, runInDurableObject } from 'cloudflare:test';
import { describe, it, expect } from 'vitest';
import { encodeRasterOp, unwrapServerRaster, decodeRasterOp } from '../../web/proto.js';

const room = name => env.MAP.getByName(`test-${name}`);       // one room per test: no shared state, no ordering between tests

async function connect(stub, email) {
  const res = await stub.fetch('http://x/valheim-mapper/api/ws', { headers: { upgrade: 'websocket', 'x-user-email': email } });
  expect(res.status).toBe(101);
  const ws = res.webSocket; ws.accept();
  ws.binaryType = 'arraybuffer';           // workerd hands client sockets Blobs by default
  const queue = [], waiters = [];
  ws.addEventListener('message', e => { const m = typeof e.data === 'string' ? JSON.parse(e.data) : new Uint8Array(e.data); waiters.length ? waiters.shift()(m) : queue.push(m); });
  const next = () => queue.length ? Promise.resolve(queue.shift()) : new Promise(r => waiters.push(r));
  const until = async pred => { for (;;) { const m = await next(); if (pred(m)) return m; } };
  const drain = async (ms = 100) => { await new Promise(r => setTimeout(r, ms)); return queue.splice(0, queue.length); };
  return { ws, next, until, drain };
}

const tiles = stub => runInDurableObject(stub, (instance, ctx) => ctx.storage.sql.exec('SELECT layer, tx, tz, length(data) AS n FROM tiles').toArray());
const metaSeq = stub => runInDurableObject(stub, (instance, ctx) => ctx.storage.sql.exec("SELECT value FROM meta WHERE key = 'seq'").toArray()[0]?.value);

describe('MapRoom', () => {
  it('sends hello with identity and snapshot, then presence', async () => {
    const a = await connect(room('hello'), 'alice@example.com');
    const hello = await a.until(m => m.t === 'hello');
    expect(hello.you.name).toBe('alice'); expect(hello.doc.version).toBe(1); expect(hello.doc.pins[0].type).toBe('start');
    const presence = await a.until(m => m.t === 'presence');
    expect(presence.users.some(u => u.name === 'alice')).toBe(true);
    a.ws.close();
  });
  it('broadcasts raster and json ops to the other client and persists them', async () => {
    const stub = room('broadcast');
    const a = await connect(stub, 'alice@example.com'), b = await connect(stub, 'bob@example.com');
    await a.until(m => m.t === 'hello'); await b.until(m => m.t === 'hello');
    a.ws.send(encodeRasterOp({ layer: 0, rect: { x0: 10, z0: 10, x1: 11, z1: 10 }, bytes: new Uint8Array([2, 2]) }));
    const bin = await b.until(m => m instanceof Uint8Array);
    const { seq, name, payload } = unwrapServerRaster(bin); expect(name).toBe('alice'); expect(seq).toBeGreaterThan(0);
    expect([...decodeRasterOp(payload).bytes]).toEqual([2, 2]);
    a.ws.send(JSON.stringify({ t: 'op', op: { type: 'pin.add', pin: { id: 'p1', x: 1, z: 2, type: 'fire', name: 'Camp', checked: false } } }));
    const op = await b.until(m => m.t === 'op'); expect(op.op.pin.name).toBe('Camp'); expect(op.by.name).toBe('alice');

    expect(await runDurableObjectAlarm(stub)).toBe(true);                 // the flush alarm was scheduled and ran
    expect(await tiles(stub)).toEqual([{ layer: 0, tx: 0, tz: 0, n: 128 * 128 }]);
    expect(await metaSeq(stub)).toBe(String(op.seq));

    const c = await connect(stub, 'carol@example.com'); const hello = await c.until(m => m.t === 'hello');
    expect(hello.seq).toBe(op.seq);
    expect(hello.doc.pins.find(p => p.id === 'p1').name).toBe('Camp');
    expect(hello.doc.terrain).not.toBe(null);
    a.ws.close(); b.ws.close(); c.ws.close();
  });
  it('rejects invalid ops with an error to the sender only', async () => {
    const stub = room('reject');
    const a = await connect(stub, 'alice@example.com'), b = await connect(stub, 'bob@example.com');
    await a.until(m => m.t === 'hello'); await b.until(m => m.t === 'hello');
    a.ws.send(JSON.stringify({ t: 'op', op: { type: 'pin.remove', id: 'start' } }));
    const err = await a.until(m => m.t === 'error'); expect(err.message).toMatch(/start/);
    expect((await b.drain()).filter(m => m.t === 'error')).toEqual([]);   // the error went to the sender only
    expect(await metaSeq(stub)).toBe(undefined);                          // a rejected op does not bump seq
    a.ws.send(JSON.stringify({ t: 'cursor', x: 1, z: 2, tool: 'paint', brush: 64 }));
    const pres = await b.until(m => m.t === 'presence' && m.users.some(u => u.name === 'alice' && u.x === 1));
    expect(pres.users.find(u => u.name === 'alice').tool).toBe('paint');
    a.ws.close(); b.ws.close();
  });
  it('rejects an over-cap raster frame and a malformed one', async () => {
    const stub = room('over-cap');
    const a = await connect(stub, 'alice@example.com'); await a.until(m => m.t === 'hello');
    const rect = { x0: 100, z0: 100, x1: 612, z1: 612 };                 // 513 x 513: what an unsplit 2048 m brush would send
    a.ws.send(encodeRasterOp({ layer: 0, rect, bytes: new Uint8Array(513 * 513) }));
    expect((await a.until(m => m.t === 'error')).message).toBe('rect too large');
    a.ws.send(new Uint8Array([0, 1, 2]).buffer);                         // too short to be a frame
    expect((await a.until(m => m.t === 'error')).message).toBe('bad message');
    expect(await metaSeq(stub)).toBe(undefined);                         // neither bumped seq
    a.ws.close();
  });
  it('marks full presence rosters and leaves cursor updates as merges', async () => {
    const stub = room('presence-full');
    const a = await connect(stub, 'alice@example.com'), b = await connect(stub, 'bob@example.com');
    await a.until(m => m.t === 'hello'); await b.until(m => m.t === 'hello');
    const roster = await a.until(m => m.t === 'presence' && m.users.length === 2);
    expect(roster.full).toBe(true);
    b.ws.send(JSON.stringify({ t: 'cursor', x: 1, z: 2, tool: 'paint', brush: 64 }));
    const merge = await a.until(m => m.t === 'presence' && m.users.length === 1);
    expect(merge.full).toBe(undefined);
    a.ws.close(); b.ws.close();
  });
  it('flushes pending tiles when the last session closes', async () => {
    const stub = room('flush-on-close');
    const a = await connect(stub, 'alice@example.com'); await a.until(m => m.t === 'hello');
    a.ws.send(encodeRasterOp({ layer: 1, rect: { x0: 300, z0: 300, x1: 300, z1: 300 }, bytes: new Uint8Array([255]) }));
    await new Promise(r => setTimeout(r, 100));
    a.ws.close();
    for (let i = 0; i < 50 && (await tiles(stub)).length === 0; i++) await new Promise(r => setTimeout(r, 20));
    expect(await tiles(stub)).toEqual([{ layer: 1, tx: 2, tz: 2, n: 128 * 128 }]);
  });
});
