import { test } from 'node:test';
import assert from 'node:assert/strict';
import { wedge, clip, region, estimate, contributing, HALF } from '../web/sight.js';

const near = (a, b, eps = 1e-6) => assert.ok(Math.abs(a - b) < eps, `${a} ≈ ${b}`);
const insidePolygon = (poly, x, z) => { const s = poly.map(([ax, az], i) => { const [bx, bz] = poly[(i + 1) % poly.length]; return Math.sign((bx - ax) * (z - az) - (bz - az) * (x - ax)); }); return s.every(v => v === s[0]); };
const inside = (planes, x, z) => planes.every(h => (x - h.px) * h.nx + (z - h.pz) * h.nz >= -1e-9);
const A = { id: 'a', x: 0, z: 0, checked: true }, B = { id: 'b', x: 200, z: 0, checked: true }, C = { id: 'c', x: 0, z: 200, checked: false };

test('wedge contains a point dead ahead and excludes one just outside the half-width', () => {
  const w = wedge(A, 0);                                   // north
  assert.equal(HALF, 11.25);
  assert.ok(inside(w, 0, 100));
  assert.ok(inside(w, 100 * Math.sin(10 * Math.PI / 180), 100 * Math.cos(10 * Math.PI / 180)));
  assert.ok(!inside(w, 100 * Math.sin(12 * Math.PI / 180), 100 * Math.cos(12 * Math.PI / 180)));
  assert.ok(!inside(w, 0, -100));
  const e = wedge(A, 90);                                  // east: +x
  assert.ok(inside(e, 100, 0)); assert.ok(!inside(e, 0, 100));
});

test('clip keeps the part of a square on the inside of a half-plane', () => {
  const sq = [[-1, -1], [1, -1], [1, 1], [-1, 1]];
  const half = clip(sq, { px: 0, pz: 0, nx: 1, nz: 0 });   // keep x ≥ 0
  assert.equal(half.length, 4);
  assert.ok(half.every(([x]) => x >= -1e-9));
  assert.deepEqual(clip(sq, { px: 5, pz: 0, nx: 1, nz: 0 }), []);
});

test('two perpendicular sightings give a diamond whose centroid is the true point', () => {
  const target = [100, 100];                                // NE of A at 45°, NW of B at 315°
  const s = [{ from: 'a', bearing: 45 }, { from: 'b', bearing: 315 }];
  const r = region(s, [A, B]);
  assert.ok(r.polygon.length >= 4);
  const est = estimate(r);
  assert.ok(insidePolygon(r.polygon, ...target));                            // the true point lies in the overlap
  near(est.x, target[0], 5); near(est.z, target[1], 5);                       // the kite is longer on the far side, so the centroid sits just past it
  assert.ok(est.error > 20 && est.error < 60, `error ${est.error}`);   // ±11.25° at ~141 m: the far vertex is ~50 m out
});

test('sightings one compass point apart are unbounded: no estimate', () => {
  const r = region([{ from: 'a', bearing: 0 }, { from: 'b', bearing: 22.5 }], [A, B]);
  assert.equal(estimate(r), null);
});

test('a single sighting is unbounded; opposing sightings that cannot meet give an empty region', () => {
  assert.equal(estimate(region([{ from: 'a', bearing: 0 }], [A, B])), null);
  const r = region([{ from: 'a', bearing: 0 }, { from: 'b', bearing: 180 }], [A, B]);   // A looks north, B looks south: never cross
  assert.deepEqual(r.polygon, []);
  assert.equal(estimate(r), null);
});

test('contributing skips missing and unchecked observers', () => {
  const s = [{ from: 'a', bearing: 0 }, { from: 'c', bearing: 90 }, { from: 'zzz', bearing: 90 }];
  const c = contributing(s, [A, B, C]);
  assert.deepEqual(c.map(x => x.from), ['a']);
  assert.equal(c[0].observer, A);
});
