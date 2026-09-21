import { test } from 'node:test';
import assert from 'node:assert/strict';
import { interpolate, isTypingTarget } from '../web/tools.js';

test('interpolate spaces points at most step apart and ends at b', () => {
  const pts = interpolate(0, 0, 10, 0, 3);
  assert.equal(pts.length, 4);
  assert.deepEqual(pts.at(-1), [10, 0]);
  for (let i = 1; i < pts.length; i++) assert.ok(Math.hypot(pts[i][0] - pts[i - 1][0], pts[i][1] - pts[i - 1][1]) <= 3 + 1e-9);
  assert.deepEqual(interpolate(1, 1, 1, 1, 5), [[1, 1]]);       // zero distance still yields the end point
});

test('isTypingTarget only blocks text-entry elements', () => {
  const ev = (tagName, extra = {}) => ({ target: { tagName, isContentEditable: false, ...extra } });
  assert.equal(isTypingTarget(ev('BUTTON')), false);
  assert.equal(isTypingTarget(ev('BODY')), false);
  assert.equal(isTypingTarget(ev('INPUT', { type: 'range' })), false);
  assert.equal(isTypingTarget(ev('INPUT', { type: 'checkbox' })), false);
  assert.equal(isTypingTarget(ev('INPUT', { type: 'text' })), true);
  assert.equal(isTypingTarget(ev('INPUT', { type: 'number' })), true);
  assert.equal(isTypingTarget(ev('TEXTAREA')), true);
  assert.equal(isTypingTarget(ev('DIV', { isContentEditable: true })), true);
  assert.equal(isTypingTarget({ target: null }), false);
});

import { rasterBrushTool } from '../web/tools.js';
import { createRaster } from '../web/raster.js';
import { createHistory } from '../web/history.js';
import { revealFn } from '../web/fog.js';

test('painting also reveals fog under the brush, as one undoable command', () => {
  const terrain = createRaster({ cells: 20, cellM: 1 }), fog = createRaster({ cells: 20, cellM: 1 });
  let dirty = 0;
  const app = { history: createHistory(), tools: { options: { brush: 2 } }, markDirty: () => dirty++ };
  const tool = rasterBrushTool(app, terrain, 'paint', () => () => 3, () => () => 0, { raster: fog, fn: revealFn });
  const ev = { button: 0, altKey: false };
  tool.down(ev, 0.5, 0.5); tool.move(ev, 3.5, 0.5); tool.up(ev);
  assert.equal(terrain.get(0.5, 0.5), 3); assert.equal(fog.get(0.5, 0.5), 255);
  assert.equal(fog.get(3.5, 0.5), 255); assert.equal(fog.get(-8.5, -8.5), 0);
  assert.equal(dirty, 1); assert.ok(app.history.canUndo());
  app.history.undo();
  assert.equal(terrain.get(0.5, 0.5), 0); assert.equal(fog.get(0.5, 0.5), 0);
  app.history.redo();
  assert.equal(terrain.get(0.5, 0.5), 3); assert.equal(fog.get(0.5, 0.5), 255);
  // erasing terrain (right button) does not re-fog
  tool.down({ button: 2, altKey: false }, 0.5, 0.5); tool.up(ev);
  assert.equal(terrain.get(0.5, 0.5), 0); assert.equal(fog.get(0.5, 0.5), 255);
});

import { paintTool } from '../web/tools.js';
import { refogFn } from '../web/fog.js';

test('paint tool: the Fog swatch re-fogs without touching terrain; right drag with it reveals', () => {
  const terrain = createRaster({ cells: 20, cellM: 1 }), fog = createRaster({ cells: 20, cellM: 1 });
  const app = { history: createHistory(), tools: { options: { brush: 2, biome: 1 } }, markDirty: () => {} };
  const terrainBrush = rasterBrushTool(app, terrain, 'paint', () => () => app.tools.options.biome, () => () => 0, { raster: fog, fn: revealFn });
  const fogBrush = rasterBrushTool(app, fog, 'fog', () => refogFn, () => revealFn);
  const tool = paintTool(app, terrainBrush, fogBrush);
  const left = { button: 0, altKey: false }, right = { button: 2, altKey: false };
  tool.down(left, 0.5, 0.5); tool.up(left);                       // meadows: paints + reveals
  assert.equal(terrain.get(0.5, 0.5), 1); assert.equal(fog.get(0.5, 0.5), 255);
  app.tools.options.biome = 'fog';
  tool.down(left, 0.5, 0.5); tool.up(left);                       // fog swatch: re-fogs, terrain untouched
  assert.equal(fog.get(0.5, 0.5), 0); assert.equal(terrain.get(0.5, 0.5), 1);
  app.history.undo(); assert.equal(fog.get(0.5, 0.5), 255);
  app.history.redo(); assert.equal(fog.get(0.5, 0.5), 0);
  tool.down(right, 0.5, 0.5); tool.up(right);                     // right drag with fog swatch reveals again
  assert.equal(fog.get(0.5, 0.5), 255);
});
