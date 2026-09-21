import { test } from 'node:test';
import assert from 'node:assert/strict';
import { createPresence } from '../web/presence.js';

test('presence merges single-user updates, replaces on full lists, hides stale and self', () => {
  const p = createPresence(() => ({ email: 'me@x' }));
  p.set([{ email: 'me@x', name: 'me', x: 0, z: 0, at: 1000 }, { email: 'a@x', name: 'a', x: 1, z: 1, at: 1000 }, { email: 'b@x', name: 'b', x: null, at: 0 }]);
  assert.deepEqual(p.visible(2000).map(u => u.name), ['a']);                 // self and no-position users hidden
  p.set([{ email: 'a@x', name: 'a', x: 5, z: 5, at: 3000 }]);                 // merge
  assert.equal(p.users().find(u => u.email === 'a@x').x, 5); assert.equal(p.users().length, 3);
  assert.deepEqual(p.visible(14000).map(u => u.name), []);                    // stale after 10 s
  p.set([{ email: 'a@x', name: 'a', x: 5, z: 5, at: 3000 }, { email: 'me@x', name: 'me' }]);   // full list: b left
  assert.deepEqual(p.users().map(u => u.email).sort(), ['a@x', 'me@x']);
});

test('presence layer draws a dot, a name and a brush circle for painting users', () => {
  const p = createPresence(() => ({ email: 'me@x' }));
  p.set([{ email: 'a@x', name: 'a', x: 0, z: 0, at: Date.now(), color: 'hsl(0 70% 55%)', tool: 'paint', brush: 64 }]);
  const calls = [];
  const ctx = new Proxy({}, {
    get: (_, k) => (k === 'globalAlpha' || k === 'lineWidth' ? 1 : (...a) => calls.push([k, ...a])),
    set: () => true,
  });
  const view = { scale: 2, worldToScreen: () => [10, 20] };
  assert.equal(p.layer.id, 'presence');
  p.layer.draw(ctx, view, 100, 100);
  const arcs = calls.filter(c => c[0] === 'arc');
  assert.equal(arcs.length, 2);                                  // brush circle + dot
  assert.equal(arcs[0][3], 128);                                 // brush 64 * view.scale 2
  assert.ok(calls.some(c => c[0] === 'fillText' && c[1] === 'a'));
});
