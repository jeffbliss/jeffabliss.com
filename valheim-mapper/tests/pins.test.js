import { test } from 'node:test';
import assert from 'node:assert/strict';
import { nearestPin, pinOps, pinActions } from '../web/pins.js';
import { sightingGeometry } from '../web/pins.js';
import { createHistory } from '../web/history.js';

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
test('toggleShore flips the tag as one synced undoable command', () => {
  const pin = { id: 'p1', x: 0, z: 0, type: 'fire', name: '', checked: false };
  const app = { state: { pins: [pin], ink: [] }, history: createHistory(), markDirty() {}, tools: { options: { pinType: 'pin' } }, pinsLayer: { selected: null, add() {}, remove() {} } };
  const actions = pinActions(app);
  actions.toggleShore(pin);
  assert.equal(pin.shore, true);
  app.history.undo(); assert.equal(pin.shore, false);
  app.history.redo(); assert.equal(pin.shore, true);
  assert.deepEqual(pinOps.add(pin).ops[0].pin.shore, true);
});

test('removing a logged pin removes its path too, and undo restores both', () => {
  const stroke = { id: 's1', color: '#000', width: 4, points: [[0, 0], [0, 100]] }, other = { id: 's2', color: '#000', width: 4, points: [[5, 5]] };
  const pin = { id: 'p1', x: 0, z: 100, type: 'pin', name: 'log end', checked: false, log: { from: 'start', start: [0, 0], legs: 'N 25', ink: 's1' } };
  const state = { pins: [pin], ink: [other, stroke] };
  const app = { state, history: createHistory(), markDirty() {}, tools: { options: { pinType: 'pin' } }, pinsLayer: { selected: null, add() {}, remove(id) { const i = state.pins.findIndex(p => p.id === id); if (i >= 0) state.pins.splice(i, 1); } } };
  const actions = pinActions(app);
  assert.equal(actions.remove(pin), 'path');
  assert.deepEqual(state.ink.map(s => s.id), ['s2']); assert.equal(state.pins.length, 0);
  app.history.undo();
  assert.deepEqual(state.ink.map(s => s.id), ['s2', 's1']); assert.equal(state.pins[0], pin);
  app.history.redo();
  assert.deepEqual(state.ink.map(s => s.id), ['s2']);
  const gone = { ...pin, id: 'p2', log: { ...pin.log, ink: 'missing' } }; state.pins.push(gone);
  assert.equal(actions.remove(gone), true); assert.deepEqual(state.ink.map(s => s.id), ['s2']);
});
