import { test } from 'node:test';
import assert from 'node:assert/strict';
import { chainFor, chainRoute, chainError, createField, warpRaster, routeRect, correctionCommand } from '../web/anchor.js';
import { createRaster } from '../web/raster.js';
import { createHistory } from '../web/history.js';

const near = (a, b, eps = 1e-6) => assert.ok(Math.abs(a - b) < eps, `${a} ≈ ${b}`);
const start = { id: 'start', x: 0, z: 0, type: 'start', name: '', checked: false, fixed: true };
const p1 = { id: 'p1', x: 0, z: 100, type: 'pin', name: 'log end ±10 m', checked: false, log: { from: 'start', start: [0, 0], legs: 'N 25', ink: 's1' } };
const p2 = { id: 'p2', x: 100, z: 100, type: 'pin', name: 'log end ±20 m', checked: false, log: { from: 'p1', start: [0, 100], legs: 'E 25', ink: 's2' } };
const s1 = { id: 's1', color: '#000', width: 4, points: [[0, 0], [0, 100]] }, s2 = { id: 's2', color: '#000', width: 4, points: [[0, 100], [100, 100]] };

test('chainFor follows log.from back to the first log; chainRoute joins the strokes', () => {
  const pins = [start, p1, p2];
  assert.deepEqual(chainFor(pins, p2).map(p => p.id), ['p1', 'p2']);
  assert.deepEqual(chainFor(pins, p1).map(p => p.id), ['p1']);
  assert.deepEqual(chainFor(pins, start), []);
  assert.deepEqual(chainRoute([p1, p2], [s1, s2]), [[0, 0], [0, 100], [100, 100]]);
  assert.deepEqual(chainRoute([p1, p2], []), [[0, 0], [0, 100], [100, 100]]);     // straight legs when the ink is gone
  const orphan = { ...p2, log: { ...p2.log, from: 'missing' } };
  assert.deepEqual(chainFor([start, orphan], orphan).map(p => p.id), ['p2']);
  assert.equal(chainError([p1, p2]), 20);
  assert.deepEqual(chainFor([start, { ...p1, checked: true }, p2], p2).map(p => p.id), ['p2']);   // a checked pin is verified: the chain stops there
  assert.deepEqual(chainFor([start, p1, { ...p2, checked: true }], { ...p2, checked: true }).map(p => p.id), ['p1', 'p2']);
});

test('createField: start fixed, end moves by the full correction, fades to nothing beyond 2R', () => {
  const f = createField([[0, 0], [0, 100], [100, 100]], 20, -40, 10);
  assert.equal(f(0, 0), null);
  assert.deepEqual(f(100, 100), [20, -40]);
  const mid = f(0, 100); near(mid[0], 10); near(mid[1], -20);
  const off = f(115, 100); near(off[0], 10); near(off[1], -20);                    // 15 m off the route: halfway through the fade
  assert.equal(f(150, 100), null);
});

test('warpRaster moves a painted block by the field and leaves the rest alone', () => {
  const r = createRaster({ cells: 64, cellM: 1 });
  for (let z = 30; z < 34; z++) for (let x = 10; x < 14; x++) r.data[z * 64 + x] = 5;
  const shift = () => [4, 0];
  assert.ok(warpRaster(r, shift, routeRect(r, [[-25, -5], [-15, 5]], 10)));
  assert.equal(r.get(-16.5, 0.5), 5); assert.equal(r.get(-21.5, 0.5), 0);       // block (was x −22…−18) moved 4 m east
  assert.equal(r.get(-14.5, 0.5), 5); assert.equal(r.get(-13.5, 0.5), 0);
  assert.equal(r.get(10.5, 10.5), 0);
});

test('correctionCommand: end pin lands on target, chain pins, ink and terrain move, undo restores', () => {
  const terrain = createRaster({ cells: 128, cellM: 4 }), fog = createRaster({ cells: 128, cellM: 4 });
  const pins = [{ ...start }, { ...p1 }, { ...p2 }], ink = [{ ...s1 }, { ...s2 }];
  const ti = terrain.toCell(100, 100); terrain.data[ti[1] * 128 + ti[0]] = 3;    // a painted cell under the end pin
  const app = { state: { terrain, fog, pins, ink }, history: createHistory() };
  const cmd = correctionCommand(app, pins[2], [100, 60]);                            // 40 m too far north: pull the end back
  assert.ok(cmd);
  assert.deepEqual([pins[2].x, pins[2].z], [100, 60]);
  assert.deepEqual([pins[1].x, pins[1].z], [0, 80]);                                  // halfway along the route: half the correction
  assert.deepEqual([pins[0].x, pins[0].z], [0, 0]);
  assert.deepEqual(ink[1].points, [[0, 80], [100, 60]]);
  assert.deepEqual(ink[0].points, [[0, 0], [0, 80]]);
  assert.equal(terrain.get(100, 60), 3);
  assert.deepEqual([...new Set(cmd.ops.map(o => o.type))].sort(), ['ink.add', 'pin.update', 'raster']);
  app.history.push(cmd); app.history.undo();
  assert.deepEqual([pins[2].x, pins[2].z], [100, 100]); assert.deepEqual(ink[1].points, [[0, 100], [100, 100]]);
  assert.equal(terrain.get(100, 100), 3); assert.equal(terrain.get(100, 60), 0);
  assert.equal(correctionCommand(app, pins[0], [5, 5]), null);
});
