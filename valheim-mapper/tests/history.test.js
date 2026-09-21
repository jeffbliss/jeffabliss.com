import { test } from 'node:test';
import assert from 'node:assert/strict';
import { createHistory, createStrokeRecorder, combine } from '../web/history.js';
import { createRaster } from '../web/raster.js';

const cmd = (log, n) => ({ label: `c${n}`, undo: () => log.push(`u${n}`), redo: () => log.push(`r${n}`) });

test('undo/redo order and redo stack clearing', () => {
  const h = createHistory(), log = [];
  h.push(cmd(log, 1)); h.push(cmd(log, 2));
  assert.ok(h.undo()); assert.ok(h.undo()); assert.equal(h.undo(), false);
  assert.deepEqual(log, ['u2', 'u1']);
  assert.ok(h.redo()); assert.deepEqual(log, ['u2', 'u1', 'r1']);
  h.push(cmd(log, 3));
  assert.equal(h.canRedo(), false); assert.ok(h.canUndo());
});

test('limit drops oldest and onChange fires', () => {
  const h = createHistory({ limit: 2 }), log = []; let changes = 0; h.onChange = () => changes++;
  h.push(cmd(log, 1)); h.push(cmd(log, 2)); h.push(cmd(log, 3));
  h.undo(); h.undo(); assert.equal(h.undo(), false);
  assert.deepEqual(log, ['u3', 'u2']); assert.equal(changes, 5);
});

test('stroke recorder captures a raster edit as an undoable command', () => {
  const r = createRaster({ cells: 8, cellM: 1 }), rec = createStrokeRecorder(r);
  rec.begin();
  r.stamp(0.5, 0.5, 1.6, () => 3);
  const c = rec.end('paint');
  assert.equal(c.label, 'paint');
  assert.ok(r.takeDirty());                    // renderer still sees the change
  c.undo(); assert.equal(r.get(0.5, 0.5), 0); assert.ok(r.takeDirty());
  c.redo(); assert.equal(r.get(0.5, 0.5), 3);
  rec.begin(); assert.equal(rec.end('noop'), null);   // nothing changed -> no command
});

test('stroke recorder survives a render (takeDirty) between stamps and end', () => {
  const r = createRaster({ cells: 8, cellM: 1 }), rec = createStrokeRecorder(r);
  rec.begin();
  r.stamp(0.5, 0.5, 1.6, () => 3);
  r.takeDirty();                                   // renderer runs mid-stroke
  r.stamp(-2.5, -2.5, 0.5, () => 4);
  r.takeDirty();                                   // and again before pointer-up
  const c = rec.end('paint');
  assert.ok(c, 'stroke must still produce a command');
  c.undo(); assert.equal(r.get(0.5, 0.5), 0); assert.equal(r.get(-2.5, -2.5), 0);
  c.redo(); assert.equal(r.get(0.5, 0.5), 3); assert.equal(r.get(-2.5, -2.5), 4);
  assert.ok(r.takeDirty(), 'undo/redo still mark the renderer dirty');
});

test('commands carry ops; onApply receives ops on push/undo/redo; combine concatenates', () => {
  const h = createHistory(), seen = []; h.onApply = ops => seen.push(ops.map(o => o.type + ':' + o.n));
  const cmd = { label: 'x', undo() {}, redo() {}, ops: [{ type: 'a', n: 1 }], inverseOps: [{ type: 'b', n: 1 }] };
  h.push(cmd); h.undo(); h.redo();
  assert.deepEqual(seen, [['a:1'], ['b:1'], ['a:1']]);
  const c = combine('c', cmd, { undo() {}, redo() {}, ops: [{ type: 'a', n: 2 }], inverseOps: [{ type: 'b', n: 2 }] });
  assert.deepEqual(c.ops.map(o => o.n), [1, 2]); assert.deepEqual(c.inverseOps.map(o => o.n), [2, 1]);
});
test('stroke recorder command carries raster ops with layer name', () => {
  const r = createRaster({ cells: 8, cellM: 1 }), rec = createStrokeRecorder(r, 'terrain');
  rec.begin(); r.stamp(0.5, 0.5, 0.6, () => 3); const c = rec.end('paint');
  assert.equal(c.ops[0].type, 'raster'); assert.equal(c.ops[0].layer, 'terrain'); assert.deepEqual(c.ops[0].rect, c.inverseOps[0].rect);
  assert.ok(c.ops[0].bytes.includes(3)); assert.ok(!c.inverseOps[0].bytes.includes(3));
});
