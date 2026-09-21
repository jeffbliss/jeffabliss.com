import { test } from 'node:test';
import assert from 'node:assert/strict';
import { chooseSpacing } from '../web/grid.js';

test('keeps base spacing when cells are legible, else steps to 1 km then 5 km', () => {
  assert.equal(chooseSpacing(64, 0.1), 64);        // 6.4 px
  assert.equal(chooseSpacing(64, 0.05), 1000);     // 3.2 px -> 1 km = 50 px
  assert.equal(chooseSpacing(64, 0.004), 5000);    // 1 km = 4 px -> 5 km
  assert.equal(chooseSpacing(500, 0.02), 500);
});
