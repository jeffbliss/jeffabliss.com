import { test } from 'node:test';
import assert from 'node:assert/strict';
import { distToSegment, hitStroke, simplify, createInk } from '../web/ink.js';

test('distToSegment handles interior and endpoint cases', () => {
  assert.equal(distToSegment(0, 1, -1, 0, 1, 0), 1);
  assert.equal(distToSegment(3, 0, -1, 0, 1, 0), 2);
  assert.equal(distToSegment(5, 5, 2, 2, 2, 2), Math.hypot(3, 3));
});

test('hitStroke respects width and tolerance and picks the nearest', () => {
  const strokes = [
    { color: '#000', width: 4, points: [[0, 0], [10, 0]] },
    { color: '#000', width: 4, points: [[0, 10], [10, 10]] },
  ];
  assert.equal(hitStroke(strokes, 5, 1.5, 0), 0);      // within half width (2)
  assert.equal(hitStroke(strokes, 5, 3, 0), -1);       // 3 > 2
  assert.equal(hitStroke(strokes, 5, 3, 1.5), 0);      // 3 <= 2 + 1.5
  assert.equal(hitStroke(strokes, 5, 8, 1), 1);
});

test('simplify drops points closer than eps to the last kept point, keeps ends', () => {
  const pts = [[0, 0], [0.1, 0], [0.2, 0], [5, 0], [5.1, 0], [10, 0], [10.05, 0]];
  assert.deepEqual(simplify(pts, 1), [[0, 0], [5, 0], [10, 0], [10.05, 0]]);
  assert.deepEqual(simplify([[1, 1]], 1), [[1, 1]]);
});

test('strokes get ids, including ones loaded without', () => {
  const strokes = [{ color: '#000000', width: 2, points: [[0, 0]] }];
  const ink = createInk(strokes); assert.match(strokes[0].id, /^[0-9a-f-]{36}$/);
  ink.begin('#000000', 4); ink.add(0, 0); ink.add(10, 0); const s = ink.end(); assert.match(s.id, /^[0-9a-f-]{36}$/);
});
