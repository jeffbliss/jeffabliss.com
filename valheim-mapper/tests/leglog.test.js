import { test } from 'node:test';
import assert from 'node:assert/strict';
import { parseBearing, parseDuration, parseGait, parseLegs, walkLegs, legError, logCommand } from '../web/leglog.js';
import { createHistory } from '../web/history.js';

globalThis.crypto ??= (await import('node:crypto')).webcrypto;
const near = (a, b, eps = 1e-6) => assert.ok(Math.abs(a - b) < eps, `${a} ≈ ${b}`);

test('parses compass points, degrees, durations and gaits', () => {
  assert.equal(parseBearing('N'), 0); assert.equal(parseBearing('ne'), 45); assert.equal(parseBearing('WNW'), 292.5);
  assert.equal(parseBearing('120'), 120); assert.equal(parseBearing('-90'), 270); assert.equal(parseBearing('x'), null);
  assert.equal(parseDuration('40'), 40); assert.equal(parseDuration('40s'), 40); assert.equal(parseDuration('2m'), 120);
  assert.equal(parseDuration('1m30'), 90); assert.equal(parseDuration('1:30'), 90); assert.equal(parseDuration('abc'), null);
  assert.equal(parseGait('jog'), 4); assert.equal(parseGait('Sprint'), 7); assert.equal(parseGait('6'), 6); assert.equal(parseGait('9m/s'), 9); assert.equal(parseGait('fly'), null);
});

test('parseLegs reads one leg per line or comma, defaults to jog, reports errors by line', () => {
  const { legs, errors } = parseLegs('NE 40 jog\n# a comment\nE 25\n\n90 1m sprint, S 10 swim');
  assert.deepEqual(legs.map(l => [l.bearing, l.seconds, l.mps, l.metres]), [[45, 40, 4, 160], [90, 25, 4, 100], [90, 60, 7, 420], [180, 10, 2, 20]]);
  assert.deepEqual(errors, []);
  const bad = parseLegs('NE\nQ 10\nN 10 fly\nN 10 jog extra');
  assert.equal(bad.legs.length, 0); assert.equal(bad.errors.length, 4);
  assert.match(bad.errors[0], /line 1: duration/); assert.match(bad.errors[1], /line 2: bearing/); assert.match(bad.errors[2], /gait/); assert.match(bad.errors[3], /unexpected/);
});

test('walkLegs: north is +z, east is +x, totals and error accumulate', () => {
  const w = walkLegs(0, 0, parseLegs('N 10\nE 10 sprint').legs);
  near(w.end[0], 70); near(w.end[1], 40); assert.equal(w.points.length, 3);
  assert.equal(w.metres, 110); assert.equal(w.seconds, 20); assert.equal(w.error, Math.round(legError(40) + legError(70)));
  const d = walkLegs(5, 5, parseLegs('SW 10 walk').legs);
  near(d.end[0], 5 - 16 * Math.SQRT1_2); near(d.end[1], 5 - 16 * Math.SQRT1_2);
});

test('logCommand adds the path and an end pin as one undoable step', () => {
  const app = { state: { ink: [], pins: [] } };
  const w = walkLegs(0, 0, parseLegs('N 10\nE 10').legs);
  const cmd = logCommand(app, w, { color: '#ff0000' });
  assert.equal(app.state.ink.length, 1); assert.equal(app.state.pins.length, 1);
  assert.deepEqual(app.state.ink[0].points, [[0, 0], [0, 40], [40, 40]]);
  assert.equal(app.state.pins[0].name, `log end ±${w.error} m`); assert.equal(app.state.pins[0].x, 40); assert.equal(app.state.pins[0].type, 'pin');
  assert.deepEqual(cmd.ops.map(o => o.type), ['ink.add', 'pin.add']);
  const h = createHistory(); h.push(cmd); h.undo();
  assert.equal(app.state.ink.length, 0); assert.equal(app.state.pins.length, 0);
  h.redo(); assert.equal(app.state.ink.length, 1);
});
