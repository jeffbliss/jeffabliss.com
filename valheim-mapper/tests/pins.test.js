import { test } from 'node:test';
import assert from 'node:assert/strict';
import { nearestPin } from '../web/pins.js';

test('nearestPin returns closest within range, else null', () => {
  const pins = [{ id: 'a', x: 0, z: 0 }, { id: 'b', x: 10, z: 0 }];
  assert.equal(nearestPin(pins, 7, 0, 5).id, 'b');
  assert.equal(nearestPin(pins, 4, 0, 5).id, 'a');
  assert.equal(nearestPin(pins, 50, 50, 5), null);
});
