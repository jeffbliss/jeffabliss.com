import { test } from 'node:test';
import assert from 'node:assert/strict';
import { encodeRasterOp, decodeRasterOp, wrapServerRaster, unwrapServerRaster, identityFromEmail, rectValid, LAYER } from '../web/proto.js';

test('raster op frame round-trips', () => {
  const bytes = new Uint8Array([1, 2, 3, 4, 5, 6]);
  const u8 = encodeRasterOp({ layer: 'fog', rect: { x0: 10, z0: 20, x1: 12, z1: 21 }, bytes });
  assert.equal(u8.length, 9 + 6); assert.equal(u8[0], LAYER.fog);
  const d = decodeRasterOp(u8);
  assert.equal(d.layer, 1); assert.deepEqual(d.rect, { x0: 10, z0: 20, x1: 12, z1: 21 }); assert.deepEqual([...d.bytes], [...bytes]);
});
test('decode rejects bad frames', () => {
  assert.throws(() => decodeRasterOp(new Uint8Array(3)), /raster frame/);
  const bad = encodeRasterOp({ layer: 0, rect: { x0: 0, z0: 0, x1: 1, z1: 0 }, bytes: new Uint8Array(2) });
  assert.throws(() => decodeRasterOp(bad.subarray(0, bad.length - 1)), /raster frame/);            // length mismatch
  assert.throws(() => decodeRasterOp(encodeRasterOp({ layer: 0, rect: { x0: 5, z0: 0, x1: 4, z1: 0 }, bytes: new Uint8Array(0) })), /raster frame/); // x1 < x0
  assert.throws(() => decodeRasterOp(encodeRasterOp({ layer: 0, rect: { x0: 0, z0: 0, x1: 2560, z1: 0 }, bytes: new Uint8Array(2561) })), /raster frame/);
});
test('server wrapper carries seq and author', () => {
  const payload = encodeRasterOp({ layer: 0, rect: { x0: 0, z0: 0, x1: 0, z1: 0 }, bytes: new Uint8Array([7]) });
  const w = wrapServerRaster(4242, 'jörg', payload);
  const u = unwrapServerRaster(w);
  assert.equal(u.seq, 4242); assert.equal(u.name, 'jörg'); assert.deepEqual([...u.payload], [...payload]);
});
test('identity from email is stable and sanitised', () => {
  const a = identityFromEmail('Dan.Kelshaw@example.com'), b = identityFromEmail('Dan.Kelshaw@example.com');
  assert.equal(a.name, 'Dan.Kelshaw'); assert.equal(a.color, b.color); assert.match(a.color, /^hsl\(\d+ 70% 55%\)$/);
  assert.equal(identityFromEmail('a'.repeat(40) + '@x').name.length, 24);
});
test('rectValid', () => {
  assert.ok(rectValid({ x0: 0, z0: 0, x1: 2559, z1: 2559 }));
  assert.ok(!rectValid({ x0: -1, z0: 0, x1: 0, z1: 0 })); assert.ok(!rectValid({ x0: 0, z0: 0, x1: 2560, z1: 0 })); assert.ok(!rectValid({ x0: 3, z0: 0, x1: 2, z1: 0 }));
});
