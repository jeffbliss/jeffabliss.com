# Coastline Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** A Shore tag on pins, a Coast button that bakes one smooth ink stroke through the checked shore pins, and log paths that are removed together with their end pin.

**Architecture:** `shore` is a boolean on pins synced through the existing `pin.add` / `pin.update` ops. `web/coast.js` is pure: ordering by bearing from spawn, Catmull-Rom sampling, and a history command that adds an ink stroke. The pin popup gains a Shore toggle, the Edit toolbar a Coast button. `pinActions.remove` grows to remove the log's stroke in the same command.

**Tech Stack:** Vanilla ES modules, zero runtime deps. Tests: `node:test` (`npm test`) and the Durable Object pool (`npm run test:do`), both from `valheim-mapper/`.

## Global Constraints

- Vanilla ES modules, zero runtime dependencies (browser and Worker). Short explanatory comments are welcome where the code is not self-evident.
- Run `npm test` and `npm run test:do` before every commit, from `valheim-mapper/`.
- Bearing from spawn: `atan2(x, z)` in degrees, clockwise from north, normalised to [0, 360). Spawn is the pin with `fixed: true` (id `start`), or (0, 0) if absent.
- Coast stroke: colour `#3b7dbf`, width `4`, Catmull-Rom sampled every `8` m, points rounded to 0.1 m, at least two checked shore pins.
- History commands apply their change before `app.history.push`; `ops` go out on push/redo, `inverseOps` on undo. `app.state.ink` is the array of strokes; the ink layer draws that same array.
- Commit messages start with `mapper:` and end with the Co-Authored-By lines from the session's attribution rules.

Spec: `docs/superpowers/specs/2026-09-25-coastline-design.md`.

---

### Task 1: The `shore` tag, end to end

**Files:**
- Modify: `worker/ops.js` (`validateOp` `pin.add` and `pin.update` cases, and the two `pin.add` copies in `planOp` / `applyOp`)
- Modify: `web/pins.js` (`plainPin`, `pinActions`, `draw`)
- Modify: `web/index.html:80` (popup row), `web/ui.js` (`wirePinPopup`)
- Test: `tests/ops.test.js`, `tests/pins.test.js`

**Interfaces:**
- Produces: `pin.shore` boolean (absent = false); `app.pinActions.toggleShore(pin)` → pushes one synced undoable command.

- [ ] **Step 1: Failing worker test**

Append to `tests/ops.test.js`:

```js
test('shore tag: accepted on add and update, must be boolean, survives apply', () => {
  assert.equal(validateOp({ type: 'pin.add', pin: { id: 'p1', x: 1, z: 2, type: 'fire', name: '', checked: false, shore: true } }), null);
  assert.match(validateOp({ type: 'pin.add', pin: { id: 'p1', x: 1, z: 2, type: 'fire', name: '', checked: false, shore: 'yes' } }), /shore/);
  assert.equal(validateOp({ type: 'pin.update', id: 'p1', patch: { shore: true } }), null);
  assert.match(validateOp({ type: 'pin.update', id: 'p1', patch: { shore: 1 } }), /shore/);
  const s = makeState();
  applyOp(s, { type: 'pin.add', pin: { id: 'p1', x: 1, z: 2, type: 'fire', name: '', checked: false, shore: true } });
  assert.equal(s.pins.get('p1').shore, true);
  applyOp(s, { type: 'pin.update', id: 'p1', patch: { shore: false } });
  assert.equal(s.pins.get('p1').shore, false);
  const { persist } = planOp(s, { type: 'pin.update', id: 'p1', patch: { shore: true } });
  assert.equal(JSON.parse(persist[0].json).shore, true);
});
```

- [ ] **Step 2: Run it, expect failure**

Run: `cd valheim-mapper && node --test tests/ops.test.js`
Expected: FAIL, the second assertion (`'yes'`) returns null instead of a `shore` error.

- [ ] **Step 3: Worker**

In `validateOp` `pin.add`, after the `checked` check add:

```js
      if ('shore' in p && p.shore !== undefined && typeof p.shore !== 'boolean') return 'bad shore';
```

In `pin.update`, add `'shore'` to the patch-key whitelist and after the `checked` line add:

```js
      if ('shore' in p && typeof p.shore !== 'boolean') return 'bad shore';
```

In both `pin.add` copies (`planOp` and `applyOp`) add `...(op.pin.shore ? { shore: true } : {})` after the `log` spread. `pin.update`'s `Object.assign` / spread already carries `shore` through.

- [ ] **Step 4: Run worker tests**

Run: `cd valheim-mapper && node --test tests/ops.test.js`
Expected: pass.

- [ ] **Step 5: Failing client test**

Append to `tests/pins.test.js` (it already imports `pinOps`; add `pinActions` and `createHistory` from `../web/history.js` to the imports):

```js
test('toggleShore flips the tag as one synced undoable command', () => {
  const pin = { id: 'p1', x: 0, z: 0, type: 'fire', name: '', checked: false };
  const app = { state: { pins: [pin], ink: [] }, history: createHistory(), markDirty() {}, tools: { options: { pinType: 'pin' } }, pinsLayer: { selected: null, add() {}, remove() {} } };
  const actions = pinActions(app);
  actions.toggleShore(pin);
  assert.equal(pin.shore, true);
  app.history.undo(); assert.equal(pin.shore, false);
  app.history.redo(); assert.equal(pin.shore, true);
  assert.deepEqual(pinOps.add(pin).ops[0].pin.shore, true);
});
```

- [ ] **Step 6: Run it, expect failure**

Run: `cd valheim-mapper && node --test tests/pins.test.js`
Expected: FAIL, `actions.toggleShore is not a function`.

- [ ] **Step 7: Client**

`web/pins.js`:

`plainPin` gains `...(p.shore ? { shore: true } : {})`.

In `pinActions`, after `toggleChecked`:

```js
    toggleShore(pin) {
      const after = !pin.shore; pin.shore = after;
      app.history.push({ label: 'shore', ...pinOps.update(pin, { shore: after }, { shore: !after }), undo: () => { pin.shore = !after; }, redo: () => { pin.shore = after; } });
      app.markDirty();
    },
```

In `draw`, inside the pin loop right after the icon is drawn (before the checked overlay):

```js
        if (p.shore) { ctx.beginPath(); ctx.arc(sx, sy + s * 0.42, 3.5 * dpr, 0, Math.PI * 2); ctx.fillStyle = '#3b7dbf'; ctx.fill(); ctx.fillStyle = '#f3e9d2'; }
```

`web/index.html` line 80: after the Check button add

```html
    <button id="pin-shore" title="Toggle shore point: Coast draws the coastline through checked shore pins">Shore</button>
```

`web/ui.js` `wirePinPopup`: look up `const shore = document.getElementById('pin-shore');`, in `updatePinPopup` add `shore.classList.toggle('active', !!pin.shore); shore.hidden = !!pin.fixed;`, and wire `shore.onclick = () => { const pin = selectedPin(); if (pin && !pin.fixed) app.pinActions.toggleShore(pin); };`.

- [ ] **Step 8: Run all tests**

Run: `cd valheim-mapper && npm test && npm run test:do`
Expected: pass.

- [ ] **Step 9: Commit**

```bash
cd valheim-mapper && git add worker/ops.js web/pins.js web/index.html web/ui.js tests/ops.test.js tests/pins.test.js && git commit -m "mapper: shore tag on pins with a Shore toggle in the popup"
```

---

### Task 2: Coast: order, curve, command, button

**Files:**
- Create: `web/coast.js`
- Modify: `web/index.html` (toolbar), `web/ui.js` (Coast button and enabled state)
- Modify: `README.md`
- Test: `tests/coast.test.js`

**Interfaces:**
- Consumes: `pin.shore`, `pin.checked`, `pin.fixed`.
- Produces: `shorePins(pins)` → sorted array; `catmullRom(points, step)` → `[[x, z]…]`; `coastCommand(app)` → history command or null; `COAST = { color: '#3b7dbf', width: 4, step: 8 }`.

- [ ] **Step 1: Failing tests**

```js
// tests/coast.test.js
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
```

- [ ] **Step 2: Run, expect failure**

Run: `cd valheim-mapper && node --test tests/coast.test.js`
Expected: FAIL, cannot find `../web/coast.js`.

- [ ] **Step 3: Implement `web/coast.js`**

```js
// Coast: bakes the checked shore pins into one smooth ink stroke, ordered clockwise around spawn.
export const COAST = { color: '#3b7dbf', width: 4, step: 8 };

/** Bearing from spawn in degrees, clockwise from north (+z), in [0, 360). */
const bearingFrom = (sx, sz, p) => { const d = Math.atan2(p.x - sx, p.z - sz) * 180 / Math.PI; return (d + 360) % 360; };

/** Checked, tagged, non-fixed pins sorted by bearing from the fixed start pin (or the origin). */
export function shorePins(pins) {
  const spawn = pins.find(p => p.fixed) ?? { x: 0, z: 0 };
  return pins.filter(p => p.shore && p.checked && !p.fixed)
    .map(p => [bearingFrom(spawn.x, spawn.z, p), p]).sort((a, b) => a[0] - b[0]).map(([, p]) => p);
}

/** Uniform Catmull-Rom through `points`, sampled about every `step` metres; ends are clamped by duplicating the end points. */
export function catmullRom(points, step) {
  if (points.length < 2) return points.map(p => [...p]);
  const P = [points[0], ...points, points[points.length - 1]], out = [];
  for (let i = 1; i < P.length - 2; i++) {
    const [p0, p1, p2, p3] = [P[i - 1], P[i], P[i + 1], P[i + 2]];
    const n = Math.max(1, Math.ceil(Math.hypot(p2[0] - p1[0], p2[1] - p1[1]) / step));
    for (let k = 0; k < n; k++) {
      const t = k / n, t2 = t * t, t3 = t2 * t;
      const f = (a, b, c, d) => 0.5 * (2 * b + (-a + c) * t + (2 * a - 5 * b + 4 * c - d) * t2 + (-a + 3 * b - 3 * c + d) * t3);
      out.push([f(p0[0], p1[0], p2[0], p3[0]), f(p0[1], p1[1], p2[1], p3[1])]);
    }
  }
  out.push([...points[points.length - 1]]);
  return out;
}

/** One undoable, synced ink stroke through the shore pins, or null when there are fewer than two. */
export function coastCommand(app) {
  const pins = shorePins(app.state.pins); if (pins.length < 2) return null;
  const points = catmullRom(pins.map(p => [p.x, p.z]), COAST.step).map(([x, z]) => [+x.toFixed(1), +z.toFixed(1)]);
  const stroke = { id: crypto.randomUUID(), color: COAST.color, width: COAST.width, points };
  const ink = app.state.ink; ink.push(stroke);
  return { label: 'coast', ops: [{ type: 'ink.add', stroke }], inverseOps: [{ type: 'ink.remove', id: stroke.id }],
    undo: () => { const i = ink.indexOf(stroke); if (i >= 0) ink.splice(i, 1); }, redo: () => ink.push(stroke) };
}
```

- [ ] **Step 4: Run tests**

Run: `cd valheim-mapper && node --test tests/coast.test.js`
Expected: pass. If the through-point check fails, the curve is fine but sampling skipped a control point; each segment starts exactly at `p1` (k = 0), so it should not.

- [ ] **Step 5: Button**

`web/index.html`: after the Log button add

```html
  <button id="coast" data-edit hidden title="Draw the coastline through the checked shore pins as ink">Coast</button>
```

`web/ui.js`: import `{ coastCommand, shorePins }` from `./coast.js`. In the toolbar wiring add

```js
  const coast = document.getElementById('coast');
  coast.onclick = () => { const cmd = coastCommand(app); if (cmd) { app.history.push(cmd); app.markDirty(); app.requestRender(); } coast.blur(); };
  app.refreshCoast = () => { coast.disabled = shorePins(app.state?.pins ?? []).length < 2; };
```

and call `app.refreshCoast()` at the end of `app.tools.onChange` and inside `app.updatePinPopup` (cheap: a filter over pins) so the button follows check and shore toggles.

- [ ] **Step 6: README**

After the Sightings bullet add:

```
- Coast: tag verified shore pins with **Shore** in their popup, then press **Coast** in Edit to draw one smooth blue ink line through them, ordered clockwise around spawn. It is ordinary ink afterwards, so you can delete the pins and keep the line, or erase and redraw it after a re-survey. One survey's shore pins should run along the coast without doubling back; survey a fjord in two batches.
```

- [ ] **Step 7: Run everything and commit**

```bash
cd valheim-mapper && npm test && npm run test:do && git add web/coast.js web/index.html web/ui.js README.md tests/coast.test.js && git commit -m "mapper: Coast bakes the checked shore pins into one smooth ink stroke"
```

---

### Task 3: Log paths go with their pin

**Files:**
- Modify: `web/pins.js` (`pinActions.remove`)
- Modify: `README.md` (Leg log bullet)
- Test: `tests/pins.test.js`

**Interfaces:**
- Consumes: `pin.log.ink` (stroke id), `app.state.ink`.
- Produces: `pinActions.remove(pin)` unchanged signature; the command now carries `ink.remove` + `pin.remove` ops.

- [ ] **Step 1: Failing test**

Append to `tests/pins.test.js`:

```js
test('removing a logged pin removes its path too, and undo restores both', () => {
  const stroke = { id: 's1', color: '#000', width: 4, points: [[0, 0], [0, 100]] }, other = { id: 's2', color: '#000', width: 4, points: [[5, 5]] };
  const pin = { id: 'p1', x: 0, z: 100, type: 'pin', name: 'log end', checked: false, log: { from: 'start', start: [0, 0], legs: 'N 25', ink: 's1' } };
  const state = { pins: [pin], ink: [other, stroke] };
  const app = { state, history: createHistory(), markDirty() {}, tools: { options: { pinType: 'pin' } }, pinsLayer: { selected: null, add() {}, remove(id) { const i = state.pins.findIndex(p => p.id === id); if (i >= 0) state.pins.splice(i, 1); } } };
  const actions = pinActions(app);
  assert.equal(actions.remove(pin), true);
  assert.deepEqual(state.ink.map(s => s.id), ['s2']); assert.equal(state.pins.length, 0);
  app.history.undo();
  assert.deepEqual(state.ink.map(s => s.id), ['s2', 's1']); assert.equal(state.pins[0], pin);
  app.history.redo();
  assert.deepEqual(state.ink.map(s => s.id), ['s2']);
  const gone = { ...pin, id: 'p2', log: { ...pin.log, ink: 'missing' } }; state.pins.push(gone);
  assert.equal(actions.remove(gone), true); assert.deepEqual(state.ink.map(s => s.id), ['s2']);
});
```

- [ ] **Step 2: Run, expect failure**

Run: `cd valheim-mapper && node --test tests/pins.test.js`
Expected: FAIL, ink still has `s1` after removal.

- [ ] **Step 3: Implement**

Replace `pinActions.remove` with:

```js
    remove(pin) {
      if (pin.fixed) return false;
      const ink = app.state.ink, si = pin.log?.ink ? ink.findIndex(s => s.id === pin.log.ink) : -1, stroke = si >= 0 ? ink[si] : null;
      const idx = app.state.pins.indexOf(pin); layer().remove(pin.id); if (stroke) ink.splice(si, 1);
      const pinCmd = pinOps.remove(pin);
      app.history.push({ label: 'remove pin',
        ops: [...(stroke ? [{ type: 'ink.remove', id: stroke.id }] : []), ...pinCmd.ops],
        inverseOps: [...pinCmd.inverseOps, ...(stroke ? [{ type: 'ink.add', stroke }] : [])],
        undo: () => { app.state.pins.splice(idx, 0, pin); if (stroke) ink.splice(Math.min(si, ink.length), 0, stroke); },
        redo: () => { layer().remove(pin.id); if (stroke) { const i = ink.indexOf(stroke); if (i >= 0) ink.splice(i, 1); } } });
      app.markDirty(); return true;
    },
```

Note: the layer's `remove(id)` is what deletes the pin from `state.pins` in the real app (see `createPins`), which the test's fake mirrors.

- [ ] **Step 4: README**

In the Leg log bullet, append the sentence: "Deleting a log's end pin also removes the path it drew (undo brings both back); paths of later logs that started from it stay."

- [ ] **Step 5: Run everything and commit**

```bash
cd valheim-mapper && npm test && npm run test:do && git add web/pins.js README.md tests/pins.test.js && git commit -m "mapper: deleting a logged pin removes its path in the same undo step"
```

---

## Self-review notes

- Spec coverage: tag + toggle + dot (Task 1), Coast ordering/curve/stroke/button/README (Task 2), log path removal + README (Task 3). Worker validation for `shore` in Task 1.
- `shorePins` excludes `fixed` pins even if tagged, matching the spec.
- The Coast button's enabled state is refreshed from the toolbar and popup update paths; there is no separate event for pin edits.
