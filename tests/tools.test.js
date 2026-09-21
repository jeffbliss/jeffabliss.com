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
