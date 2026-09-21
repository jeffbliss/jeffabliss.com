import { test } from 'node:test';
import assert from 'node:assert/strict';
import { encodeGray, decodeGray, toBase64, fromBase64 } from '../web/png.js';

test('round-trips an 8-bit grayscale image', async () => {
  const w = 37, h = 11, data = new Uint8Array(w * h).map((_, i) => (i * 7) & 0xff);
  const png = await encodeGray(data, w, h);
  assert.deepEqual([...png.subarray(0, 8)], [137, 80, 78, 71, 13, 10, 26, 10]);
  const out = await decodeGray(png);
  assert.equal(out.width, w); assert.equal(out.height, h);
  assert.deepEqual(out.data, data);
});

test('round-trips a full-size 2560x2560 raster', async () => {
  const n = 2560, data = new Uint8Array(n * n); data.fill(9, 1000, 2_000_000);
  const out = await decodeGray(await encodeGray(data, n, n));
  assert.deepEqual(out.data, data);
});

test('rejects non-grayscale PNGs', async () => {
  const w = 2, h = 2, png = await encodeGray(new Uint8Array(4), w, h);
  png[8 + 8 + 9] = 2; // colour type byte inside IHDR -> truecolour
  await assert.rejects(decodeGray(png), /grayscale/);
});

test('rejects a buffer with the wrong signature', async () => {
  const bad = new Uint8Array([1, 2, 3, 4, 5, 6, 7, 8, 9, 10]);
  await assert.rejects(decodeGray(bad), /signature/);
});

test('rejects an IHDR claiming an unreasonably large image', async () => {
  const png = await encodeGray(new Uint8Array(4), 2, 2);
  const dv = new DataView(png.buffer, png.byteOffset, png.length);
  dv.setUint32(16, 100000); // IHDR width, offset 8 (sig) + 8 (len+type) = 16
  dv.setUint32(20, 100000); // IHDR height
  await assert.rejects(decodeGray(png), /too large/);
});

test('base64 helpers round-trip binary', () => {
  const bytes = new Uint8Array(70000).map((_, i) => i & 0xff);
  assert.deepEqual(fromBase64(toBase64(bytes)), bytes);
});
