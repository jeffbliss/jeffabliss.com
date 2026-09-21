import { test } from 'node:test';
import assert from 'node:assert/strict';
import { chooseSpacing } from '../web/grid.js';

test('keeps base spacing when cells are legible, else steps to 1 km then 5 km', () => {
  assert.equal(chooseSpacing(64, 0.1), 64);        // 6.4 px
  assert.equal(chooseSpacing(64, 0.05), 1000);     // 3.2 px -> 1 km = 50 px
  assert.equal(chooseSpacing(64, 0.004), 5000);    // 1 km = 4 px -> 5 km
  assert.equal(chooseSpacing(500, 0.02), 500);
});

test('stepping up never returns a spacing smaller than baseM', () => {
  // baseM * scale = 8px, already >= minPx(6), so the base spacing itself is legible.
  assert.equal(chooseSpacing(2000, 0.004), 2000);
  // baseM * scale = 4px (illegible) and 1km * scale = 2px (still illegible) -> steps to 5km, which is >= baseM.
  assert.equal(chooseSpacing(2000, 0.002), 5000);
});
