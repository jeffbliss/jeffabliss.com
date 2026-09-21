import { test } from 'node:test';
import assert from 'node:assert/strict';
import { createLayers } from '../web/layers.js';

test('add/insertBefore preserve live visible accessors', () => {
  const settings = { grid: { visible: true } };
  const L = createLayers();
  const grid = L.add({ id: 'grid', name: 'Grid', get visible() { return settings.grid.visible; }, set visible(v) { settings.grid.visible = v; }, draw() {} });
  settings.grid.visible = false;
  assert.equal(grid.visible, false);                 // reads live
  grid.visible = true;
  assert.equal(settings.grid.visible, true);         // writes through
  L.applySettings({ grid: { visible: false } });
  assert.equal(settings.grid.visible, false);        // applySettings goes through the setter
  const plain = L.add({ id: 'p', name: 'P', draw() {} });
  assert.equal(plain.visible, true); assert.equal(plain.opacity, 1);
  L.insertBefore('p', { id: 'q', name: 'Q', draw() {} });
  assert.deepEqual(L.list.map(l => l.id), ['grid', 'q', 'p']);
});

test('draw skips invisible layers and presets alpha', () => {
  const L = createLayers(); const calls = [];
  const ctx = { save() {}, restore() {}, setTransform() {}, globalAlpha: 1 };
  L.add({ id: 'a', name: 'A', opacity: 0.5, draw(c) { calls.push(['a', c.globalAlpha]); } });
  L.add({ id: 'b', name: 'B', visible: false, draw() { calls.push(['b']); } });
  L.draw(ctx, {}, 10, 10);
  assert.deepEqual(calls, [['a', 0.5]]);
});
