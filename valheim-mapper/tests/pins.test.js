import { test } from 'node:test';
import assert from 'node:assert/strict';
import { nearestPin, pinOps } from '../web/pins.js';

test('nearestPin returns closest within range, else null', () => {
  const pins = [{ id: 'a', x: 0, z: 0 }, { id: 'b', x: 10, z: 0 }];
  assert.equal(nearestPin(pins, 7, 0, 5).id, 'b');
  assert.equal(nearestPin(pins, 4, 0, 5).id, 'a');
  assert.equal(nearestPin(pins, 50, 50, 5), null);
});

test('pinOps builds op/inverse pairs', () => {
  const pin = { id: 'p', x: 1, z: 2, type: 'fire', name: 'a', checked: false };
  assert.deepEqual(pinOps.add(pin), { ops: [{ type: 'pin.add', pin }], inverseOps: [{ type: 'pin.remove', id: 'p' }] });
  assert.deepEqual(pinOps.remove(pin), { ops: [{ type: 'pin.remove', id: 'p' }], inverseOps: [{ type: 'pin.add', pin }] });
  assert.deepEqual(pinOps.update(pin, { name: 'b' }, { name: 'a' }), { ops: [{ type: 'pin.update', id: 'p', patch: { name: 'b' } }], inverseOps: [{ type: 'pin.update', id: 'p', patch: { name: 'a' } }] });
});
