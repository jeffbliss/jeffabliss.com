import { env, runDurableObjectAlarm } from 'cloudflare:test';
import { describe, it, expect } from 'vitest';
import { encodeRasterOp, unwrapServerRaster, decodeRasterOp } from '../../web/proto.js';

async function connect(email) {
  const stub = env.MAP.getByName('main');
  const res = await stub.fetch('http://x/valheim-mapper/api/ws', { headers: { upgrade: 'websocket', 'x-user-email': email } });
  expect(res.status).toBe(101);
  const ws = res.webSocket; ws.accept();
  ws.binaryType = 'arraybuffer';           // workerd hands client sockets Blobs by default
  const queue = [], waiters = [];
  ws.addEventListener('message', e => { const m = typeof e.data === 'string' ? JSON.parse(e.data) : new Uint8Array(e.data); waiters.length ? waiters.shift()(m) : queue.push(m); });
  const next = () => queue.length ? Promise.resolve(queue.shift()) : new Promise(r => waiters.push(r));
  const until = async pred => { for (;;) { const m = await next(); if (pred(m)) return m; } };
  return { ws, next, until };
}

describe('MapRoom', () => {
  it('sends hello with identity and snapshot, then presence', async () => {
    const a = await connect('alice@example.com');
    const hello = await a.until(m => m.t === 'hello');
    expect(hello.you.name).toBe('alice'); expect(hello.doc.version).toBe(1); expect(hello.doc.pins[0].type).toBe('start');
    const presence = await a.until(m => m.t === 'presence');
    expect(presence.users.some(u => u.name === 'alice')).toBe(true);
    a.ws.close();
  });
  it('broadcasts raster and json ops to the other client and persists them', async () => {
    const a = await connect('alice@example.com'), b = await connect('bob@example.com');
    await a.until(m => m.t === 'hello'); await b.until(m => m.t === 'hello');
    a.ws.send(encodeRasterOp({ layer: 0, rect: { x0: 10, z0: 10, x1: 11, z1: 10 }, bytes: new Uint8Array([2, 2]) }));
    const bin = await b.until(m => m instanceof Uint8Array);
    const { seq, name, payload } = unwrapServerRaster(bin); expect(name).toBe('alice'); expect(seq).toBeGreaterThan(0);
    expect([...decodeRasterOp(payload).bytes]).toEqual([2, 2]);
    a.ws.send(JSON.stringify({ t: 'op', op: { type: 'pin.add', pin: { id: 'p1', x: 1, z: 2, type: 'fire', name: 'Camp', checked: false } } }));
    const op = await b.until(m => m.t === 'op'); expect(op.op.pin.name).toBe('Camp'); expect(op.by.name).toBe('alice');
    await runDurableObjectAlarm(env.MAP.getByName('main'));
    const c = await connect('carol@example.com'); const hello = await c.until(m => m.t === 'hello');
    expect(hello.doc.pins.find(p => p.id === 'p1').name).toBe('Camp');
    expect(hello.doc.terrain).not.toBe(null);
    a.ws.close(); b.ws.close(); c.ws.close();
  });
  it('rejects invalid ops with an error to the sender only', async () => {
    const a = await connect('alice@example.com'), b = await connect('bob@example.com');
    await a.until(m => m.t === 'hello'); await b.until(m => m.t === 'hello');
    a.ws.send(JSON.stringify({ t: 'op', op: { type: 'pin.remove', id: 'start' } }));
    const err = await a.until(m => m.t === 'error'); expect(err.message).toMatch(/start/);
    a.ws.send(JSON.stringify({ t: 'cursor', x: 1, z: 2, tool: 'paint', brush: 64 }));
    const pres = await b.until(m => m.t === 'presence' && m.users.some(u => u.name === 'alice' && u.x === 1));
    expect(pres.users.find(u => u.name === 'alice').tool).toBe('paint');
    a.ws.close(); b.ws.close();
  });
});
