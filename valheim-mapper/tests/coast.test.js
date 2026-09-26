import { test } from 'node:test';
import assert from 'node:assert/strict';
import { shorePins, catmullRom, coastCommand, COAST } from '../web/coast.js';
import { createHistory } from '../web/history.js';

const near = (a, b, eps = 1e-6) => assert.ok(Math.abs(a - b) < eps, `${a} ≈ ${b}`);
const start = { id: 'start', x: 0, z: 0, type: 'start', name: '', checked: false, fixed: true };
const mk = (id, x, z, extra = {}) => ({ id, x, z, type: 'fire', name: id, checked: true, shore: true, ...extra });

test('shorePins keeps checked, tagged, non-fixed pins in clockwise order from north around spawn', () => {
  const pins = [start, mk('w', -100, 0), mk('n', 0, 100), mk('e', 100, 0), mk('s', 0, -100),
    mk('untagged', 50, 50, { shore: false }), mk('unchecked', 50, -50, { checked: false }), { ...start, shore: true, checked: true }];
  assert.deepEqual(shorePins(pins).map(p => p.id), ['n', 'e', 's', 'w']);
  assert.deepEqual(shorePins([mk('a', 10, 10)]).map(p => p.id), ['a']);
});

test('shorePins measures bearings from the fixed start pin, wherever it is', () => {
  const s2 = { ...start, x: 1000, z: 1000 };
  assert.deepEqual(shorePins([s2, mk('a', 1000, 1100), mk('b', 900, 1000)]).map(p => p.id), ['a', 'b']);
});

test('catmullRom passes through every control point and samples at about the step', () => {
  const pts = [[0, 0], [100, 0], [100, 100], [0, 100]];
  const out = catmullRom(pts, 8);
  for (const [x, z] of pts) assert.ok(out.some(([ox, oz]) => Math.hypot(ox - x, oz - z) < 0.5), `passes ${x},${z}`);
  assert.equal(out.length > 30, true);
  for (let i = 1; i < out.length; i++) assert.ok(Math.hypot(out[i][0] - out[i - 1][0], out[i][1] - out[i - 1][1]) <= 8 * 1.5 + 1e-9);
  near(out[0][0], 0); near(out[0][1], 0); near(out[out.length - 1][0], 0); near(out[out.length - 1][1], 100);
  assert.deepEqual(catmullRom([[0, 0], [10, 0]], 5).length, 3);
});

test('coastCommand adds one blue stroke through the shore pins, undoable; null with fewer than two', () => {
  const app = { state: { pins: [start, mk('a', 0, 100), mk('b', 100, 0)], ink: [] }, history: createHistory(), markDirty() {} };
  const cmd = coastCommand(app);
  assert.ok(cmd); app.history.push(cmd);
  assert.equal(app.state.ink.length, 1);
  const s = app.state.ink[0];
  assert.equal(s.color, COAST.color); assert.equal(s.width, COAST.width);
  assert.deepEqual(s.points[0], [0, 100]); assert.deepEqual(s.points[s.points.length - 1], [100, 0]);
  assert.ok(s.points.every(([x, z]) => x === +x.toFixed(1) && z === +z.toFixed(1)));
  assert.deepEqual(cmd.ops.map(o => o.type), ['ink.add']); assert.deepEqual(cmd.inverseOps.map(o => o.type), ['ink.remove']);
  app.history.undo(); assert.equal(app.state.ink.length, 0);
  app.history.redo(); assert.equal(app.state.ink.length, 1);
  assert.equal(coastCommand({ state: { pins: [start, mk('a', 0, 100)], ink: [] } }), null);
});
