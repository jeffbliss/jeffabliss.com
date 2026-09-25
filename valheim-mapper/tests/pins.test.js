import { test } from 'node:test';
import assert from 'node:assert/strict';
import { nearestPin, pinOps } from '../web/pins.js';
import { sightingGeometry } from '../web/pins.js';

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

test('sightingGeometry gathers contributing wedges, the region and the estimate', () => {
  const a = { id: 'a', x: 0, z: 0, checked: true }, b = { id: 'b', x: 200, z: 0, checked: true }, c = { id: 'c', x: 0, z: 200, checked: false };
  const t = { id: 't', x: 90, z: 90, sightings: [{ from: 'a', bearing: 45 }, { from: 'b', bearing: 315 }, { from: 'c', bearing: 180 }] };
  const g = sightingGeometry(t, [a, b, c, t]);
  assert.equal(g.wedges.length, 2);
  assert.ok(g.polygon.length >= 4);
  assert.ok(Math.abs(g.estimate.x - 100) < 1e-6 && Math.abs(g.estimate.z - 100) < 5);   // kite sits past the true point, as in sight.test.js
  assert.equal(sightingGeometry({ id: 'u', x: 0, z: 0 }, [a]).estimate, null);
});
