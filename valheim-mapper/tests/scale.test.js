import { test } from 'node:test';
import assert from 'node:assert/strict';
import { niceDistance, fmtDistance, fmtTime, scaleBarInfo } from '../web/scale.js';

test('niceDistance picks the largest 1/2/5 step that fits', () => {
  assert.equal(niceDistance(1, 140), 100);        // 140 m max -> 100
  assert.equal(niceDistance(0.05, 140), 2000);    // 2800 m max -> 2 km
  assert.equal(niceDistance(0.25, 140), 500);     // 560 m max -> 500
  assert.equal(niceDistance(2, 140), 50);         // 70 m max -> 50
});

test('formats distances and times for the label', () => {
  assert.equal(fmtDistance(500), '500 m'); assert.equal(fmtDistance(2000), '2 km'); assert.equal(fmtDistance(2500), '2.5 km');
  assert.equal(fmtTime(12.4), '12 s'); assert.equal(fmtTime(125), '2.1 min'); assert.equal(fmtTime(3600), '1 h');
});

test('scaleBarInfo reports jog time and a row per gait', () => {
  const i = scaleBarInfo(0.25);                    // 500 m
  assert.equal(i.px, 125); assert.equal(i.jog, '2.1 min');
  assert.deepEqual(i.rows.map(r => r.name), ['Walk', 'Jog', 'Sprint', 'Swim']);
  assert.equal(i.rows.find(r => r.name === 'Sprint').time, '1.2 min');
});
