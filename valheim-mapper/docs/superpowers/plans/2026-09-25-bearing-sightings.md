# Bearing Sightings Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Fix a pin's position from compass-point bearings taken at two or more checked pins, drawn as wedges whose intersection gives an estimate the existing Correct can snap onto.

**Architecture:** A pure geometry module `web/sight.js` (wedges, polygon clipping, estimate) plus `sightOps` commands; two new synced ops `pin.sight` / `pin.unsight` validated and persisted by the worker and applied by the client sync; the pins layer draws wedges and the region for the selected pin; the popup gains Sight, a sightings list and Correct to sightings, which reuses `correctionCommand` from `web/anchor.js`.

**Tech Stack:** Vanilla ES modules, no runtime deps. Tests with `node:test` (`npm test`) and the Durable Object pool (`npm run test:do`).

## Global Constraints

- Vanilla ES modules, zero runtime dependencies (browser and Worker).
- Short explanatory comments are welcome where the code is not self-evident (this subproject's convention; the Hugo site's no-comment rule does not apply here).
- Run both `npm test` and `npm run test:do` before every commit, from `valheim-mapper/`.
- Bearing 0 is north (+z), 90 is east (+x), matching `parseBearing` in `web/leglog.js`. Bearings are multiples of 22.5 in [0, 337.5].
- Half-width of a wedge is 11.25°.
- Commit messages start with `mapper:` and end with the Co-Authored-By lines from the session's attribution rules.

Spec: `docs/superpowers/specs/2026-09-25-bearing-sightings-design.md`.

---

### Task 1: Geometry in `web/sight.js`

**Files:**
- Create: `web/sight.js`
- Test: `tests/sight.test.js`

**Interfaces:**
- Produces: `HALF = 11.25`; `wedge(observer, bearing)` → `[{ px, pz, nx, nz }, { px, pz, nx, nz }]` two half-planes (point + inward normal, a point P is inside when `(P − p)·n ≥ 0`); `clip(polygon, halfPlane)` → polygon; `region(sightings, pins)` → `{ polygon: [[x,z]…], square: { x0, z0, x1, z1 } }`; `estimate(regionResult)` → `{ x, z, error } | null`; `contributing(sightings, pins)` → the sightings whose observer exists and is checked, each with `observer` attached.

- [ ] **Step 1: Write the failing tests**

```js
// tests/sight.test.js
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { wedge, clip, region, estimate, contributing, HALF } from '../web/sight.js';

const near = (a, b, eps = 1e-6) => assert.ok(Math.abs(a - b) < eps, `${a} ≈ ${b}`);
const inside = (planes, x, z) => planes.every(h => (x - h.px) * h.nx + (z - h.pz) * h.nz >= -1e-9);
const A = { id: 'a', x: 0, z: 0, checked: true }, B = { id: 'b', x: 200, z: 0, checked: true }, C = { id: 'c', x: 0, z: 200, checked: false };

test('wedge contains a point dead ahead and excludes one just outside the half-width', () => {
  const w = wedge(A, 0);                                   // north
  assert.equal(HALF, 11.25);
  assert.ok(inside(w, 0, 100));
  assert.ok(inside(w, 100 * Math.sin(10 * Math.PI / 180), 100 * Math.cos(10 * Math.PI / 180)));
  assert.ok(!inside(w, 100 * Math.sin(12 * Math.PI / 180), 100 * Math.cos(12 * Math.PI / 180)));
  assert.ok(!inside(w, 0, -100));
  const e = wedge(A, 90);                                  // east: +x
  assert.ok(inside(e, 100, 0)); assert.ok(!inside(e, 0, 100));
});

test('clip keeps the part of a square on the inside of a half-plane', () => {
  const sq = [[-1, -1], [1, -1], [1, 1], [-1, 1]];
  const half = clip(sq, { px: 0, pz: 0, nx: 1, nz: 0 });   // keep x ≥ 0
  assert.equal(half.length, 4);
  assert.ok(half.every(([x]) => x >= -1e-9));
  assert.deepEqual(clip(sq, { px: 5, pz: 0, nx: 1, nz: 0 }), []);
});

test('two perpendicular sightings give a diamond whose centroid is the true point', () => {
  const target = [100, 100];                                // NE of A at 45°, NW of B at 315°
  const s = [{ from: 'a', bearing: 45 }, { from: 'b', bearing: 315 }];
  const r = region(s, [A, B]);
  assert.ok(r.polygon.length >= 4);
  const est = estimate(r);
  near(est.x, target[0], 1e-6); near(est.z, target[1], 1e-6);
  assert.ok(est.error > 20 && est.error < 40, `error ${est.error}`);   // ±11.25° at ~141 m
});

test('sightings one compass point apart are unbounded: no estimate', () => {
  const r = region([{ from: 'a', bearing: 0 }, { from: 'b', bearing: 22.5 }], [A, B]);
  assert.equal(estimate(r), null);
});

test('a single sighting is unbounded; opposing sightings that cannot meet give an empty region', () => {
  assert.equal(estimate(region([{ from: 'a', bearing: 0 }], [A, B])), null);
  const r = region([{ from: 'a', bearing: 0 }, { from: 'b', bearing: 180 }], [A, B]);   // A looks north, B looks south: never cross
  assert.deepEqual(r.polygon, []);
  assert.equal(estimate(r), null);
});

test('contributing skips missing and unchecked observers', () => {
  const s = [{ from: 'a', bearing: 0 }, { from: 'c', bearing: 90 }, { from: 'zzz', bearing: 90 }];
  const c = contributing(s, [A, B, C]);
  assert.deepEqual(c.map(x => x.from), ['a']);
  assert.equal(c[0].observer, A);
});
```

- [ ] **Step 2: Run the tests to verify they fail**

Run: `cd valheim-mapper && node --test tests/sight.test.js`
Expected: FAIL, `Cannot find module '../web/sight.js'`

- [ ] **Step 3: Write the geometry**

```js
// web/sight.js
// Bearing sightings: from a checked pin, a target lies on a compass point. Each sighting is a ±HALF° wedge;
// the target can only be where every wedge overlaps. Bearing 0 = north (+z), 90 = east (+x), like leglog.js.
export const HALF = 11.25;
const SQUARE_M = 4000;
const rad = d => d * Math.PI / 180;

/** Unit direction of a bearing in world x/z. */
const dir = b => [Math.sin(rad(b)), Math.cos(rad(b))];

/** The wedge from `observer` around `bearing` as two half-planes: { px, pz, nx, nz }, inside when (P − p)·n ≥ 0. */
export function wedge(observer, bearing) {
  const left = dir(bearing - HALF), right = dir(bearing + HALF);
  // Inward normal of the left edge points clockwise (toward the wedge); of the right edge, counter-clockwise.
  return [
    { px: observer.x, pz: observer.z, nx: left[1], nz: -left[0] },
    { px: observer.x, pz: observer.z, nx: -right[1], nz: right[0] },
  ];
}

/** Sutherland–Hodgman: the part of a convex polygon inside one half-plane. */
export function clip(polygon, { px, pz, nx, nz }) {
  const side = ([x, z]) => (x - px) * nx + (z - pz) * nz;
  const out = [];
  for (let i = 0; i < polygon.length; i++) {
    const a = polygon[i], b = polygon[(i + 1) % polygon.length], sa = side(a), sb = side(b);
    if (sa >= 0) out.push(a);
    if ((sa >= 0) !== (sb >= 0)) { const t = sa / (sa - sb); out.push([a[0] + t * (b[0] - a[0]), a[1] + t * (b[1] - a[1])]); }
  }
  return out;
}

/** Sightings whose observer pin exists and is checked, each with `observer` attached. */
export function contributing(sightings, pins) {
  const byId = new Map(pins.map(p => [p.id, p]));
  return (sightings ?? []).flatMap(s => { const o = byId.get(s.from); return o && o.checked ? [{ ...s, observer: o }] : []; });
}

/** The polygon where every contributing wedge overlaps, clipped to a square around the observers. */
export function region(sightings, pins) {
  const c = contributing(sightings, pins);
  const cx = c.reduce((a, s) => a + s.observer.x, 0) / (c.length || 1), cz = c.reduce((a, s) => a + s.observer.z, 0) / (c.length || 1);
  const h = SQUARE_M / 2, square = { x0: cx - h, z0: cz - h, x1: cx + h, z1: cz + h };
  let polygon = [[square.x0, square.z0], [square.x1, square.z0], [square.x1, square.z1], [square.x0, square.z1]];
  for (const s of c) for (const half of wedge(s.observer, s.bearing)) { polygon = clip(polygon, half); if (!polygon.length) break; }
  return { polygon, square, count: c.length };
}

/** Centroid and radius of a bounded region; null when empty, unbounded (touches the square) or from fewer than two sightings. */
export function estimate({ polygon, square, count }) {
  if (count < 2 || polygon.length < 3) return null;
  const eps = 1e-6;
  const onEdge = ([x, z]) => Math.abs(x - square.x0) < eps || Math.abs(x - square.x1) < eps || Math.abs(z - square.z0) < eps || Math.abs(z - square.z1) < eps;
  if (polygon.some(onEdge)) return null;
  let area = 0, x = 0, z = 0;
  for (let i = 0; i < polygon.length; i++) {
    const [ax, az] = polygon[i], [bx, bz] = polygon[(i + 1) % polygon.length], f = ax * bz - bx * az;
    area += f; x += (ax + bx) * f; z += (az + bz) * f;
  }
  if (Math.abs(area) < eps) return null;
  x /= 3 * area; z /= 3 * area;
  const error = Math.round(Math.max(...polygon.map(([px, pz]) => Math.hypot(px - x, pz - z))));
  return { x, z, error };
}
```

- [ ] **Step 4: Run the tests to verify they pass**

Run: `cd valheim-mapper && node --test tests/sight.test.js`
Expected: 6 passing. If the wedge test fails on the "inside" checks, the normals are flipped: swap the signs in both normals of `wedge`.

- [ ] **Step 5: Commit**

```bash
cd valheim-mapper && npm test && git add web/sight.js tests/sight.test.js && git commit -m "mapper: sighting geometry: wedges, clipping, region and estimate"
```

---

### Task 2: `pin.sight` / `pin.unsight` ops on the worker and the client

**Files:**
- Modify: `worker/ops.js` (validateOp, planOp, applyOp, the `pin.add` copies)
- Modify: `web/sync.js:11-13`
- Modify: `web/pins.js:10` (`plainPin`)
- Test: `tests/ops.test.js`, `tests/do/map.test.js`, `tests/sync.test.js`

**Interfaces:**
- Produces: ops `{ type: 'pin.sight', id, from, bearing }` and `{ type: 'pin.unsight', id, from }`. A pin's `sightings` is `[{ from, bearing }]`, at most one entry per `from`; the array is omitted when empty.

- [ ] **Step 1: Write the failing worker tests**

Append to `tests/ops.test.js`:

```js
test('pin.sight / pin.unsight validation and apply', () => {
  assert.equal(validateOp({ type: 'pin.sight', id: 'p1', from: 'start', bearing: 45 }), null);
  assert.equal(validateOp({ type: 'pin.sight', id: 'p1', from: 'start', bearing: 337.5 }), null);
  assert.match(validateOp({ type: 'pin.sight', id: 'p1', from: 'p1', bearing: 45 }), /from/);
  assert.match(validateOp({ type: 'pin.sight', id: 'p1', from: 'start', bearing: 30 }), /bearing/);
  assert.match(validateOp({ type: 'pin.sight', id: 'p1', from: 'start', bearing: 360 }), /bearing/);
  assert.match(validateOp({ type: 'pin.sight', id: '', from: 'start', bearing: 45 }), /id/);
  assert.equal(validateOp({ type: 'pin.unsight', id: 'p1', from: 'start' }), null);
  assert.match(validateOp({ type: 'pin.unsight', id: 'p1', from: '' }), /from/);
  assert.equal(validateOp({ type: 'pin.add', pin: { id: 'p1', x: 1, z: 2, type: 'pin', name: '', checked: false, sightings: [{ from: 'start', bearing: 45 }] } }), null);
  assert.match(validateOp({ type: 'pin.add', pin: { id: 'p1', x: 1, z: 2, type: 'pin', name: '', checked: false, sightings: [{ from: 'p1', bearing: 45 }] } }), /sighting/);

  const s = makeState();
  applyOp(s, { type: 'pin.add', pin: { id: 'p1', x: 1, z: 2, type: 'pin', name: '', checked: false } });
  applyOp(s, { type: 'pin.sight', id: 'p1', from: 'start', bearing: 45 });
  applyOp(s, { type: 'pin.sight', id: 'p1', from: 'p2', bearing: 90 });
  applyOp(s, { type: 'pin.sight', id: 'p1', from: 'start', bearing: 67.5 });          // replaces the first
  assert.deepEqual(s.pins.get('p1').sightings, [{ from: 'start', bearing: 67.5 }, { from: 'p2', bearing: 90 }]);
  const { persist } = planOp(s, { type: 'pin.unsight', id: 'p1', from: 'p2' });
  assert.deepEqual(JSON.parse(persist[0].json).sightings, [{ from: 'start', bearing: 67.5 }]);
  applyOp(s, { type: 'pin.unsight', id: 'p1', from: 'p2' });
  applyOp(s, { type: 'pin.unsight', id: 'p1', from: 'start' });
  assert.equal('sightings' in s.pins.get('p1'), false);                               // empty array is dropped
  assert.equal(applyOp(s, { type: 'pin.sight', id: 'nope', from: 'start', bearing: 0 }).persist.length, 0);
});
```

- [ ] **Step 2: Run the test to verify it fails**

Run: `cd valheim-mapper && node --test tests/ops.test.js`
Expected: FAIL on the first `validateOp` with `'bad type'` not matching `null`.

- [ ] **Step 3: Implement on the worker**

In `worker/ops.js`, after `validateLog`, add:

```js
const isBearing = b => isNum(b) && b >= 0 && b < 360 && Number.isInteger(b / 22.5);
/** Sightings stored on a target pin: compass-point bearings from other pins. */
function validateSightings(list, id) {
  if (!Array.isArray(list) || list.length > 32) return 'bad sightings';
  for (const s of list) {
    if (!s || typeof s !== 'object' || !isId(s.from) || s.from === id || !isBearing(s.bearing)) return 'bad sighting';
    for (const k of Object.keys(s)) if (!['from', 'bearing'].includes(k)) return 'bad sighting key';
  }
  return null;
}
/** A pin's sightings with `from` replaced (bearing given) or removed (bearing undefined); undefined when empty. */
function withSighting(pin, from, bearing) {
  const rest = (pin.sightings ?? []).filter(s => s.from !== from);
  const next = bearing === undefined ? rest : [...(pin.sightings ?? []).map(s => s.from === from ? { from, bearing } : s), ...(pin.sightings?.some(s => s.from === from) ? [] : [{ from, bearing }])];
  return next.length ? next : undefined;
}
```

Note `withSighting` keeps the original order when replacing, and appends when new, so persisted JSON stays deterministic. `rest` is only used for removal; simplify if you like, as long as the test's expected order holds.

In `validateOp`, extend the `pin.add` case and add two cases:

```js
    case 'pin.add': { const p = op.pin;
      if (!p || !isId(p.id) || p.id === 'start') return 'bad id'; if (!USER_PIN_TYPES.has(p.type)) return 'bad type';
      if (!isNum(p.x) || !isNum(p.z)) return 'bad position'; if (typeof p.name !== 'string' || p.name.length > 40) return 'bad name';
      if (typeof p.checked !== 'boolean') return 'bad checked';
      if ('log' in p && p.log !== undefined) { const e = validateLog(p.log); if (e) return e; }
      if ('sightings' in p && p.sightings !== undefined) return validateSightings(p.sightings, p.id);
      return null; }
    case 'pin.sight': if (!isId(op.id)) return 'bad id'; if (!isId(op.from) || op.from === op.id) return 'bad from'; return isBearing(op.bearing) ? null : 'bad bearing';
    case 'pin.unsight': if (!isId(op.id)) return 'bad id'; return isId(op.from) ? null : 'bad from';
```

In `planOp` and `applyOp`, the `pin.add` copy gains `...(op.pin.sightings?.length ? { sightings: op.pin.sightings } : {})` right after the `log` spread (both places, and both the `persist` and the `state.pins.set` copies). Then add to `planOp`:

```js
    case 'pin.sight': case 'pin.unsight': { const p = state.pins.get(op.id); if (!p) break;
      const { sightings: _, ...rest } = p, next = withSighting(p, op.from, op.type === 'pin.sight' ? op.bearing : undefined);
      persist.push({ table: 'pins', id: p.id, json: JSON.stringify(next ? { ...rest, sightings: next } : rest) }); break; }
```

and to `applyOp`:

```js
    case 'pin.sight': case 'pin.unsight': { const p = state.pins.get(op.id); if (!p) break;
      const next = withSighting(p, op.from, op.type === 'pin.sight' ? op.bearing : undefined);
      if (next) p.sightings = next; else delete p.sightings; break; }
```

- [ ] **Step 4: Run the worker tests**

Run: `cd valheim-mapper && node --test tests/ops.test.js`
Expected: all passing.

- [ ] **Step 5: Client sync and plainPin, with tests**

Look at `tests/sync.test.js` for how `applyRemote` (or whatever `web/sync.js` exports at line 11) is exercised, and add a test in the same style:

```js
test('remote pin.sight and pin.unsight update the pin', () => {
  const state = createState();
  state.pins.push({ id: 'p1', x: 0, z: 0, type: 'pin', name: '', checked: false });
  apply(state, { type: 'pin.sight', id: 'p1', from: 'start', bearing: 45 });
  apply(state, { type: 'pin.sight', id: 'p1', from: 'start', bearing: 90 });
  assert.deepEqual(state.pins[0].sightings, [{ from: 'start', bearing: 90 }]);
  apply(state, { type: 'pin.unsight', id: 'p1', from: 'start' });
  assert.equal('sightings' in state.pins[0], false);
});
```

(`apply` is the name that file uses for the sync applier; match it.) Then in `web/sync.js` add after the `pin.remove` case:

```js
    case 'pin.sight': case 'pin.unsight': { const p = state.pins.find(p => p.id === op.id); if (!p) break;
      const next = (p.sightings ?? []).filter(s => s.from !== op.from);
      if (op.type === 'pin.sight') { const i = (p.sightings ?? []).findIndex(s => s.from === op.from); if (i >= 0) next.splice(i, 0, { from: op.from, bearing: op.bearing }); else next.push({ from: op.from, bearing: op.bearing }); }
      if (next.length) p.sightings = next; else delete p.sightings; break; }
```

And in `web/pins.js` line 10, `plainPin` becomes:

```js
function plainPin(p) { return { id: p.id, x: p.x, z: p.z, type: p.type, name: p.name, checked: p.checked, ...(p.log ? { log: p.log } : {}), ...(p.sightings?.length ? { sightings: p.sightings } : {}) }; }
```

- [ ] **Step 6: Durable Object round trip**

In `tests/do/map.test.js`, inside the 'broadcasts raster and json ops…' test, after the `pin.add` send and its `await b.until(...)`, add:

```js
    a.ws.send(JSON.stringify({ t: 'op', op: { type: 'pin.sight', id: 'p1', from: 'start', bearing: 45 } }));
    await b.until(m => m.t === 'op' && m.op.type === 'pin.sight');
```

and after the `hello.doc.pins...log` expectation:

```js
    expect(hello.doc.pins.find(p => p.id === 'p1').sightings).toEqual([{ from: 'start', bearing: 45 }]);
```

Keep the later `expect(hello.seq).toBe(op.seq)` correct: capture the sight op's reply as `const sight = await b.until(...)` and compare `hello.seq` to `sight.seq`, and `metaSeq` to `String(sight.seq)`.

- [ ] **Step 7: Run everything**

Run: `cd valheim-mapper && npm test && npm run test:do`
Expected: all passing in both.

- [ ] **Step 8: Commit**

```bash
cd valheim-mapper && git add worker/ops.js web/sync.js web/pins.js tests/ops.test.js tests/sync.test.js tests/do/map.test.js && git commit -m "mapper: pin.sight and pin.unsight ops, persisted on the target pin"
```

---

### Task 3: `sightOps` undoable commands

**Files:**
- Modify: `web/sight.js`
- Test: `tests/sight.test.js`

**Interfaces:**
- Produces: `sightOps.sight(pin, from, bearing)` and `sightOps.unsight(pin, from)` → a history command `{ label, ops, inverseOps, undo, redo }` or null when nothing changes. The command mutates `pin.sightings` on redo/undo exactly as the sync applier would.

- [ ] **Step 1: Write the failing test**

Append to `tests/sight.test.js`:

```js
import { createHistory } from '../web/history.js';
import { sightOps } from '../web/sight.js';

test('sightOps: sight upserts, unsight removes, both undo', () => {
  const pin = { id: 'p1', x: 0, z: 0, type: 'pin', name: '', checked: false };
  const h = createHistory();
  h.push(sightOps.sight(pin, 'a', 45));
  assert.deepEqual(pin.sightings, [{ from: 'a', bearing: 45 }]);
  h.push(sightOps.sight(pin, 'a', 90));
  assert.deepEqual(pin.sightings, [{ from: 'a', bearing: 90 }]);
  h.undo(); assert.deepEqual(pin.sightings, [{ from: 'a', bearing: 45 }]);
  h.redo(); h.push(sightOps.sight(pin, 'b', 0));
  const cmd = sightOps.unsight(pin, 'a');
  assert.deepEqual(cmd.ops, [{ type: 'pin.unsight', id: 'p1', from: 'a' }]);
  assert.deepEqual(cmd.inverseOps, [{ type: 'pin.sight', id: 'p1', from: 'a', bearing: 90 }]);
  h.push(cmd); assert.deepEqual(pin.sightings, [{ from: 'b', bearing: 0 }]);
  h.undo(); assert.deepEqual(pin.sightings, [{ from: 'a', bearing: 90 }, { from: 'b', bearing: 0 }]);
  h.undo(); h.undo(); h.undo(); assert.equal('sightings' in pin, false);
  assert.equal(sightOps.unsight(pin, 'zzz'), null);
});
```

(Move the two imports to the top of the file with the others.)

- [ ] **Step 2: Run to verify it fails**

Run: `cd valheim-mapper && node --test tests/sight.test.js`
Expected: FAIL, `sightOps` is not exported.

- [ ] **Step 3: Implement**

Append to `web/sight.js`:

```js
/** Replaces `pin.sightings` with `list`, dropping the key when empty (matches the sync applier and the worker). */
const setSightings = (pin, list) => { if (list?.length) pin.sightings = list; else delete pin.sightings; };

/** Undoable, synced edits to a target pin's sightings. Each returns a history command or null when nothing changes. */
export const sightOps = {
  sight(pin, from, bearing) {
    const before = pin.sightings ? pin.sightings.map(s => ({ ...s })) : undefined;
    const i = before?.findIndex(s => s.from === from) ?? -1;
    if (i >= 0 && before[i].bearing === bearing) return null;
    const after = before ? before.map(s => ({ ...s })) : [];
    if (i >= 0) after[i] = { from, bearing }; else after.push({ from, bearing });
    const inverse = i >= 0 ? { type: 'pin.sight', id: pin.id, from, bearing: before[i].bearing } : { type: 'pin.unsight', id: pin.id, from };
    setSightings(pin, after);
    return { label: 'sight', ops: [{ type: 'pin.sight', id: pin.id, from, bearing }], inverseOps: [inverse], undo: () => setSightings(pin, before), redo: () => setSightings(pin, after) };
  },
  unsight(pin, from) {
    const before = pin.sightings ? pin.sightings.map(s => ({ ...s })) : undefined;
    const old = before?.find(s => s.from === from); if (!old) return null;
    const after = before.filter(s => s.from !== from);
    setSightings(pin, after);
    return { label: 'unsight', ops: [{ type: 'pin.unsight', id: pin.id, from }], inverseOps: [{ type: 'pin.sight', id: pin.id, from, bearing: old.bearing }], undo: () => setSightings(pin, before), redo: () => setSightings(pin, after) };
  },
};
```

- [ ] **Step 4: Run the tests**

Run: `cd valheim-mapper && npm test`
Expected: all passing.

- [ ] **Step 5: Commit**

```bash
cd valheim-mapper && git add web/sight.js tests/sight.test.js && git commit -m "mapper: sightOps: undoable sight and unsight commands"
```

---

### Task 4: Drawing wedges, region and estimate for the selected pin

**Files:**
- Modify: `web/pins.js` (`createPins` → `draw`)
- Test: `tests/pins.test.js`

**Interfaces:**
- Consumes: `region`, `estimate`, `contributing` from `web/sight.js`.
- Produces: `sightingGeometry(pin, pins)` exported from `web/pins.js` → `{ wedges: [{ observer, bearing }], polygon, estimate }` used by the draw code and, in Task 5, by the popup.

- [ ] **Step 1: Write the failing test**

Look at `tests/pins.test.js` for its imports, then append:

```js
import { sightingGeometry } from '../web/pins.js';

test('sightingGeometry gathers contributing wedges, the region and the estimate', () => {
  const a = { id: 'a', x: 0, z: 0, checked: true }, b = { id: 'b', x: 200, z: 0, checked: true }, c = { id: 'c', x: 0, z: 200, checked: false };
  const t = { id: 't', x: 90, z: 90, sightings: [{ from: 'a', bearing: 45 }, { from: 'b', bearing: 315 }, { from: 'c', bearing: 180 }] };
  const g = sightingGeometry(t, [a, b, c, t]);
  assert.equal(g.wedges.length, 2);
  assert.ok(g.polygon.length >= 4);
  assert.ok(Math.abs(g.estimate.x - 100) < 1e-6 && Math.abs(g.estimate.z - 100) < 1e-6);
  assert.equal(sightingGeometry({ id: 'u', x: 0, z: 0 }, [a]).estimate, null);
});
```

- [ ] **Step 2: Run to verify it fails**

Run: `cd valheim-mapper && node --test tests/pins.test.js`
Expected: FAIL, `sightingGeometry` is not exported.

- [ ] **Step 3: Implement geometry helper and drawing**

At the top of `web/pins.js` add `import { region, estimate, contributing } from './sight.js';` and export:

```js
/** Everything the map draws for a pin's sightings: contributing wedges, the overlap polygon, and the estimate (or null). */
export function sightingGeometry(pin, pins) {
  const wedges = contributing(pin.sightings, pins).map(s => ({ observer: s.observer, bearing: s.bearing }));
  const r = region(pin.sightings, pins);
  return { wedges, polygon: r.polygon, estimate: estimate(r) };
}
```

In `createPins`, inside `draw` before the `for (const p of state.pins)` loop, add:

```js
      const sel = layer.selected ? state.pins.find(p => p.id === layer.selected) : null;
      if (sel?.sightings?.length) drawSightings(ctx, view, w, h, sel, state.pins, dpr);
```

and add this module-level function (bearing 0 = +z; the far edge of each fan is 2.5 km, past the 4 km region square's reach from any observer in practice, and clipped by the canvas):

```js
function drawSightings(ctx, view, w, h, pin, pins, dpr) {
  const { wedges, polygon, estimate: est } = sightingGeometry(pin, pins);
  const P = (x, z) => view.worldToScreen(x, z, w, h), rad = d => d * Math.PI / 180, FAR = 2500;
  ctx.save();
  ctx.fillStyle = 'rgba(255, 215, 122, 0.12)'; ctx.strokeStyle = 'rgba(255, 215, 122, 0.6)'; ctx.lineWidth = 1 * dpr;
  for (const { observer, bearing } of wedges) {
    const l = [observer.x + FAR * Math.sin(rad(bearing - 11.25)), observer.z + FAR * Math.cos(rad(bearing - 11.25))];
    const r = [observer.x + FAR * Math.sin(rad(bearing + 11.25)), observer.z + FAR * Math.cos(rad(bearing + 11.25))];
    ctx.beginPath(); ctx.moveTo(...P(observer.x, observer.z)); ctx.lineTo(...P(...l)); ctx.lineTo(...P(...r)); ctx.closePath(); ctx.fill(); ctx.stroke();
  }
  if (polygon.length >= 3) {
    ctx.fillStyle = 'rgba(255, 215, 122, 0.35)'; ctx.strokeStyle = '#ffd77a'; ctx.lineWidth = 2 * dpr;
    ctx.beginPath(); polygon.forEach(([x, z], i) => { const [sx, sy] = P(x, z); i ? ctx.lineTo(sx, sy) : ctx.moveTo(sx, sy); }); ctx.closePath(); ctx.fill(); ctx.stroke();
  }
  if (est) {
    const [sx, sy] = P(est.x, est.z), s = 6 * dpr;
    ctx.strokeStyle = '#fff'; ctx.lineWidth = 2 * dpr;
    ctx.beginPath(); ctx.moveTo(sx - s, sy); ctx.lineTo(sx + s, sy); ctx.moveTo(sx, sy - s); ctx.lineTo(sx, sy + s); ctx.stroke();
  }
  ctx.restore();
}
```

- [ ] **Step 4: Run the tests**

Run: `cd valheim-mapper && npm test`
Expected: all passing (the draw code is exercised manually in Task 5).

- [ ] **Step 5: Commit**

```bash
cd valheim-mapper && git add web/pins.js tests/pins.test.js && git commit -m "mapper: draw sighting wedges, region and estimate for the selected pin"
```

---

### Task 5: Popup: Sight flow, sightings list, Correct to sightings

**Files:**
- Modify: `web/index.html:76-84` (popup markup)
- Modify: `web/style.css` (after line 93)
- Modify: `web/ui.js` (`wirePinPopup`)
- Create: `web/sighting.js` (UI wiring, kept out of `ui.js` which is already long)
- Modify: `README.md:28` (Controls)

**Interfaces:**
- Consumes: `sightOps`, `sightingGeometry`, `correctionCommand(app, pin, [x, z])` (returns null when the pin has no log), `pinOps.update`, `app.tools.intercept`, `app.tools.overlay`, `app.tools.pointer`, `app.toast(text, ms)`, `app.history`, `app.markDirty()`, `app.requestRender()`, `app.pinsLayer.selected`, `app.tools.editing`, `nearestPin`.
- Produces: `wireSighting(app, { sight, bar, list, correctSight, status })` → `{ refresh(pin) }`, called from `app.updatePinPopup`.

- [ ] **Step 1: Markup and style**

Replace the popup in `web/index.html` with:

```html
<div id="pin-popup" class="wood" hidden>
  <button id="pin-close" title="Deselect">&times;</button>
  <input id="pin-name" type="text" maxlength="40" placeholder="Pin name" autocomplete="off">
  <div class="row">
    <button id="pin-check" title="Toggle checked (X)">Check</button>
    <button id="pin-correct" title="Move this log's whole chain so this pin lands where it really is">Correct</button>
    <button id="pin-sight" title="From this verified pin, record the compass point another pin lies on">Sight</button>
    <button id="pin-delete" title="Delete pin (Delete)">Delete</button>
  </div>
  <div id="sight-bar" hidden></div>
  <div id="sight-list" hidden></div>
  <div id="sight-status" hidden></div>
  <button id="pin-correct-sight" title="Move this pin (and its log chain) onto the sightings' estimate" hidden>Correct to sightings</button>
</div>
```

Append to `web/style.css`:

```css
#sight-bar { display: grid; grid-template-columns: repeat(8, 1fr); gap: 2px; }
#sight-bar button { min-height: 24px; font-size: 12px; padding: 0; }
#sight-list { display: grid; gap: 2px; font: 14px 'Averia Serif', serif; }
#sight-list div { display: flex; justify-content: space-between; align-items: center; gap: 6px; }
#sight-list button { min-height: 22px; width: 26px; padding: 0; font-size: 14px; }
#sight-status { font: 13px 'Averia Serif', serif; opacity: .85; text-align: center; }
```

- [ ] **Step 2: Write `web/sighting.js`**

```js
// Sight flow: from a checked pin, pick a compass point, click the target pin. The target's popup lists its sightings
// and, once the wedges cross, offers Correct to sightings, which reuses the log correction so chains and terrain follow.
import { sightOps } from './sight.js';
import { sightingGeometry, nearestPin, pinOps } from './pins.js';
import { correctionCommand } from './anchor.js';

const POINTS = ['N', 'NNE', 'NE', 'ENE', 'E', 'ESE', 'SE', 'SSE', 'S', 'SSW', 'SW', 'WSW', 'W', 'WNW', 'NW', 'NNW'];
const nameOf = (pins, id) => { const p = pins.find(p => p.id === id); return p ? (p.name || (p.fixed ? 'Start' : p.type)) : 'missing pin'; };

/** Appends " ±E m" to a pin name, replacing an existing ±N m. */
export function withError(name, error) { return `${name.replace(/\s*±\s*\d+\s*m$/, '').trim()} ±${error} m`.trim(); }

export function wireSighting(app, { sight, bar, list, correctSight, status }) {
  let observer = null, bearing = null, prevOverlay = null;
  const pins = () => app.state.pins;
  const selected = () => { const id = app.pinsLayer?.selected; return id ? pins().find(p => p.id === id) : null; };

  const stop = () => { observer = null; bearing = null; bar.hidden = true; app.tools.intercept = null; app.tools.overlay = prevOverlay; app.toast(''); app.requestRender(); };

  const place = (e, wx, wz) => {
    if (!observer || bearing === null || e.button !== 0) return false;
    const hit = nearestPin(pins().filter(p => p !== observer), wx, wz, 14 * app.dpr() / app.view.scale);
    if (!hit) { app.toast('Click a pin', 1500); return true; }
    const cmd = sightOps.sight(hit, observer.id, bearing);
    if (cmd) { app.history.push(cmd); app.markDirty(); }
    app.pinsLayer.selected = hit.id;
    stop(); return true;
  };

  bar.replaceChildren(...POINTS.map((label, i) => { const b = document.createElement('button'); b.textContent = label; b.onclick = () => choose(i * 22.5); return b; }));
  const choose = b => {
    bearing = b; for (const [i, el] of [...bar.children].entries()) el.classList.toggle('active', i * 22.5 === b);
    app.toast(`Click the pin that lies ${POINTS[b / 22.5]} of ${nameOf(pins(), observer.id)} · Esc cancels`, 0);
    app.tools.intercept = place; app.requestRender();
  };

  sight.onclick = () => {
    const pin = selected(); if (!pin?.checked) return;
    observer = pin; bearing = null; bar.hidden = false; prevOverlay = app.tools.overlay;
    app.toast('Pick the compass point, then click the target pin · Esc cancels', 0);
    app.tools.overlay = (ctx, view, w, h) => {
      if (bearing === null) return;
      const rad = d => d * Math.PI / 180, FAR = 2500, P = (x, z) => view.worldToScreen(x, z, w, h);
      const l = [observer.x + FAR * Math.sin(rad(bearing - 11.25)), observer.z + FAR * Math.cos(rad(bearing - 11.25))];
      const r = [observer.x + FAR * Math.sin(rad(bearing + 11.25)), observer.z + FAR * Math.cos(rad(bearing + 11.25))];
      ctx.save(); ctx.fillStyle = 'rgba(255,255,255,0.15)'; ctx.strokeStyle = '#fff'; ctx.setLineDash([6, 4]); ctx.lineWidth = 1.5 * app.dpr();
      ctx.beginPath(); ctx.moveTo(...P(observer.x, observer.z)); ctx.lineTo(...P(...l)); ctx.lineTo(...P(...r)); ctx.closePath(); ctx.fill(); ctx.stroke(); ctx.restore();
    };
    app.requestRender();
  };

  correctSight.onclick = () => {
    const pin = selected(); if (!pin) return;
    const { estimate } = sightingGeometry(pin, pins()); if (!estimate) return;
    const target = [+estimate.x.toFixed(1), +estimate.z.toFixed(1)];
    let cmd = correctionCommand(app, pin, target);
    if (!cmd) {
      const before = { x: pin.x, z: pin.z }, after = { x: target[0], z: target[1] };
      Object.assign(pin, after);
      cmd = { label: 'correct to sightings', ...pinOps.update(pin, after, before), undo: () => Object.assign(pin, before), redo: () => Object.assign(pin, after) };
    }
    const nameBefore = pin.name, nameAfter = withError(pin.name, estimate.error);
    pin.name = nameAfter;
    const rename = { ...pinOps.update(pin, { name: nameAfter }, { name: nameBefore }), undo: () => { pin.name = nameBefore; }, redo: () => { pin.name = nameAfter; } };
    const { undo, redo } = cmd;
    app.history.push({ label: 'correct to sightings', ops: [...cmd.ops, ...rename.ops], inverseOps: [...rename.inverseOps, ...cmd.inverseOps], undo: () => { rename.undo(); undo(); }, redo: () => { redo(); rename.redo(); } });
    app.markDirty(); app.requestRender();
  };

  addEventListener('keydown', e => { if (e.key === 'Escape' && observer) stop(); });

  /** Called by the popup every frame with the selected pin (or null). */
  const refresh = pin => {
    if (!pin) { if (observer) stop(); return; }
    if (observer && pin !== observer) stop();
    sight.hidden = !pin.checked;
    const s = pin.sightings ?? [];
    list.hidden = !s.length;
    if (s.length) list.replaceChildren(...s.map(({ from, bearing: b }) => {
      const row = document.createElement('div'), txt = document.createElement('span'), x = document.createElement('button');
      const o = pins().find(p => p.id === from);
      txt.textContent = `from ${nameOf(pins(), from)}, ${POINTS[b / 22.5]}${o && !o.checked ? ' (unchecked)' : ''}`;
      x.textContent = '×'; x.title = 'Remove this sighting'; x.onclick = () => { const cmd = sightOps.unsight(pin, from); if (cmd) { app.history.push(cmd); app.markDirty(); app.requestRender(); } };
      row.append(txt, x); return row;
    }));
    const g = s.length ? sightingGeometry(pin, pins()) : null;
    const est = g?.estimate ?? null;
    status.hidden = !s.length;
    if (s.length) status.textContent = est ? `estimate ${Math.round(Math.hypot(est.x - pin.x, est.z - pin.z))} m away · ±${est.error} m`
      : g.polygon.length ? 'need another sighting from a different angle' : 'sightings contradict each other';
    correctSight.hidden = !(est && app.tools.editing);
  };
  return { refresh };
}
```

- [ ] **Step 3: Wire it into the popup**

In `web/ui.js`, import `wireSighting` from `./sighting.js`, and in `wirePinPopup`:

```js
  const sighting = wireSighting(app, { sight: document.getElementById('pin-sight'), bar: document.getElementById('sight-bar'), list: document.getElementById('sight-list'),
    correctSight: document.getElementById('pin-correct-sight'), status: document.getElementById('sight-status') });
```

placed after the `correct` element lookup, and in `app.updatePinPopup` add `sighting.refresh(pin);` right after the `correct.hidden = …` line, plus `sighting.refresh(null);` inside the `if (!pin)` branch before the `return`.

- [ ] **Step 4: Unit test the name helper**

Append to `tests/sight.test.js`:

```js
import { withError } from '../web/sighting.js';
test('withError appends or replaces the ±N m suffix', () => {
  assert.equal(withError('north tower', 35), 'north tower ±35 m');
  assert.equal(withError('log end ±120 m', 35), 'log end ±35 m');
  assert.equal(withError('', 12), '±12 m');
});
```

`web/sighting.js` imports `./pins.js`, which imports `./tools.js`; check that `node --test` can load them (the existing `tests/pins.test.js` already imports `web/pins.js`, so it can). If `sighting.js` fails to import under node because of a browser global, move `withError` into `web/sight.js` and import it from there in both places.

Run: `cd valheim-mapper && npm test`
Expected: all passing.

- [ ] **Step 5: README**

In `README.md` after the "Correct a log" bullet (line 28), add:

```
- Sightings: fix a campfire or tower you built without walking to it. Select a **checked** pin, press **Sight**, pick the compass point the target lies on (read it off the build ghost in game), then click the target pin. Each sighting is a ±11° wedge; the target's popup lists them, shows the overlap once two cross from different angles, and in Edit offers **Correct to sightings**, which moves the pin (and its log chain, ink, terrain and fog) onto the estimate and names it with the error. Sightings from unchecked or removed pins stop counting until the pin is checked again.
```

- [ ] **Step 6: Manual verification in the dev server**

Start the `mapper` preview from `.claude/launch.json` and open `localhost:8787/valheim-mapper/?as=you@x`. Then:

1. Double-click to place pins A at roughly (0, 0) offset from START, B about 300 m east of A, and T about 200 m north-east of A. Click A and B once each to check them.
2. Select A, press Sight, press NE, click T. The dashed wedge shows while choosing; after the click T is selected and its popup lists "from A, NE" and says "need another sighting from a different angle".
3. Select B, press Sight, press NW, click T. T's popup now shows a diamond on the map, a white cross, and "estimate N m away · ±E m".
4. Press E for Edit, select T, press Correct to sightings. T lands on the cross, its name ends in ±E m. Cmd/Ctrl+Z restores position and name in one step.
5. Uncheck A. The row shows "(unchecked)" and the status goes back to needing another angle. Re-check A.
6. Press × on one sighting; it disappears, undo brings it back.
7. Log a leg from A to a new pin L (`N 40 jog`, Place), sight L from A and B, Correct to sightings: the ink and any paint near L slide with it.
8. Open a second tab as another user (`?as=other@x`): sightings and corrections appear there too.
9. Esc during the Sight flow cancels; clicking empty map during it toasts "Click a pin" and stays in the flow.

- [ ] **Step 7: Run everything and commit**

```bash
cd valheim-mapper && npm test && npm run test:do && git add web/index.html web/style.css web/ui.js web/sighting.js tests/sight.test.js README.md && git commit -m "mapper: Sight flow, sightings list and Correct to sightings in the pin popup"
```

---

## Self-review notes

- Spec coverage: data model and ops (Task 2), interaction (Task 5), geometry (Task 1), drawing (Task 4), correction incl. plain-pin fallback and ±E m naming (Task 5), tests (Tasks 1–4 unit, Task 2 DO, Task 5 manual).
- `sightingGeometry` (Task 4) is the single source used by both the layer and the popup; `withError` (Task 5) is the only name-suffix logic.
- Order of `sightings` after an upsert is "replace in place, else append" in all three appliers (worker, sync, sightOps) so the shared state stays identical across clients.
