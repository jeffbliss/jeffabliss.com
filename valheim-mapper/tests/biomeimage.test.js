import { test } from 'node:test';
import assert from 'node:assert/strict';
import { deflateSync } from 'node:zlib';
import { decodeRgbPng, palette, classify, sampler, paintExplored, calibrate } from '../scripts/lib/biomeimage.mjs';

const crcTable = (() => { const t = new Uint32Array(256); for (let n = 0; n < 256; n++) { let c = n; for (let k = 0; k < 8; k++) c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1; t[n] = c >>> 0; } return t; })();
const crc = bytes => { let c = 0xffffffff; for (const b of bytes) c = crcTable[(c ^ b) & 255] ^ (c >>> 8); return (c ^ 0xffffffff) >>> 0; };
const u32 = v => [(v >>> 24) & 255, (v >>> 16) & 255, (v >>> 8) & 255, v & 255];
const chunk = (type, data) => { const t = [...type].map(c => c.charCodeAt(0)); return [...u32(data.length), ...t, ...data, ...u32(crc([...t, ...data]))]; };
/** Tiny RGB PNG encoder for tests: filter 2 (Up) on odd rows to exercise the decoder. */
function encodeRgb(width, height, rgb) {
  const raw = []; for (let y = 0; y < height; y++) { const f = y % 2 ? 2 : 0; raw.push(f); for (let x = 0; x < width * 3; x++) { const v = rgb[y * width * 3 + x], up = y ? rgb[(y - 1) * width * 3 + x] : 0; raw.push(f ? (v - up) & 255 : v); } }
  const ihdr = [...u32(width), ...u32(height), 8, 2, 0, 0, 0];
  return new Uint8Array([137, 80, 78, 71, 13, 10, 26, 10, ...chunk('IHDR', ihdr), ...chunk('IDAT', [...deflateSync(Buffer.from(raw))]), ...chunk('IEND', [])]);
}

test('decodeRgbPng round-trips an RGB image with Up filtering', () => {
  const w = 4, h = 3, rgb = new Uint8Array(w * h * 3); for (let i = 0; i < rgb.length; i++) rgb[i] = (i * 37) & 255;
  const img = decodeRgbPng(encodeRgb(w, h, rgb));
  assert.equal(img.width, w); assert.equal(img.height, h); assert.deepEqual([...img.rgb], [...rgb]);
});

test('classify picks the nearest palette colour and marks far colours unknown', () => {
  const pal = palette({ '#00ff00': 1, '#000080': 9 });
  const cls = classify({ width: 3, height: 1, rgb: new Uint8Array([0, 250, 5, 0, 0, 120, 200, 200, 200]) }, pal);
  assert.deepEqual([...cls.ids], [1, 9, 255]);
});

test('sampler maps world coordinates with north up and paintExplored fills only revealed cells', () => {
  const cells = 4, cellM = 8;                                                     // world −16..16
  const cls = { width: 4, height: 4, ids: new Uint8Array(16).fill(9) }; cls.ids[0 * 4 + 3] = 1;   // north-east pixel is meadows
  const s = sampler(cls, { metresPerPixel: 8 });
  assert.equal(s(12, 12), 1); assert.equal(s(-12, -12), 9); assert.equal(s(100, 0), 255);
  const terrain = new Uint8Array(16), fog = new Uint8Array(16); fog[3 * cells + 3] = 255; fog[0] = 255;   // cell (3,3) = NE, cell (0,0) = SW
  const counts = paintExplored(terrain, fog, s, { cells, cellM });
  assert.deepEqual(counts, { 1: 1, 9: 1 }); assert.equal(terrain[15], 1); assert.equal(terrain[0], 9); assert.equal(terrain[5], 0);
});

test('calibrate recovers scale and shift that put explored cells on land', () => {
  const cells = 64, cellM = 8, W = 32;                                              // world 512 m, image 32 px
  const ids = new Uint8Array(W * W).fill(9); for (let py = 8; py < 24; py++) for (let px = 12; px < 28; px++) ids[py * W + px] = 1;   // land block, offset east
  const cls = { width: W, height: W, ids };
  const truth = { metresPerPixel: 16, cx: -64, cz: 0 };                             // image centre sits 64 m west of the world origin
  const s = sampler(cls, truth), fog = new Uint8Array(cells * cells);
  for (let cz = 0; cz < cells; cz++) for (let cx = 0; cx < cells; cx++) { const x = (cx + 0.5) * cellM - 256, z = (cz + 0.5) * cellM - 256; if (s(x, z) === 1) fog[cz * cells + cx] = 255; }
  const best = calibrate(cls, fog, { mppGuess: 15, mppRange: 0.2, mppSteps: 9, shiftRange: 80, shiftStep: 16, cells, cellM, sampleEvery: 1 });
  assert.ok(Math.abs(best.metresPerPixel - 16) < 0.6, `mpp ${best.metresPerPixel}`); assert.ok(Math.abs(best.cx + 64) <= 16, `cx ${best.cx}`); assert.ok(best.score > 0.95);
});
