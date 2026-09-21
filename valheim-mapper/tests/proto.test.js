import { test } from 'node:test';
import assert from 'node:assert/strict';
import { encodeRasterOp, decodeRasterOp, wrapServerRaster, unwrapServerRaster, identityFromEmail, rectValid, rectArea, splitRasterOp, MAX_RECT_AREA, LAYER } from '../web/proto.js';

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
/** Paints every piece back into a full-rect buffer; the result must equal the original bytes. */
function reassemble(pieces, rect) {
  const width = rect.x1 - rect.x0 + 1, out = new Uint8Array(rectArea(rect));
  for (const p of pieces) {
    const w = p.rect.x1 - p.rect.x0 + 1, h = p.rect.z1 - p.rect.z0 + 1;
    for (let r = 0; r < h; r++) out.set(p.bytes.subarray(r * w, r * w + w), (p.rect.z0 - rect.z0 + r) * width + (p.rect.x0 - rect.x0));
  }
  return out;
}

test('splitRasterOp leaves a small op alone', () => {
  const op = { type: 'raster', layer: 'fog', rect: { x0: 130, z0: 130, x1: 160, z1: 160 }, bytes: new Uint8Array(31 * 31) };
  const parts = splitRasterOp(op);
  assert.equal(parts.length, 1); assert.equal(parts[0], op);
});

test('splitRasterOp tiles an over-cap op and the pieces reassemble to the original', () => {
  const rect = { x0: 100, z0: 100, x1: 612, z1: 612 };                 // 513 x 513, a 2048 m brush
  assert.ok(rectArea(rect) > MAX_RECT_AREA);
  const bytes = new Uint8Array(rectArea(rect)); for (let i = 0; i < bytes.length; i++) bytes[i] = i % 251;
  const parts = splitRasterOp({ type: 'raster', layer: 'terrain', rect, bytes });
  assert.equal(parts.length, 25);                                      // tiles 0..4 on each axis
  for (const p of parts) {
    assert.equal(p.layer, 'terrain'); assert.equal(p.type, 'raster');
    assert.ok(p.rect.x1 - p.rect.x0 + 1 <= 128 && p.rect.z1 - p.rect.z0 + 1 <= 128);
    assert.ok(rectArea(p.rect) <= MAX_RECT_AREA);
    assert.equal(p.bytes.length, rectArea(p.rect));
    assert.equal(Math.floor(p.rect.x0 / 128), Math.floor(p.rect.x1 / 128));   // tile-aligned: no piece straddles a tile
    assert.equal(Math.floor(p.rect.z0 / 128), Math.floor(p.rect.z1 / 128));
  }
  assert.equal(parts.reduce((n, p) => n + rectArea(p.rect), 0), rectArea(rect));
  assert.deepEqual([...reassemble(parts, rect)], [...bytes]);
});

test('rectValid', () => {
  assert.ok(rectValid({ x0: 0, z0: 0, x1: 2559, z1: 2559 }));
  assert.ok(!rectValid({ x0: -1, z0: 0, x1: 0, z1: 0 })); assert.ok(!rectValid({ x0: 0, z0: 0, x1: 2560, z1: 0 })); assert.ok(!rectValid({ x0: 3, z0: 0, x1: 2, z1: 0 }));
});
