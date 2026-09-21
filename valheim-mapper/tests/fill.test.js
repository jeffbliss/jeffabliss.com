import { test } from 'node:test';
import assert from 'node:assert/strict';
import { createRaster } from '../web/raster.js';
import { createHistory } from '../web/history.js';
import { inkWalls, floodRegion, fillAt } from '../web/fill.js';

// 20×20 cells of 1 m centred on the origin; a radius of 100 keeps every cell inside the "world".
const world = () => ({ terrain: createRaster({ cells: 20, cellM: 1 }), fog: createRaster({ cells: 20, cellM: 1 }), ink: [] });
const ring = (r, x0, z0, x1, z1, v) => { for (let z = z0; z <= z1; z++) for (let x = x0; x <= x1; x++) if (x === x0 || x === x1 || z === z0 || z === z1) r.data[z * r.cells + x] = v; };

test('fills a region enclosed by painted cells, and reveals fog there', () => {
  const w = world(); ring(w.terrain, 5, 5, 10, 10, 2);           // a 6×6 ring of Black Forest
  const cmd = fillAt(w, -2.5, -2.5, 1, { radius: 100 });         // cell (7,7) is inside
  assert.ok(!cmd.error);
  assert.equal(w.terrain.data[7 * 20 + 7], 1); assert.equal(w.terrain.data[6 * 20 + 6], 1); assert.equal(w.terrain.data[5 * 20 + 5], 2);
  assert.equal(w.terrain.data[3 * 20 + 3], 0); assert.equal(w.fog.data[7 * 20 + 7], 255); assert.equal(w.fog.data[3 * 20 + 3], 0);
  assert.deepEqual(cmd.ops.map(o => o.layer), ['terrain', 'fog']);
  const h = createHistory(); h.push(cmd); h.undo();
  assert.equal(w.terrain.data[7 * 20 + 7], 0); assert.equal(w.fog.data[7 * 20 + 7], 0);
});

test('refuses a region that reaches the edge of the world or is too large', () => {
  const w = world();
  assert.match(floodRegion(w.terrain, 0.5, 0.5, null, { radius: 100, maxCells: 50 }).error, /too large/);
  assert.match(floodRegion(w.terrain, 0.5, 0.5, null, { radius: 5 }).error, /edge of the world/);
  assert.equal(w.terrain.data.some(v => v), false);              // nothing painted
  assert.ok(fillAt(w, 0.5, 0.5, 1, { radius: 5 }).error);
});

test('ink strokes act as walls', () => {
  const w = world();
  // a square of ink 1 m wide around cells 4..11 (world -6..2)
  w.ink.push({ id: 'a', width: 1, color: '#000', points: [[-6, -6], [2, -6], [2, 2], [-6, 2], [-6, -6]] });
  const walls = inkWalls(w.terrain, w.ink);
  assert.equal(walls[(4) * 20 + 8], 1);                          // on the line
  assert.equal(walls[(8) * 20 + 8], 0);                          // inside
  const cmd = fillAt(w, -2.5, -2.5, 5, { radius: 100 });
  assert.ok(!cmd.error);
  assert.equal(w.terrain.data[8 * 20 + 8], 5); assert.equal(w.terrain.data[2 * 20 + 2], 0);
  assert.match(fillAt(w, -6, -6, 5, { radius: 100 }).error, /ink line/);
});

test('the Fog swatch re-fogs the region without touching terrain', () => {
  const w = world(); ring(w.terrain, 5, 5, 10, 10, 2); w.fog.data.fill(255);
  const cmd = fillAt(w, -2.5, -2.5, 'fog', { radius: 100 });
  assert.deepEqual(cmd.ops.map(o => o.layer), ['fog']);
  assert.equal(w.fog.data[7 * 20 + 7], 0); assert.equal(w.fog.data[5 * 20 + 5], 255); assert.equal(w.terrain.data[7 * 20 + 7], 0);
});
