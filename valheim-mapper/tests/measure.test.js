import { test } from 'node:test';
import assert from 'node:assert/strict';
import { pathLength, measureSummary } from '../web/measure.js';

test('pathLength sums the segments', () => {
  assert.equal(pathLength([[0, 0]]), 0);
  assert.equal(pathLength([[0, 0], [30, 40], [30, 100]]), 110);
});

test('measureSummary reports metres, zones and a time per gait', () => {
  assert.equal(measureSummary([[0, 0]]), null);
  const s = measureSummary([[0, 0], [320, 0]]);
  assert.equal(s.metres, 320); assert.equal(s.label, '320 m · 5 zones');
  assert.deepEqual(s.rows.map(r => [r.name, r.time]), [['Walk', '3.3 min'], ['Jog', '1.3 min'], ['Sprint', '46 s'], ['Swim', '2.7 min']]);
  assert.equal(measureSummary([[0, 0], [64, 0]]).label, '64 m · 1 zone');
  assert.equal(measureSummary([[0, 0], [2000, 0]]).label, '2 km · 31 zones');
});
