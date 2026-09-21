# Cloudflare Shared-Map Sync Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Serve the mapper at `jeffabliss.com/valheim-mapper` from a Cloudflare Worker with one Durable Object holding the shared map, so allow-listed friends draw together live with cursors, replacing the Node file server.

**Architecture:** Worker (Access JWT check → static assets / WebSocket to DO). `MapRoom` Durable Object keeps both rasters in memory, persists 128×128 tiles + ink/pin rows in SQLite (2 s debounced tile flush via alarm), validates and broadcasts ops, fans out presence. Client: `sync.js` turns undo commands into ops and applies remote ops straight into state; `presence.js` draws friends' cursors.

**Tech Stack:** Cloudflare Workers + Durable Objects (SQLite, WebSocket Hibernation), Workers static assets, WebCrypto (RS256), vanilla ES modules, `node:test`, `vitest` 4 + `@cloudflare/vitest-pool-workers` 0.22 for the DO, `wrangler` 4.

Spec: `docs/superpowers/specs/2026-09-21-cloudflare-sync-design.md`. Working directory for every task: `/Users/jbliss/WebstormProjects/jeffabliss.com/valheim-mapper` (a subdirectory of the jeffabliss.com repo; commit from the repo root with paths under `valheim-mapper/`).

## Global Constraints

- Zero runtime dependencies (front end and Worker). Dev dependencies allowed: `wrangler`, `vitest`, `@cloudflare/vitest-pool-workers`.
- World: 2560×2560 cells (`CELLS`), 8 m cells, raster row 0 = south. Tiles 128×128 → 20×20 per layer. Layer codes: terrain 0, fog 1.
- Binary raster frame (client→server): `[layer u8][x0 u16le][z0 u16le][x1 u16le][z1 u16le][bytes…]`, rect inclusive. Server→client: `[seq u32le][nameLen u8][name utf8…][client frame…]`.
- JSON frames `{ t, … }`; op types exactly: `ink.add`, `ink.remove`, `pin.add`, `pin.update`, `pin.remove`; messages `hello`, `op`, `presence`, `error`, `cursor`.
- Validation limits: rect within 0..2559 and bytes length = area; ids strings ≤ 64; stroke ≤ 5000 points; pin name ≤ 40; pin type ∈ `PIN_TYPES` minus `start`; `start` pin immutable.
- Cursor throttle 5/s. Presence fade after 10 s without update.
- Access: header `Cf-Access-Jwt-Assertion`; JWKS `https://${ACCESS_TEAM}.cloudflareaccess.com/cdn-cgi/access/certs`; check RS256 signature, `iss`, `aud` includes `ACCESS_AUD`, `exp`; `DEV_IDENTITY` var bypasses (dev only). 403 on failure.
- App path prefix `/valheim-mapper`; the Worker strips it before `env.ASSETS.fetch`.
- No emails, AUD tags or secrets committed. `web/assets/` stays gitignored.
- Each module ≲ 250 lines. Commits end with `Co-Authored-By: Claude <model id> <noreply@anthropic.com>`. The site repo's `CLAUDE.md` says "no comments"; the mapper subdirectory has its own `CLAUDE.md` (Task 1) that overrides this for `valheim-mapper/`.

## File Structure

```
valheim-mapper/
  CLAUDE.md                 conventions for this subproject
  package.json              type=module; scripts test / test:do / dev / deploy; devDeps
  wrangler.jsonc            worker config (see Task 1)
  .dev.vars                 DEV_IDENTITY=dev@localhost (local only, not a secret)
  vitest.config.js          workers pool config for tests/do
  worker/index.js           fetch entry
  worker/access.js          verifyAccessJwt
  worker/ops.js             pure: state, validate, apply, tiles, snapshot
  worker/map.js             MapRoom DO
  web/proto.js              shared framing + identity helpers (browser + worker)
  web/sync.js               client sync
  web/presence.js           presence layer + sidebar list
  web/{history,raster,ink,pins,ui,main,tools,store}.js   modified
  tests/*.test.js           node:test
  tests/do/map.test.js      vitest-pool-workers
  docs/superpowers/runbook-cloudflare.md
```

---

### Task 1: Scaffold the Worker project and remove the Node server

**Files:**
- Create: `CLAUDE.md`, `wrangler.jsonc`, `.dev.vars`, `vitest.config.js`; Modify: `package.json`, `.gitignore`, `README.md`; Delete: `server/`, `tests/server.test.js`, `.claude/launch.json` (old Node preview config)

- [ ] **Step 1: CLAUDE.md** (subproject conventions; overrides the site's no-comments rule here)

```markdown
# valheim-mapper (subproject of jeffabliss.com)

Shared hand-drawn Valheim map served at jeffabliss.com/valheim-mapper by a Cloudflare Worker + Durable Object.
Design docs: docs/superpowers/specs/. This directory follows its own conventions, not the Hugo site's:

- Vanilla ES modules, zero runtime dependencies (browser and Worker). Dev deps: wrangler, vitest, @cloudflare/vitest-pool-workers.
- Short explanatory comments are welcome where the code is not self-evident.
- Tests: `npm test` (node:test, pure modules) and `npm run test:do` (Durable Object, workers pool). Run both before committing.
- `web/assets/` (game textures/fonts/icons) is gitignored and never committed or redistributed; `npm run deploy` uploads it from a machine that has it.
- Never commit emails, Access AUD tags or secrets. Access allow-list lives only in the Cloudflare dashboard.
- Local dev: `npm run dev` → http://localhost:8787/valheim-mapper/ (identity from .dev.vars; `?as=name@x` switches user in dev).
```

- [ ] **Step 2: package.json**

```json
{
  "name": "valheim-mapper",
  "private": true,
  "type": "module",
  "engines": { "node": ">=20" },
  "scripts": {
    "test": "node --test tests/*.test.js",
    "test:do": "vitest run --config vitest.config.js",
    "dev": "wrangler dev",
    "deploy": "wrangler deploy",
    "assets": "node scripts/copy_assets.mjs"
  },
  "devDependencies": {
    "@cloudflare/vitest-pool-workers": "^0.22.0",
    "vitest": "^4.1.0",
    "wrangler": "^4.119.0"
  }
}
```

- [ ] **Step 3: wrangler.jsonc**

```jsonc
{
  "$schema": "node_modules/wrangler/config-schema.json",
  "name": "valheim-mapper",
  "main": "worker/index.js",
  "compatibility_date": "2026-09-01",
  "workers_dev": false,
  "routes": [{ "pattern": "jeffabliss.com/valheim-mapper*", "zone_name": "jeffabliss.com" }],
  "assets": { "directory": "./web", "binding": "ASSETS", "run_worker_first": true },
  "durable_objects": { "bindings": [{ "name": "MAP", "class_name": "MapRoom" }] },
  "migrations": [{ "tag": "v1", "new_sqlite_classes": ["MapRoom"] }],
  "vars": { "ACCESS_TEAM": "", "ACCESS_AUD": "" },
  "observability": { "enabled": true }
}
```
`ACCESS_TEAM`/`ACCESS_AUD` are filled in by the runbook (Task 9) via `wrangler secret put` or dashboard vars; empty means "deny everything" in production.

- [ ] **Step 4: .dev.vars, vitest.config.js, .gitignore**

`.dev.vars`:
```
DEV_IDENTITY=dev@localhost
```
`vitest.config.js`:
```js
import { defineWorkersConfig } from '@cloudflare/vitest-pool-workers/config';
export default defineWorkersConfig({
  test: { include: ['tests/do/**/*.test.js'], poolOptions: { workers: { wrangler: { configPath: './wrangler.jsonc' }, miniflare: { bindings: { DEV_IDENTITY: 'test@localhost' } } } } },
});
```
Append to `.gitignore`: `.wrangler/`, `node_modules/`.

- [ ] **Step 5: Remove the Node server** — `git rm -r server tests/server.test.js .claude/launch.json`. In `README.md` replace the Setup/Development sections with:
````markdown
## Setup
1. Extract game assets once (needs the Steam install): `source activate.sh && python scripts/extract_assets.py out/assets && npm run assets`
2. `npm install`
3. Local dev: `npm run dev` → http://localhost:8787/valheim-mapper/ . Open a second tab with `?as=friend@x` to simulate another user.

## Deploy
`npm run deploy` from a machine with `web/assets/` populated. Access setup: see `docs/superpowers/runbook-cloudflare.md`.

## Development
`npm test` (pure modules, node:test) and `npm run test:do` (Durable Object, workers pool). Game assets under `out/`, `web/assets/` are gitignored and must not be redistributed.
````
Also delete the "Map autosaves to `data/map.json`…" sentence.

- [ ] **Step 6: Install and verify** — `npm install` (creates `package-lock.json`, commit it), `npm test` → 45 passing minus the 2 server tests = 43. `npx wrangler --version` prints 4.x.

- [ ] **Step 7: Commit** (from repo root): `git add valheim-mapper && git commit -m "mapper: scaffold Cloudflare Worker project, remove Node server" -m "Co-Authored-By: …"`

---

### Task 2: Shared protocol module (`web/proto.js`)

**Files:** Create `web/proto.js`, `tests/proto.test.js`

**Interfaces (produces):**
- `LAYER = { terrain: 0, fog: 1 }`, `LAYER_NAME = ['terrain', 'fog']`
- `encodeRasterOp({ layer, rect, bytes }) → Uint8Array` (layer is 0/1 or 'terrain'/'fog'); `decodeRasterOp(u8) → { layer:number, rect:{x0,z0,x1,z1}, bytes:Uint8Array }` (throws `Error('raster frame: …')` on bad length/rect)
- `wrapServerRaster(seq, name, payload) → Uint8Array`; `unwrapServerRaster(u8) → { seq, name, payload }`
- `identityFromEmail(email) → { email, name, color }` — name = part before `@` (max 24 chars), color = `hsl(h 70% 55%)` with `h = hash(email) % 12 * 30`
- `rectArea(rect)`, `rectValid(rect, cells=2560) → boolean`

- [ ] **Step 1: Failing tests**

```js
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { encodeRasterOp, decodeRasterOp, wrapServerRaster, unwrapServerRaster, identityFromEmail, rectValid, LAYER } from '../web/proto.js';

test('raster op frame round-trips', () => {
  const bytes = new Uint8Array([1, 2, 3, 4, 5, 6]);
  const u8 = encodeRasterOp({ layer: 'fog', rect: { x0: 10, z0: 20, x1: 12, z1: 21 }, bytes });
  assert.equal(u8.length, 9 + 6); assert.equal(u8[0], LAYER.fog);
  const d = decodeRasterOp(u8);
  assert.equal(d.layer, 1); assert.deepEqual(d.rect, { x0: 10, z0: 20, x1: 12, z1: 21 }); assert.deepEqual([...d.bytes], [...bytes]);
});
test('decode rejects bad frames', () => {
  assert.throws(() => decodeRasterOp(new Uint8Array(3)), /raster frame/);
  const bad = encodeRasterOp({ layer: 0, rect: { x0: 0, z0: 0, x1: 1, z1: 0 }, bytes: new Uint8Array(2) });
  assert.throws(() => decodeRasterOp(bad.subarray(0, bad.length - 1)), /raster frame/);            // length mismatch
  assert.throws(() => decodeRasterOp(encodeRasterOp({ layer: 0, rect: { x0: 5, z0: 0, x1: 4, z1: 0 }, bytes: new Uint8Array(0) })), /raster frame/); // x1 < x0
  assert.throws(() => decodeRasterOp(encodeRasterOp({ layer: 0, rect: { x0: 0, z0: 0, x1: 2560, z1: 0 }, bytes: new Uint8Array(2561) })), /raster frame/);
});
test('server wrapper carries seq and author', () => {
  const payload = encodeRasterOp({ layer: 0, rect: { x0: 0, z0: 0, x1: 0, z1: 0 }, bytes: new Uint8Array([7]) });
  const w = wrapServerRaster(4242, 'jörg', payload);
  const u = unwrapServerRaster(w);
  assert.equal(u.seq, 4242); assert.equal(u.name, 'jörg'); assert.deepEqual([...u.payload], [...payload]);
});
test('identity from email is stable and sanitised', () => {
  const a = identityFromEmail('Dan.Kelshaw@example.com'), b = identityFromEmail('Dan.Kelshaw@example.com');
  assert.equal(a.name, 'Dan.Kelshaw'); assert.equal(a.color, b.color); assert.match(a.color, /^hsl\(\d+ 70% 55%\)$/);
  assert.equal(identityFromEmail('a'.repeat(40) + '@x').name.length, 24);
});
test('rectValid', () => {
  assert.ok(rectValid({ x0: 0, z0: 0, x1: 2559, z1: 2559 }));
  assert.ok(!rectValid({ x0: -1, z0: 0, x1: 0, z1: 0 })); assert.ok(!rectValid({ x0: 0, z0: 0, x1: 2560, z1: 0 })); assert.ok(!rectValid({ x0: 3, z0: 0, x1: 2, z1: 0 }));
});
```

- [ ] **Step 2: Run, expect failure.**  - [ ] **Step 3: Implement**

```js
// Wire format shared by the browser client and the Worker. No DOM, no Node APIs.
import { CELLS } from './world.js';

export const LAYER = { terrain: 0, fog: 1 };
export const LAYER_NAME = ['terrain', 'fog'];
const HEADER = 9;

export const rectArea = r => (r.x1 - r.x0 + 1) * (r.z1 - r.z0 + 1);
export const rectValid = (r, cells = CELLS) => [r.x0, r.z0, r.x1, r.z1].every(n => Number.isInteger(n) && n >= 0 && n < cells) && r.x1 >= r.x0 && r.z1 >= r.z0;

export function encodeRasterOp({ layer, rect, bytes }) {
  const code = typeof layer === 'string' ? LAYER[layer] : layer;
  const out = new Uint8Array(HEADER + bytes.length), dv = new DataView(out.buffer);
  out[0] = code; dv.setUint16(1, rect.x0, true); dv.setUint16(3, rect.z0, true); dv.setUint16(5, rect.x1, true); dv.setUint16(7, rect.z1, true);
  out.set(bytes, HEADER);
  return out;
}
export function decodeRasterOp(u8) {
  if (!(u8 instanceof Uint8Array)) u8 = new Uint8Array(u8);
  if (u8.length < HEADER) throw new Error('raster frame: too short');
  const dv = new DataView(u8.buffer, u8.byteOffset, u8.byteLength);
  const layer = u8[0], rect = { x0: dv.getUint16(1, true), z0: dv.getUint16(3, true), x1: dv.getUint16(5, true), z1: dv.getUint16(7, true) };
  if (layer > 1 || !rectValid(rect)) throw new Error('raster frame: bad layer or rect');
  if (u8.length - HEADER !== rectArea(rect)) throw new Error('raster frame: length mismatch');
  return { layer, rect, bytes: u8.subarray(HEADER) };
}

export function wrapServerRaster(seq, name, payload) {
  const nameBytes = new TextEncoder().encode(name).subarray(0, 255);
  const out = new Uint8Array(5 + nameBytes.length + payload.length);
  new DataView(out.buffer).setUint32(0, seq, true); out[4] = nameBytes.length; out.set(nameBytes, 5); out.set(payload, 5 + nameBytes.length);
  return out;
}
export function unwrapServerRaster(u8) {
  if (!(u8 instanceof Uint8Array)) u8 = new Uint8Array(u8);
  const seq = new DataView(u8.buffer, u8.byteOffset).getUint32(0, true), n = u8[4];
  return { seq, name: new TextDecoder().decode(u8.subarray(5, 5 + n)), payload: u8.subarray(5 + n) };
}

export function identityFromEmail(email) {
  let h = 0; for (const ch of email.toLowerCase()) h = (h * 31 + ch.charCodeAt(0)) >>> 0;
  return { email, name: email.split('@')[0].slice(0, 24) || 'anon', color: `hsl(${(h % 12) * 30} 70% 55%)` };
}
```

- [ ] **Step 4: Run, expect pass.**  - [ ] **Step 5: Commit** `mapper: shared wire protocol module`.

---

### Task 3: Server-side op model (`worker/ops.js`)

**Files:** Create `worker/ops.js`, `tests/ops.test.js`

**Interfaces (produces):**
- `TILE = 128`, `TILES = 20`, `tileKey(layer, tx, tz) → 'l:tx:tz'`, `parseTileKey(key)`
- `tilesForRect(rect) → [{tx,tz}]`, `tileBytes(raster, tx, tz) → Uint8Array(TILE*TILE)`, `putTile(raster, tx, tz, bytes)`
- `makeState() → { terrain: raster, fog: raster, ink: Map<id,stroke>, pins: Map<id,pin> }` (start pin present)
- `validateOp(op) → null | string` for JSON ops (`ink.add`, `ink.remove`, `pin.add`, `pin.update`, `pin.remove`); `validateRaster({layer, rect, bytes}) → null | string`
- `applyOp(state, op) → { persist: [{table, id, json|null}] }` (rows to write; `json: null` = delete); `applyRaster(state, {layer, rect, bytes}) → Set<tileKey>`
- `snapshotDoc(state) → Promise<doc>` (`{version:1, terrain, fog, ink:[], pins:[], settings: undefined}` using `png.js`)
- Consumes `../web/raster.js`, `../web/world.js`, `../web/png.js`, `../web/store.js` (`ensureStartPin`, `SAVE_VERSION`), `../web/proto.js`.

- [ ] **Step 1: Failing tests**

```js
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { makeState, validateOp, validateRaster, applyOp, applyRaster, tilesForRect, tileBytes, putTile, snapshotDoc, TILE } from '../worker/ops.js';
import { createState } from '../web/store.js';

test('makeState has the fixed start pin and empty rasters', () => {
  const s = makeState();
  assert.equal(s.pins.get('start').fixed, true); assert.equal(s.terrain.data.length, 2560 * 2560); assert.equal(s.ink.size, 0);
});
test('tiles: rect → tiles, get/put round trip', () => {
  assert.deepEqual(tilesForRect({ x0: 0, z0: 0, x1: 127, z1: 127 }), [{ tx: 0, tz: 0 }]);
  assert.deepEqual(tilesForRect({ x0: 120, z0: 250, x1: 130, z1: 260 }), [{ tx: 0, tz: 1 }, { tx: 1, tz: 1 }, { tx: 0, tz: 2 }, { tx: 1, tz: 2 }]);
  const s = makeState(); s.terrain.data[129 * 2560 + 130] = 9;      // cell (130,129) → tile (1,1) local (2,1)
  const t = tileBytes(s.terrain, 1, 1); assert.equal(t.length, TILE * TILE); assert.equal(t[1 * TILE + 2], 9);
  const s2 = makeState(); putTile(s2.terrain, 1, 1, t); assert.equal(s2.terrain.data[129 * 2560 + 130], 9);
});
test('raster op validation and apply', () => {
  const s = makeState();
  assert.equal(validateRaster({ layer: 0, rect: { x0: 0, z0: 0, x1: 1, z1: 0 }, bytes: new Uint8Array([1, 2]) }), null);
  assert.match(validateRaster({ layer: 0, rect: { x0: 0, z0: 0, x1: 1, z1: 0 }, bytes: new Uint8Array(3) }), /length/);
  assert.match(validateRaster({ layer: 2, rect: { x0: 0, z0: 0, x1: 0, z1: 0 }, bytes: new Uint8Array(1) }), /layer/);
  assert.match(validateRaster({ layer: 0, rect: { x0: 0, z0: 0, x1: 0, z1: 0 }, bytes: new Uint8Array([10]) }), /biome/);   // terrain ids ≤ 9
  const touched = applyRaster(s, { layer: 1, rect: { x0: 126, z0: 0, x1: 129, z1: 0 }, bytes: new Uint8Array([255, 255, 255, 255]) });
  assert.deepEqual([...touched].sort(), ['1:0:0', '1:1:0']); assert.equal(s.fog.data[128], 255);
});
test('json op validation', () => {
  assert.equal(validateOp({ type: 'pin.add', pin: { id: 'p1', x: 1, z: 2, type: 'fire', name: 'Camp', checked: false } }), null);
  assert.match(validateOp({ type: 'pin.add', pin: { id: 'p1', x: 1, z: 2, type: 'start', name: '', checked: false } }), /type/);
  assert.match(validateOp({ type: 'pin.update', id: 'start', patch: { x: 5 } }), /start/);
  assert.match(validateOp({ type: 'pin.remove', id: 'start' }), /start/);
  assert.match(validateOp({ type: 'pin.update', id: 'p1', patch: { name: 'x'.repeat(41) } }), /name/);
  assert.match(validateOp({ type: 'ink.add', stroke: { id: 's', color: '#000', width: 4, points: Array.from({ length: 5001 }, () => [0, 0]) } }), /points/);
  assert.match(validateOp({ type: 'ink.add', stroke: { id: 's', color: 'javascript:x', width: 4, points: [[0, 0]] } }), /color/);
  assert.match(validateOp({ type: 'nope' }), /type/);
  assert.match(validateOp({ type: 'ink.remove', id: 'x'.repeat(65) }), /id/);
});
test('apply json ops mutates state and reports rows', () => {
  const s = makeState();
  let r = applyOp(s, { type: 'ink.add', stroke: { id: 's1', color: '#123456', width: 4, points: [[0, 0], [1, 1]] } });
  assert.deepEqual(r.persist, [{ table: 'ink', id: 's1', json: JSON.stringify(s.ink.get('s1')) }]);
  r = applyOp(s, { type: 'pin.add', pin: { id: 'p1', x: 1, z: 2, type: 'fire', name: 'Camp', checked: false } });
  assert.equal(s.pins.get('p1').name, 'Camp');
  applyOp(s, { type: 'pin.update', id: 'p1', patch: { checked: true, name: 'Camp 2' } });
  assert.equal(s.pins.get('p1').checked, true); assert.equal(s.pins.get('p1').name, 'Camp 2'); assert.equal(s.pins.get('p1').x, 1);
  assert.equal(applyOp(s, { type: 'pin.update', id: 'missing', patch: { checked: true } }).persist.length, 0);
  r = applyOp(s, { type: 'pin.remove', id: 'p1' }); assert.deepEqual(r.persist, [{ table: 'pins', id: 'p1', json: null }]); assert.ok(!s.pins.has('p1'));
  r = applyOp(s, { type: 'ink.remove', id: 's1' }); assert.ok(!s.ink.has('s1'));
});
test('snapshotDoc round-trips through the client state factory', async () => {
  const s = makeState();
  applyRaster(s, { layer: 0, rect: { x0: 5, z0: 5, x1: 5, z1: 5 }, bytes: new Uint8Array([3]) });
  applyOp(s, { type: 'ink.add', stroke: { id: 's1', color: '#000000', width: 4, points: [[0, 0], [1, 1]] } });
  const doc = await snapshotDoc(s);
  assert.equal(doc.version, 1); assert.equal(doc.ink.length, 1); assert.equal(doc.pins[0].type, 'start');
  const c = await createState(JSON.parse(JSON.stringify(doc)));
  assert.equal(c.terrain.get(-10240 + 5 * 8 + 4, -10240 + 5 * 8 + 4), 3); assert.equal(c.ink[0].id, 's1');
});
```

- [ ] **Step 2: Run, expect failure.**  - [ ] **Step 3: Implement**

```js
// Authoritative map state and the rules for changing it. Pure: no storage, no sockets.
import { createRaster } from '../web/raster.js';
import { CELLS, PIN_TYPES, BIOMES } from '../web/world.js';
import { encodeGray, toBase64 } from '../web/png.js';
import { ensureStartPin, SAVE_VERSION } from '../web/store.js';
import { LAYER_NAME, rectValid, rectArea } from '../web/proto.js';

export const TILE = 128, TILES = CELLS / TILE;
export const tileKey = (layer, tx, tz) => `${layer}:${tx}:${tz}`;
export const parseTileKey = k => { const [layer, tx, tz] = k.split(':').map(Number); return { layer, tx, tz }; };

export function tilesForRect(r) {
  const out = [];
  for (let tz = Math.floor(r.z0 / TILE); tz <= Math.floor(r.z1 / TILE); tz++) for (let tx = Math.floor(r.x0 / TILE); tx <= Math.floor(r.x1 / TILE); tx++) out.push({ tx, tz });
  return out;
}
export const tileBytes = (raster, tx, tz) => raster.snapshot({ x0: tx * TILE, z0: tz * TILE, x1: tx * TILE + TILE - 1, z1: tz * TILE + TILE - 1 });
export const putTile = (raster, tx, tz, bytes) => raster.restore({ x0: tx * TILE, z0: tz * TILE, x1: tx * TILE + TILE - 1, z1: tz * TILE + TILE - 1 }, bytes);

export function makeState() {
  const pins = new Map(); for (const p of ensureStartPin([])) pins.set(p.id, p);
  return { terrain: createRaster(), fog: createRaster(), ink: new Map(), pins };
}

const MAX_BIOME = BIOMES.length - 1, USER_PIN_TYPES = new Set(PIN_TYPES.filter(t => t !== 'start'));
const isId = v => typeof v === 'string' && v.length > 0 && v.length <= 64;
const isNum = v => typeof v === 'number' && Number.isFinite(v);
const isColor = v => typeof v === 'string' && /^#[0-9a-f]{6}$/i.test(v);

export function validateRaster({ layer, rect, bytes }) {
  if (!(layer === 0 || layer === 1)) return 'bad layer';
  if (!rect || !rectValid(rect)) return 'bad rect';
  if (!(bytes instanceof Uint8Array) || bytes.length !== rectArea(rect)) return 'bad length';
  if (layer === 0) for (let i = 0; i < bytes.length; i++) if (bytes[i] > MAX_BIOME) return 'bad biome id';
  return null;
}
export function validateOp(op) {
  if (!op || typeof op !== 'object') return 'bad op';
  switch (op.type) {
    case 'ink.add': { const s = op.stroke;
      if (!s || !isId(s.id)) return 'bad id'; if (!isColor(s.color)) return 'bad color';
      if (!isNum(s.width) || s.width <= 0 || s.width > 512) return 'bad width';
      if (!Array.isArray(s.points) || s.points.length < 1 || s.points.length > 5000 || !s.points.every(p => Array.isArray(p) && p.length === 2 && p.every(isNum))) return 'bad points';
      return null; }
    case 'ink.remove': return isId(op.id) ? null : 'bad id';
    case 'pin.add': { const p = op.pin;
      if (!p || !isId(p.id) || p.id === 'start') return 'bad id'; if (!USER_PIN_TYPES.has(p.type)) return 'bad type';
      if (!isNum(p.x) || !isNum(p.z)) return 'bad position'; if (typeof p.name !== 'string' || p.name.length > 40) return 'bad name';
      if (typeof p.checked !== 'boolean') return 'bad checked'; return null; }
    case 'pin.update': { if (!isId(op.id)) return 'bad id'; if (op.id === 'start') return 'start pin is fixed';
      const p = op.patch; if (!p || typeof p !== 'object') return 'bad patch';
      for (const k of Object.keys(p)) if (!['name', 'checked', 'x', 'z'].includes(k)) return 'bad patch key';
      if ('name' in p && (typeof p.name !== 'string' || p.name.length > 40)) return 'bad name';
      if ('checked' in p && typeof p.checked !== 'boolean') return 'bad checked';
      if (('x' in p && !isNum(p.x)) || ('z' in p && !isNum(p.z))) return 'bad position'; return null; }
    case 'pin.remove': if (!isId(op.id)) return 'bad id'; return op.id === 'start' ? 'start pin is fixed' : null;
    default: return 'bad type';
  }
}

export function applyRaster(state, { layer, rect, bytes }) {
  const raster = layer === 0 ? state.terrain : state.fog;
  raster.restore(rect, bytes);
  return new Set(tilesForRect(rect).map(({ tx, tz }) => tileKey(layer, tx, tz)));
}
export function applyOp(state, op) {
  const persist = [];
  switch (op.type) {
    case 'ink.add': { const s = { id: op.stroke.id, color: op.stroke.color, width: op.stroke.width, points: op.stroke.points }; state.ink.set(s.id, s); persist.push({ table: 'ink', id: s.id, json: JSON.stringify(s) }); break; }
    case 'ink.remove': if (state.ink.delete(op.id)) persist.push({ table: 'ink', id: op.id, json: null }); break;
    case 'pin.add': { const p = { id: op.pin.id, x: op.pin.x, z: op.pin.z, type: op.pin.type, name: op.pin.name, checked: op.pin.checked }; state.pins.set(p.id, p); persist.push({ table: 'pins', id: p.id, json: JSON.stringify(p) }); break; }
    case 'pin.update': { const p = state.pins.get(op.id); if (!p) break; Object.assign(p, op.patch); persist.push({ table: 'pins', id: p.id, json: JSON.stringify(p) }); break; }
    case 'pin.remove': if (state.pins.delete(op.id)) persist.push({ table: 'pins', id: op.id, json: null }); break;
  }
  return { persist };
}

export async function snapshotDoc(state) {
  const enc = async r => toBase64(await encodeGray(r.data, r.cells, r.cells));
  return { version: SAVE_VERSION, terrain: await enc(state.terrain), fog: await enc(state.fog), ink: [...state.ink.values()], pins: [...state.pins.values()] };
}
```
Note: `createState` (store.js) must tolerate a doc without `settings` — check it does (`{ ...base.settings, ...doc.settings, grid: {...} }` handles undefined). Add `LAYER_NAME` import only if used; remove unused imports.

- [ ] **Step 4: Run, expect pass.**  - [ ] **Step 5: Commit** `mapper: server op model, validation and tiles`.

---

### Task 4: Access JWT verification (`worker/access.js`)

**Files:** Create `worker/access.js`, `tests/access.test.js`

**Interfaces (produces):** `verifyAccessJwt(token, { team, aud, fetchFn = fetch, now = Date.now() }) → Promise<{ email }>`; throws `Error` with a short reason on any failure. Module-level JWKS cache `Map<team, {keys, fetchedAt}>`; refetch when `kid` unknown or cache older than 1 h. `resetJwksCache()` for tests. `identityFromRequest(request, env) → Promise<{email}>`: if `env.DEV_IDENTITY` return `{ email: url ?as= param || env.DEV_IDENTITY }`; else read `Cf-Access-Jwt-Assertion` and verify (missing header → throw).

- [ ] **Step 1: Failing tests** (generate a real RSA key in Node's WebCrypto and sign a token)

```js
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { verifyAccessJwt, resetJwksCache, identityFromRequest } from '../worker/access.js';

const b64u = buf => Buffer.from(buf).toString('base64url');
async function setup() {
  const { publicKey, privateKey } = await crypto.subtle.generateKey({ name: 'RSASSA-PKCS1-v1_5', modulusLength: 2048, publicExponent: new Uint8Array([1, 0, 1]), hash: 'SHA-256' }, true, ['sign', 'verify']);
  const jwk = await crypto.subtle.exportKey('jwk', publicKey);
  const kid = 'k1';
  const sign = async (claims, header = { alg: 'RS256', kid, typ: 'JWT' }) => {
    const data = `${b64u(JSON.stringify(header))}.${b64u(JSON.stringify(claims))}`;
    const sig = await crypto.subtle.sign('RSASSA-PKCS1-v1_5', privateKey, new TextEncoder().encode(data));
    return `${data}.${b64u(sig)}`;
  };
  let fetches = 0;
  const fetchFn = async url => { fetches++; assert.equal(url, 'https://team1.cloudflareaccess.com/cdn-cgi/access/certs'); return { ok: true, json: async () => ({ keys: [{ ...jwk, kid, alg: 'RS256', use: 'sig' }] }) }; };
  return { sign, fetchFn, fetches: () => fetches };
}
const now = 1_800_000_000_000, claims = { aud: ['aud-1'], email: 'a@example.com', iss: 'https://team1.cloudflareaccess.com', exp: now / 1000 + 600, iat: now / 1000 };

test('valid token yields the email and caches the JWKS', async () => {
  resetJwksCache(); const { sign, fetchFn, fetches } = await setup();
  const opts = { team: 'team1', aud: 'aud-1', fetchFn, now };
  assert.deepEqual(await verifyAccessJwt(await sign(claims), opts), { email: 'a@example.com' });
  await verifyAccessJwt(await sign(claims), opts); assert.equal(fetches(), 1);
});
test('rejects wrong aud, wrong iss, expired, bad signature, bad alg, missing', async () => {
  resetJwksCache(); const { sign, fetchFn } = await setup(); const opts = { team: 'team1', aud: 'aud-1', fetchFn, now };
  await assert.rejects(verifyAccessJwt(await sign({ ...claims, aud: ['other'] }), opts), /aud/);
  await assert.rejects(verifyAccessJwt(await sign({ ...claims, iss: 'https://evil.cloudflareaccess.com' }), opts), /iss/);
  await assert.rejects(verifyAccessJwt(await sign({ ...claims, exp: now / 1000 - 1 }), opts), /exp/);
  const t = await sign(claims); await assert.rejects(verifyAccessJwt(t.slice(0, -4) + 'AAAA', opts), /signature/);
  await assert.rejects(verifyAccessJwt(await sign(claims, { alg: 'HS256', kid: 'k1' }), opts), /alg/);
  await assert.rejects(verifyAccessJwt('', opts), /token/);
  await assert.rejects(verifyAccessJwt(await sign(claims, { alg: 'RS256', kid: 'unknown' }), opts), /key/);
});
test('identityFromRequest: dev identity with ?as override, else header required', async () => {
  const env = { DEV_IDENTITY: 'dev@localhost' };
  assert.deepEqual(await identityFromRequest(new Request('http://x/valheim-mapper/'), env), { email: 'dev@localhost' });
  assert.deepEqual(await identityFromRequest(new Request('http://x/valheim-mapper/?as=b@x'), env), { email: 'b@x' });
  await assert.rejects(identityFromRequest(new Request('http://x/'), { ACCESS_TEAM: 't', ACCESS_AUD: 'a' }), /token/);
});
```

- [ ] **Step 2: Run, expect failure.**  - [ ] **Step 3: Implement**

```js
// Cloudflare Access JWT verification with WebCrypto. Works in Workers and Node ≥ 20.
const cache = new Map();                       // team → { keys: Map<kid, CryptoKey>, fetchedAt }
export const resetJwksCache = () => cache.clear();

const b64uToBytes = s => { s = s.replace(/-/g, '+').replace(/_/g, '/'); const bin = atob(s + '='.repeat((4 - s.length % 4) % 4)); return Uint8Array.from(bin, c => c.charCodeAt(0)); };
const decodeJson = s => JSON.parse(new TextDecoder().decode(b64uToBytes(s)));

async function keysFor(team, kid, fetchFn, now) {
  let entry = cache.get(team);
  if (!entry || !entry.keys.has(kid) || now - entry.fetchedAt > 3_600_000) {
    const res = await fetchFn(`https://${team}.cloudflareaccess.com/cdn-cgi/access/certs`);
    if (!res.ok) throw new Error('jwks fetch failed');
    const { keys } = await res.json(); const map = new Map();
    for (const k of keys) if (k.kty === 'RSA' && (k.alg ?? 'RS256') === 'RS256') map.set(k.kid, await crypto.subtle.importKey('jwk', { kty: k.kty, n: k.n, e: k.e, alg: 'RS256', ext: true }, { name: 'RSASSA-PKCS1-v1_5', hash: 'SHA-256' }, false, ['verify']));
    entry = { keys: map, fetchedAt: now }; cache.set(team, entry);
  }
  const key = entry.keys.get(kid); if (!key) throw new Error('unknown signing key');
  return key;
}

export async function verifyAccessJwt(token, { team, aud, fetchFn = fetch, now = Date.now() }) {
  if (!team || !aud) throw new Error('access not configured');
  const parts = typeof token === 'string' ? token.split('.') : [];
  if (parts.length !== 3) throw new Error('missing or malformed token');
  let header, claims; try { header = decodeJson(parts[0]); claims = decodeJson(parts[1]); } catch { throw new Error('malformed token'); }
  if (header.alg !== 'RS256') throw new Error('unsupported alg');
  const key = await keysFor(team, header.kid, fetchFn, now);
  const ok = await crypto.subtle.verify('RSASSA-PKCS1-v1_5', key, b64uToBytes(parts[2]), new TextEncoder().encode(`${parts[0]}.${parts[1]}`));
  if (!ok) throw new Error('bad signature');
  if (claims.iss !== `https://${team}.cloudflareaccess.com`) throw new Error('bad iss');
  const auds = Array.isArray(claims.aud) ? claims.aud : [claims.aud]; if (!auds.includes(aud)) throw new Error('bad aud');
  if (typeof claims.exp !== 'number' || claims.exp * 1000 <= now) throw new Error('token expired (exp)');
  if (typeof claims.email !== 'string' || !claims.email) throw new Error('no email claim');
  return { email: claims.email };
}

/** Who is making this request: Access token in production, DEV_IDENTITY (with ?as= override) in local dev. */
export async function identityFromRequest(request, env) {
  if (env.DEV_IDENTITY) { const as = new URL(request.url).searchParams.get('as'); return { email: as && as.includes('@') ? as : env.DEV_IDENTITY }; }
  return verifyAccessJwt(request.headers.get('cf-access-jwt-assertion') ?? '', { team: env.ACCESS_TEAM, aud: env.ACCESS_AUD });
}
```
If a test's error regex doesn't match your wording, adjust the message, not the test intent (e.g. the expired case must mention `exp`, the missing-token case `token`, the unknown kid case `key`).

- [ ] **Step 4: Run, expect pass.**  - [ ] **Step 5: Commit** `mapper: Access JWT verification`.

---

### Task 5: Durable Object and Worker entry (`worker/map.js`, `worker/index.js`) with workers-pool tests

**Files:** Create `worker/map.js`, `worker/index.js`, `tests/do/map.test.js`

**Interfaces:**
- `MapRoom` (DO): `fetch(request)` accepts a WebSocket upgrade; requires header `x-user-email` (set by the Worker). Handles messages per spec. `alarm()` flushes dirty tiles + seq.
- Worker default export `fetch(request, env)`: prefix `/valheim-mapper`; redirect bare prefix → with slash; identity check via `identityFromRequest` (403 on failure); `/valheim-mapper/api/ws` → DO `main` with `x-user-email`; otherwise strip prefix and `env.ASSETS.fetch`. Paths outside the prefix → 404.

- [ ] **Step 1: Failing DO tests** (`tests/do/map.test.js`, run with `npm run test:do`)

```js
import { env, runDurableObjectAlarm } from 'cloudflare:test';
import { describe, it, expect } from 'vitest';
import { encodeRasterOp, unwrapServerRaster, decodeRasterOp } from '../../web/proto.js';

async function connect(email) {
  const stub = env.MAP.getByName('main');
  const res = await stub.fetch('http://x/valheim-mapper/api/ws', { headers: { upgrade: 'websocket', 'x-user-email': email } });
  expect(res.status).toBe(101);
  const ws = res.webSocket; ws.accept();
  const queue = [], waiters = [];
  ws.addEventListener('message', e => { const m = typeof e.data === 'string' ? JSON.parse(e.data) : new Uint8Array(e.data); waiters.length ? waiters.shift()(m) : queue.push(m); });
  const next = () => queue.length ? Promise.resolve(queue.shift()) : new Promise(r => waiters.push(r));
  const until = async pred => { for (;;) { const m = await next(); if (pred(m)) return m; } };
  return { ws, next, until };
}

describe('MapRoom', () => {
  it('sends hello with identity and snapshot, then presence', async () => {
    const a = await connect('alice@example.com');
    const hello = await a.until(m => m.t === 'hello');
    expect(hello.you.name).toBe('alice'); expect(hello.doc.version).toBe(1); expect(hello.doc.pins[0].type).toBe('start');
    const presence = await a.until(m => m.t === 'presence');
    expect(presence.users.some(u => u.name === 'alice')).toBe(true);
    a.ws.close();
  });
  it('broadcasts raster and json ops to the other client and persists them', async () => {
    const a = await connect('alice@example.com'), b = await connect('bob@example.com');
    await a.until(m => m.t === 'hello'); await b.until(m => m.t === 'hello');
    a.ws.send(encodeRasterOp({ layer: 0, rect: { x0: 10, z0: 10, x1: 11, z1: 10 }, bytes: new Uint8Array([2, 2]) }));
    const bin = await b.until(m => m instanceof Uint8Array);
    const { seq, name, payload } = unwrapServerRaster(bin); expect(name).toBe('alice'); expect(seq).toBeGreaterThan(0);
    expect([...decodeRasterOp(payload).bytes]).toEqual([2, 2]);
    a.ws.send(JSON.stringify({ t: 'op', op: { type: 'pin.add', pin: { id: 'p1', x: 1, z: 2, type: 'fire', name: 'Camp', checked: false } } }));
    const op = await b.until(m => m.t === 'op'); expect(op.op.pin.name).toBe('Camp'); expect(op.by.name).toBe('alice');
    await runDurableObjectAlarm(env.MAP.getByName('main'));
    const c = await connect('carol@example.com'); const hello = await c.until(m => m.t === 'hello');
    expect(hello.doc.pins.find(p => p.id === 'p1').name).toBe('Camp');
    expect(hello.doc.terrain).not.toBe(null);
    a.ws.close(); b.ws.close(); c.ws.close();
  });
  it('rejects invalid ops with an error to the sender only', async () => {
    const a = await connect('alice@example.com'), b = await connect('bob@example.com');
    await a.until(m => m.t === 'hello'); await b.until(m => m.t === 'hello');
    a.ws.send(JSON.stringify({ t: 'op', op: { type: 'pin.remove', id: 'start' } }));
    const err = await a.until(m => m.t === 'error'); expect(err.message).toMatch(/start/);
    a.ws.send(JSON.stringify({ t: 'cursor', x: 1, z: 2, tool: 'paint', brush: 64 }));
    const pres = await b.until(m => m.t === 'presence' && m.users.some(u => u.name === 'alice' && u.x === 1));
    expect(pres.users.find(u => u.name === 'alice').tool).toBe('paint');
    a.ws.close(); b.ws.close();
  });
});
```

- [ ] **Step 2: Run `npm run test:do`, expect failure** (module not found).

- [ ] **Step 3: Implement `worker/map.js`**

```js
// The one shared map: authoritative state in memory, tiles/rows in SQLite, WebSocket hub with hibernation.
import { DurableObject } from 'cloudflare:workers';
import { makeState, validateOp, validateRaster, applyOp, applyRaster, tilesForRect, tileBytes, putTile, parseTileKey, snapshotDoc, TILES } from './ops.js';
import { decodeRasterOp, wrapServerRaster, identityFromEmail } from '../web/proto.js';

const FLUSH_MS = 2000;

export class MapRoom extends DurableObject {
  constructor(ctx, env) {
    super(ctx, env);
    this.state = makeState(); this.seq = 0; this.dirty = new Set(); this.snapshot = null; this.sessions = new Map();
    ctx.blockConcurrencyWhile(async () => {
      const sql = ctx.storage.sql;
      sql.exec(`CREATE TABLE IF NOT EXISTS tiles(layer INTEGER, tx INTEGER, tz INTEGER, data BLOB, PRIMARY KEY(layer, tx, tz));
        CREATE TABLE IF NOT EXISTS ink(id TEXT PRIMARY KEY, json TEXT); CREATE TABLE IF NOT EXISTS pins(id TEXT PRIMARY KEY, json TEXT);
        CREATE TABLE IF NOT EXISTS meta(key TEXT PRIMARY KEY, value TEXT)`);
      for (const r of sql.exec('SELECT layer, tx, tz, data FROM tiles')) putTile(r.layer === 0 ? this.state.terrain : this.state.fog, r.tx, r.tz, new Uint8Array(r.data));
      for (const r of sql.exec('SELECT json FROM ink')) { const s = JSON.parse(r.json); this.state.ink.set(s.id, s); }
      for (const r of sql.exec('SELECT json FROM pins')) { const p = JSON.parse(r.json); this.state.pins.set(p.id, p); }
      const seq = sql.exec("SELECT value FROM meta WHERE key = 'seq'").toArray()[0]; this.seq = seq ? Number(seq.value) : 0;
      this.state.terrain.takeDirty(); this.state.fog.takeDirty();
      for (const ws of ctx.getWebSockets()) { const a = ws.deserializeAttachment(); if (a) this.sessions.set(ws, { ...a, x: null, z: null, tool: null, brush: 0, at: 0 }); }
    });
  }

  async fetch(request) {
    if (request.headers.get('upgrade') !== 'websocket') return new Response('expected websocket', { status: 426 });
    const email = request.headers.get('x-user-email'); if (!email) return new Response('no identity', { status: 403 });
    const who = identityFromEmail(email);
    const pair = new WebSocketPair(), [client, server] = Object.values(pair);
    this.ctx.acceptWebSocket(server); server.serializeAttachment(who);
    this.sessions.set(server, { ...who, x: null, z: null, tool: null, brush: 0, at: 0 });
    if (this.dirty.size) await this.flush();
    server.send(JSON.stringify({ t: 'hello', you: who, seq: this.seq, doc: await this.doc() }));
    this.broadcastPresence();
    return new Response(null, { status: 101, webSocket: client });
  }

  async doc() { if (!this.snapshot || this.snapshot.seq !== this.seq) this.snapshot = { seq: this.seq, doc: await snapshotDoc(this.state) }; return this.snapshot.doc; }

  async webSocketMessage(ws, message) {
    const s = this.sessions.get(ws); if (!s) return;
    try {
      if (typeof message !== 'string') {
        const op = decodeRasterOp(new Uint8Array(message)); const err = validateRaster(op); if (err) return this.reply(ws, err);
        for (const k of applyRaster(this.state, op)) this.dirty.add(k);
        this.seq++; await this.scheduleFlush();
        this.broadcast(wrapServerRaster(this.seq, s.name, new Uint8Array(message)), ws);
        return;
      }
      const msg = JSON.parse(message);
      if (msg.t === 'cursor') { Object.assign(s, { x: msg.x, z: msg.z, tool: msg.tool, brush: msg.brush, at: Date.now() }); this.broadcast(JSON.stringify({ t: 'presence', users: [this.presenceOf(s)] }), ws); return; }
      if (msg.t === 'op') {
        const err = validateOp(msg.op); if (err) return this.reply(ws, err);
        const { persist } = applyOp(this.state, msg.op);
        for (const row of persist) row.json === null ? this.ctx.storage.sql.exec(`DELETE FROM ${row.table} WHERE id = ?`, row.id) : this.ctx.storage.sql.exec(`INSERT OR REPLACE INTO ${row.table}(id, json) VALUES (?, ?)`, row.id, row.json);
        this.seq++; this.ctx.storage.sql.exec("INSERT OR REPLACE INTO meta(key, value) VALUES ('seq', ?)", String(this.seq));
        this.broadcast(JSON.stringify({ t: 'op', seq: this.seq, by: { name: s.name, color: s.color }, op: msg.op }), ws);
      }
    } catch (e) { this.reply(ws, `bad message: ${e.message}`); }
  }
  webSocketClose(ws) { this.sessions.delete(ws); this.broadcastPresence(); }
  webSocketError(ws) { this.sessions.delete(ws); this.broadcastPresence(); }

  reply(ws, message) { ws.send(JSON.stringify({ t: 'error', message })); }
  broadcast(data, except) { for (const ws of this.sessions.keys()) if (ws !== except) { try { ws.send(data); } catch { this.sessions.delete(ws); } } }
  presenceOf(s) { return { email: s.email, name: s.name, color: s.color, x: s.x, z: s.z, tool: s.tool, brush: s.brush, at: s.at }; }
  broadcastPresence() { this.broadcast(JSON.stringify({ t: 'presence', users: [...this.sessions.values()].map(s => this.presenceOf(s)) }), null); }

  async scheduleFlush() { if ((await this.ctx.storage.getAlarm()) === null) await this.ctx.storage.setAlarm(Date.now() + FLUSH_MS); }
  async alarm() { await this.flush(); }
  async flush() {
    const sql = this.ctx.storage.sql;
    for (const k of this.dirty) { const { layer, tx, tz } = parseTileKey(k); sql.exec('INSERT OR REPLACE INTO tiles(layer, tx, tz, data) VALUES (?, ?, ?, ?)', layer, tx, tz, tileBytes(layer === 0 ? this.state.terrain : this.state.fog, tx, tz).buffer); }
    this.dirty.clear();
    sql.exec("INSERT OR REPLACE INTO meta(key, value) VALUES ('seq', ?)", String(this.seq));
  }
}
```
Notes: `tileBytes(...).buffer` — `snapshot` returns a fresh `Uint8Array` so its `.buffer` is exactly the tile; if `snapshot` ever returns a view, pass `bytes.slice().buffer`. Presence in the hibernation case: cursors reset to null after wake, which is fine.

- [ ] **Step 4: Implement `worker/index.js`**

```js
import { identityFromRequest } from './access.js';
export { MapRoom } from './map.js';

const PREFIX = '/valheim-mapper';

export default {
  async fetch(request, env) {
    const url = new URL(request.url);
    if (url.pathname === PREFIX) return Response.redirect(`${url.origin}${PREFIX}/${url.search}`, 301);
    if (!url.pathname.startsWith(PREFIX + '/')) return new Response('not found', { status: 404 });
    let email;
    try { ({ email } = await identityFromRequest(request, env)); } catch (e) { return new Response(`forbidden: ${e.message}`, { status: 403 }); }
    if (url.pathname === `${PREFIX}/api/ws`) {
      if (request.headers.get('upgrade') !== 'websocket') return new Response('expected websocket', { status: 426 });
      const headers = new Headers(request.headers); headers.set('x-user-email', email);
      return env.MAP.getByName('main').fetch(new Request(request.url, { headers }));
    }
    const assetUrl = new URL(request.url); assetUrl.pathname = url.pathname.slice(PREFIX.length) || '/';
    return env.ASSETS.fetch(new Request(assetUrl, request));
  },
};
```

- [ ] **Step 5: Run `npm run test:do` → 3 passing; `npm test` still passing.** If the workers pool complains about the `assets` binding in tests, add `"assets": { "directory": "./web" }` handling per the pool docs (it supports assets); if `runDurableObjectAlarm` is unavailable under this version, instead wait `2100 ms` with `vi.useRealTimers` and re-check (report which you used).

- [ ] **Step 6: Manual smoke** — `npm run dev` (background), `curl -s -o /dev/null -w '%{http_code}\n' http://localhost:8787/valheim-mapper/` → 200 with the page, `…/valheim-mapper/main.js` → 200, `http://localhost:8787/other` → 404. Stop dev.

- [ ] **Step 7: Commit** `mapper: MapRoom Durable Object and Worker entry`.

---

### Task 6: Commands carry ops (`history.js`, `raster.js`, `tools.js`, `ink.js`, `pins.js`, `ui.js`)

**Files:** Modify the six files and their tests (`tests/history.test.js`, `tests/raster.test.js`, `tests/tools.test.js`, `tests/ink.test.js`, `tests/pins.test.js`)

**Interfaces (produces):**
- `history.js`: `h.onApply = null`; `push(cmd)` calls `h.onApply?.(cmd.ops ?? [])`; `undo()` → `onApply(cmd.inverseOps ?? [])`; `redo()` → `onApply(cmd.ops ?? [])`. `combine(label, ...cmds)` concatenates `ops` and `inverseOps` (inverse in reverse order). `createStrokeRecorder(raster, layerName)`: the returned command has `ops: [{ type: 'raster', layer: layerName, rect, bytes: after }]` and `inverseOps: [{ type: 'raster', layer: layerName, rect, bytes: before }]`.
- `raster.js`: `restore(rect, snap, { touch = true } = {})` — with `touch: false` marks only `dirty`, not `touched` (remote patches must not leak into a local stroke's recorder).
- Ink strokes get `id: crypto.randomUUID()` in `createInk().begin`. `inkTool` commands: add → `ops: [{type:'ink.add', stroke}]`, `inverseOps: [{type:'ink.remove', id}]`; erase → `ops: removes`, `inverseOps: adds`. `createInk` must also give ids to strokes loaded without one (`for (const s of strokes) s.id ??= crypto.randomUUID()`).
- Pins: add → `pin.add`/`pin.remove`; move (dragHandler) → `pin.update {x,z}` both ways; popup rename/check → `pin.update`; delete → `pin.remove` / inverse `pin.add` with the full pin.
- `tools.js`: `rasterBrushTool(app, raster, label, …, reveal)` passes layer names: the terrain recorder is created with `'terrain'`, the reveal recorder with `'fog'` — add a `layerName` to `rasterBrushTool`'s signature: `rasterBrushTool(app, raster, layerName, fnPrimary, fnSecondary, reveal)` where `reveal = { raster, fn, layerName: 'fog' }` (the old `label` argument becomes `layerName`; labels for history can equal it). Update main.js call sites in Task 8; for this task update them minimally so the app still runs.

- [ ] **Step 1: Failing tests** — append:

`tests/history.test.js`:
```js
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
```
(import `combine` from history.js.)

`tests/raster.test.js`:
```js
test('restore with touch:false does not enter the touched accumulator', () => {
  const r = createRaster({ cells: 4, cellM: 1 }); r.takeTouched();
  r.restore({ x0: 0, z0: 0, x1: 0, z1: 0 }, new Uint8Array([5]), { touch: false });
  assert.equal(r.takeTouched(), null); assert.deepEqual(r.takeDirty(), { x0: 0, z0: 0, x1: 0, z1: 0 }); assert.equal(r.data[0], 5);
});
```

`tests/tools.test.js` (extend the existing paint-reveals-fog test): after `tool.up(ev)`, assert `const cmd = app.history.peek()`… — history has no peek; instead capture via `app.history.onApply = ops => (last = ops)` set before the stroke, then `assert.deepEqual(last.map(o => o.layer), ['terrain', 'fog'])` and `assert.equal(last[0].type, 'raster')`. Add `layerName` args to the `rasterBrushTool` calls in that test file (`'terrain'` / `'fog'` in place of the old label strings, and `reveal: { raster: fog, fn: revealFn, layerName: 'fog' }`).

`tests/ink.test.js`:
```js
import { createInk } from '../web/ink.js';
test('strokes get ids, including ones loaded without', () => {
  const strokes = [{ color: '#000000', width: 2, points: [[0, 0]] }];
  const ink = createInk(strokes); assert.match(strokes[0].id, /^[0-9a-f-]{36}$/);
  ink.begin('#000000', 4); ink.add(0, 0); ink.add(10, 0); const s = ink.end(); assert.match(s.id, /^[0-9a-f-]{36}$/);
});
```

`tests/pins.test.js`:
```js
import { pinOps } from '../web/pins.js';
test('pinOps builds op/inverse pairs', () => {
  const pin = { id: 'p', x: 1, z: 2, type: 'fire', name: 'a', checked: false };
  assert.deepEqual(pinOps.add(pin), { ops: [{ type: 'pin.add', pin }], inverseOps: [{ type: 'pin.remove', id: 'p' }] });
  assert.deepEqual(pinOps.remove(pin), { ops: [{ type: 'pin.remove', id: 'p' }], inverseOps: [{ type: 'pin.add', pin }] });
  assert.deepEqual(pinOps.update(pin, { name: 'b' }, { name: 'a' }), { ops: [{ type: 'pin.update', id: 'p', patch: { name: 'b' } }], inverseOps: [{ type: 'pin.update', id: 'p', patch: { name: 'a' } }] });
});
```

- [ ] **Step 2: Run, expect failures.**

- [ ] **Step 3: Implement**

`history.js` changes:
```js
// in createHistory: 
const h = { onChange: null, onApply: null };
h.push = cmd => { undos.push(cmd); if (undos.length > limit) undos.shift(); redos.length = 0; h.onApply?.(cmd.ops ?? []); changed(); };
h.undo = () => { const c = undos.pop(); if (!c) return false; c.undo(); redos.push(c); h.onApply?.(c.inverseOps ?? []); changed(); return true; };
h.redo = () => { const c = redos.pop(); if (!c) return false; c.redo(); undos.push(c); h.onApply?.(c.ops ?? []); changed(); return true; };
// combine:
export function combine(label, ...cmds) {
  const list = cmds.filter(Boolean); if (!list.length) return null;
  const ops = list.flatMap(c => c.ops ?? []), inverseOps = [...list].reverse().flatMap(c => c.inverseOps ?? []);
  if (list.length === 1) return { ...list[0], label, ops, inverseOps };
  return { label, ops, inverseOps, undo: () => { for (const c of [...list].reverse()) c.undo(); }, redo: () => { for (const c of list) c.redo(); } };
}
// createStrokeRecorder(raster, layerName): in end():
return { label, ops: [{ type: 'raster', layer: layerName, rect, bytes: after }], inverseOps: [{ type: 'raster', layer: layerName, rect, bytes: before }],
         undo: () => raster.restore(rect, before), redo: () => raster.restore(rect, after) };
```
`raster.js`: `r.restore = (rect, snap, { touch = true } = {}) => { …copy rows…; r.markDirty(rect, touch); };` and `r.markDirty = (rect, touch = true) => { r.dirty = union(r.dirty, rect); if (touch) r.touched = union(r.touched, rect); r.version++; };`

`tools.js` `rasterBrushTool(app, raster, layerName, fnPrimary, fnSecondary, reveal = null)`: `const rec = createStrokeRecorder(raster, layerName), revealRec = reveal && createStrokeRecorder(reveal.raster, reveal.layerName ?? 'fog');` and `combine(layerName, rec.end(layerName), revealRec?.end(layerName))`.

`ink.js`: `begin(color, width) { cur = { id: crypto.randomUUID(), color, width, points: [] }; }`; in `createInk`: `for (const s of strokes) s.id ??= crypto.randomUUID();`. In `inkTool.up`: add command gets `ops: [{ type: 'ink.add', stroke: s }], inverseOps: [{ type: 'ink.remove', id: s.id }]` (plus the fog reveal command combined as now, which already carries raster ops); erase command gets `ops: removed.map(r => ({ type: 'ink.remove', id: r.stroke.id }))`, `inverseOps: removed.map(r => ({ type: 'ink.add', stroke: r.stroke }))`.

`pins.js`: export
```js
export const pinOps = {
  add: pin => ({ ops: [{ type: 'pin.add', pin }], inverseOps: [{ type: 'pin.remove', id: pin.id }] }),
  remove: pin => ({ ops: [{ type: 'pin.remove', id: pin.id }], inverseOps: [{ type: 'pin.add', pin }] }),
  update: (pin, patch, before) => ({ ops: [{ type: 'pin.update', id: pin.id, patch }], inverseOps: [{ type: 'pin.update', id: pin.id, patch: before }] }),
};
```
and spread the matching `pinOps.*` result into every command in `dragHandler.end` (`pinOps.update(o, after, before)`), `pinTool` add, and `pinKeys` (check → `pinOps.update(pin, {checked: pin.checked}, {checked: !pin.checked})` computed after toggling; remove → `pinOps.remove(pin)`). In `ui.js` popup: `renameCommand(pin, before, after)` returns `{ …, ...pinOps.update(pin, { name: after }, { name: before }) }` (import `pinOps`); check and delete buttons likewise. The `pin` object placed in `pin.add` ops must be a plain copy without `fixed`: `{ id, x, z, type, name, checked }` (write a tiny `plainPin(p)` helper in pins.js and use it in `pinOps`).

`main.js` (minimal for this task): `rasterBrushTool(app, state.terrain, 'terrain', …, { raster: state.fog, fn: revealFn, layerName: 'fog' })` and `rasterBrushTool(app, state.fog, 'fog', () => refogFn, () => revealFn)`.

- [ ] **Step 4: `npm test` all green; `node --check` all web modules; quick browser check with `npm run dev`** (paint/ink/pins still work and undo still works — nothing is sent yet).

- [ ] **Step 5: Commit** `mapper: undo commands carry sync ops`.

---

### Task 7: Client sync (`web/sync.js`)

**Files:** Create `web/sync.js`, `tests/sync.test.js`; Modify `web/store.js` (remove `createStoreClient`; keep `emptyDoc`, `ensureStartPin`, `createState`, `serialize`), `tests/store.test.js` (drop the client tests)

**Interfaces (produces):** `createSync(app, { WebSocketImpl = WebSocket, url = new URL('api/ws', location.href), now = Date.now, setTimeoutFn = setTimeout }) → sync` with:
- `sync.connect()`; `sync.status` ∈ `connecting | connected | reconnecting | offline`; `sync.onStatus(status)` callback; `sync.onPresence(users)`; `sync.you` (identity from hello).
- `sync.sendOps(ops)` — raster ops → binary `encodeRasterOp`; others → `{ t: 'op', op }`. Called from `app.history.onApply` (wired here).
- `sync.cursor(x, z, tool, brush)` — throttled to one message per 200 ms (trailing edge sends the latest).
- `sync.handleMessage(data)` (exported for tests): text → `hello` (calls `app.onSnapshot(doc, you)`), `op` (apply JSON op to `app.state`), `presence`, `error` (calls `app.setStatus(msg,'error')`); binary → unwrap + decode → `raster.restore(rect, bytes, { touch: false })`; then `app.requestRender()`.
- Reconnect: on close, status `reconnecting`, backoff 1 s doubling to 30 s; a new `hello` replaces the state (`app.onSnapshot`), and `app.history.clear()`.
- `applyRemoteOp(state, op)` exported pure helper (ink add/remove, pin add/update/remove on arrays; `pin.update` ignores unknown ids).

- [ ] **Step 1: Failing tests** (fake WebSocket class capturing sends; fake app)

```js
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { createSync, applyRemoteOp } from '../web/sync.js';
import { createState, emptyDoc } from '../web/store.js';
import { encodeRasterOp, wrapServerRaster, decodeRasterOp } from '../web/proto.js';

class FakeWS { constructor(url) { this.url = url; this.sent = []; this.readyState = 0; FakeWS.last = this; } send(d) { this.sent.push(d); } close() { this.onclose?.({}); }
  open() { this.readyState = 1; this.onopen?.(); } msg(d) { this.onmessage?.({ data: d }); } }
async function fakeApp() {
  const state = await createState(emptyDoc()); const statuses = [], renders = { n: 0 };
  const app = { state, history: { onApply: null, clear() { this.cleared = (this.cleared ?? 0) + 1; } }, requestRender: () => renders.n++, setStatus: () => {},
    onSnapshot: async (doc, you) => { app.state = await createState(doc); app.you = you; app.snapshots = (app.snapshots ?? 0) + 1; } };
  return { app, statuses, renders };
}
test('sends ops as binary or json frames', async () => {
  const { app } = await fakeApp(); const sync = createSync(app, { WebSocketImpl: FakeWS, url: 'ws://x/api/ws' }); sync.connect(); FakeWS.last.open();
  app.history.onApply([{ type: 'raster', layer: 'fog', rect: { x0: 1, z0: 1, x1: 1, z1: 1 }, bytes: new Uint8Array([255]) }, { type: 'pin.remove', id: 'p' }]);
  assert.equal(FakeWS.last.sent.length, 2); assert.ok(FakeWS.last.sent[0] instanceof Uint8Array); assert.equal(decodeRasterOp(FakeWS.last.sent[0]).layer, 1);
  assert.deepEqual(JSON.parse(FakeWS.last.sent[1]), { t: 'op', op: { type: 'pin.remove', id: 'p' } });
});
test('hello replaces state; remote raster and json ops apply without touching the recorder', async () => {
  const { app, renders } = await fakeApp(); const sync = createSync(app, { WebSocketImpl: FakeWS, url: 'ws://x' }); sync.connect(); FakeWS.last.open();
  const doc = emptyDoc(); doc.pins = [{ id: 'q', x: 0, z: 0, type: 'fire', name: 'Q', checked: false }];
  await sync.handleMessage(JSON.stringify({ t: 'hello', you: { email: 'a@x', name: 'a', color: 'hsl(0 70% 55%)' }, seq: 3, doc }));
  assert.equal(app.snapshots, 1); assert.equal(sync.status, 'connected'); assert.equal(app.state.pins.find(p => p.id === 'q').name, 'Q');
  app.state.terrain.takeTouched();
  await sync.handleMessage(wrapServerRaster(4, 'bob', encodeRasterOp({ layer: 0, rect: { x0: 0, z0: 0, x1: 0, z1: 0 }, bytes: new Uint8Array([2]) })).buffer);
  assert.equal(app.state.terrain.data[0], 2); assert.equal(app.state.terrain.takeTouched(), null); assert.ok(app.state.terrain.takeDirty());
  await sync.handleMessage(JSON.stringify({ t: 'op', seq: 5, by: { name: 'bob' }, op: { type: 'pin.update', id: 'q', patch: { checked: true } } }));
  assert.equal(app.state.pins.find(p => p.id === 'q').checked, true); assert.ok(renders.n >= 2);
});
test('presence and error callbacks; cursor throttle sends the latest position', async () => {
  const { app } = await fakeApp(); let t = 0; const timers = [];
  const sync = createSync(app, { WebSocketImpl: FakeWS, url: 'ws://x', now: () => t, setTimeoutFn: (fn, ms) => timers.push({ fn, at: t + ms }) });
  let users = null; sync.onPresence = u => (users = u); sync.connect(); FakeWS.last.open();
  await sync.handleMessage(JSON.stringify({ t: 'presence', users: [{ name: 'bob' }] })); assert.equal(users[0].name, 'bob');
  sync.cursor(1, 1, 'paint', 64); sync.cursor(2, 2, 'paint', 64); sync.cursor(3, 3, 'paint', 64);
  assert.equal(FakeWS.last.sent.length, 1); assert.equal(JSON.parse(FakeWS.last.sent[0]).x, 1);
  t = 250; timers.shift().fn(); assert.equal(FakeWS.last.sent.length, 2); assert.equal(JSON.parse(FakeWS.last.sent[1]).x, 3);
});
test('reconnects with backoff and clears history on the new hello', async () => {
  const { app } = await fakeApp(); const timers = [];
  const sync = createSync(app, { WebSocketImpl: FakeWS, url: 'ws://x', setTimeoutFn: (fn, ms) => timers.push({ fn, ms }) });
  sync.connect(); const first = FakeWS.last; first.open(); first.close();
  assert.equal(sync.status, 'reconnecting'); assert.equal(timers[0].ms, 1000); timers.shift().fn(); assert.notEqual(FakeWS.last, first);
  FakeWS.last.close(); assert.equal(timers[0].ms, 2000);
  timers.shift().fn(); FakeWS.last.open();
  await sync.handleMessage(JSON.stringify({ t: 'hello', you: { name: 'a' }, seq: 9, doc: emptyDoc() }));
  assert.equal(app.history.cleared, 1); assert.equal(sync.status, 'connected');
});
test('applyRemoteOp on arrays', () => {
  const state = { ink: [], pins: [] };
  applyRemoteOp(state, { type: 'ink.add', stroke: { id: 's', color: '#000000', width: 1, points: [[0, 0]] } }); assert.equal(state.ink.length, 1);
  applyRemoteOp(state, { type: 'pin.add', pin: { id: 'p', x: 0, z: 0, type: 'fire', name: '', checked: false } });
  applyRemoteOp(state, { type: 'pin.update', id: 'p', patch: { name: 'N' } }); assert.equal(state.pins[0].name, 'N');
  applyRemoteOp(state, { type: 'pin.update', id: 'zzz', patch: { name: 'N' } });
  applyRemoteOp(state, { type: 'pin.remove', id: 'p' }); applyRemoteOp(state, { type: 'ink.remove', id: 's' });
  assert.deepEqual([state.ink.length, state.pins.length], [0, 0]);
});
```

- [ ] **Step 2: Run, expect failure.**  - [ ] **Step 3: Implement `web/sync.js`**

```js
// Live sync with the MapRoom Durable Object: sends local ops, applies remote ones, tracks presence, reconnects.
import { encodeRasterOp, decodeRasterOp, unwrapServerRaster, LAYER_NAME } from './proto.js';

export function applyRemoteOp(state, op) {
  switch (op.type) {
    case 'ink.add': state.ink.push(op.stroke); break;
    case 'ink.remove': { const i = state.ink.findIndex(s => s.id === op.id); if (i >= 0) state.ink.splice(i, 1); break; }
    case 'pin.add': state.pins.push(op.pin); break;
    case 'pin.update': { const p = state.pins.find(p => p.id === op.id); if (p) Object.assign(p, op.patch); break; }
    case 'pin.remove': { const i = state.pins.findIndex(p => p.id === op.id); if (i >= 0) state.pins.splice(i, 1); break; }
  }
}

export function createSync(app, { WebSocketImpl = globalThis.WebSocket, url = new URL('api/ws', location.href).href.replace(/^http/, 'ws'), now = Date.now, setTimeoutFn = setTimeout } = {}) {
  let ws = null, backoff = 1000, lastCursor = 0, pendingCursor = null, cursorTimer = false, hadHello = false;
  const sync = { status: 'connecting', onStatus: null, onPresence: null, you: null };
  const setStatus = s => { sync.status = s; sync.onStatus?.(s); };
  const send = data => { if (ws && ws.readyState === 1) ws.send(data); };

  sync.connect = () => {
    setStatus(hadHello ? 'reconnecting' : 'connecting');
    ws = new WebSocketImpl(String(url)); ws.binaryType = 'arraybuffer';
    ws.onopen = () => { backoff = 1000; };
    ws.onmessage = e => { sync.handleMessage(e.data); };
    ws.onclose = () => { ws = null; setStatus('reconnecting'); setTimeoutFn(sync.connect, backoff); backoff = Math.min(backoff * 2, 30_000); };
    ws.onerror = () => {};
  };

  sync.handleMessage = async data => {
    if (typeof data !== 'string') {
      const { payload } = unwrapServerRaster(new Uint8Array(data)); const { layer, rect, bytes } = decodeRasterOp(payload);
      app.state[LAYER_NAME[layer]].restore(rect, bytes, { touch: false }); app.requestRender(); return;
    }
    const msg = JSON.parse(data);
    switch (msg.t) {
      case 'hello': sync.you = msg.you; if (hadHello) app.history.clear(); hadHello = true; await app.onSnapshot(msg.doc, msg.you); setStatus('connected'); app.requestRender(); break;
      case 'op': applyRemoteOp(app.state, msg.op); app.requestRender(); break;
      case 'presence': sync.onPresence?.(msg.users); break;
      case 'error': app.setStatus(`rejected: ${msg.message}`, 'error'); break;
    }
  };

  sync.sendOps = ops => { for (const op of ops) send(op.type === 'raster' ? encodeRasterOp(op) : JSON.stringify({ t: 'op', op })); };
  app.history.onApply = sync.sendOps;

  const flushCursor = () => { cursorTimer = false; if (!pendingCursor) return; lastCursor = now(); send(JSON.stringify({ t: 'cursor', ...pendingCursor })); pendingCursor = null; };
  sync.cursor = (x, z, tool, brush) => {
    pendingCursor = { x, z, tool, brush };
    const wait = 200 - (now() - lastCursor);
    if (wait <= 0) return flushCursor();
    if (!cursorTimer) { cursorTimer = true; setTimeoutFn(flushCursor, wait); }
  };
  return sync;
}
```
`store.js`: delete `createStoreClient` and the `LS_KEY`/fetch logic; keep the rest. `tests/store.test.js`: remove the three client tests (keep round-trip, version, start-pin tests).

- [ ] **Step 4: Run, expect pass.**  - [ ] **Step 5: Commit** `mapper: client sync over WebSocket`.

---

### Task 8: Presence layer, UI, settings in localStorage, boot via sync (`presence.js`, `main.js`, `ui.js`, `tools.js`, `index.html`, `style.css`)

**Files:** Create `web/presence.js`, `tests/presence.test.js`; Modify `web/main.js`, `web/ui.js`, `web/tools.js`, `web/index.html`, `web/style.css`

**Interfaces (produces):**
- `presence.js`: `createPresence(getYou) → { layer, set(users), users(), list }`; `layer` = `{ id: 'presence', name: 'Friends', draw(ctx, view, w, h) }` drawing, for every user except you with a non-null position and `now - at < 10000`: an 8 px dot in `user.color`, name label in Norse beside it, and when `tool === 'paint'` a circle of `brush * view.scale`. `set(users)` merges by `email` (a `presence` message may carry one user or all) and drops users absent from a full list (a message with ≥ 2 users or `full: true`... simpler: server sends full lists on join/leave and single-user lists on cursor; treat lists of length 1 as merges and longer lists as replacements — implement `set(users, { full = users.length !== 1 } = {})`). `visible(now) → users[]` (pure, for tests).
- Settings: `loadSettings() / saveSettings(settings)` in `main.js` using `localStorage['valheim-mapper:settings']`, merged over `state.settings` on snapshot; `app.markDirty()` now = `saveSettings` + `requestRender` (no store).
- `tools.js`: in the pointermove handler call `app.onPointer?.(wx, wz, tools.current, tools.options.brush)`.
- `ui.js`: status line shows `connecting… | connected as <name> | reconnecting… | offline`; new `#presence` row lists online users as coloured chips (`refreshPresence(users)`); remove the Save handler and any store usage; Export stays (uses `serialize(app.state)`).
- `main.js` boot: load assets → `createTools` → `wirePinPopup` → `createSync(app)` with `app.onSnapshot = async (doc, you) => { app.rebuild(await createState(doc)); applyLocalSettings(); ui.refreshLayers(); }` → `cameraControls` → `createUI` → `wireTools` → `sync.connect()`; presence layer inserted before `cursor` after pins in `rebuild`; `app.onPointer = sync.cursor`. Remove `store.js` client imports, `loadFailed`, autosave status mapping.

- [ ] **Step 1: Failing test** `tests/presence.test.js`:
```js
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
```

- [ ] **Step 2: Run, expect failure.**  - [ ] **Step 3: Implement `web/presence.js`**
```js
// Other people's cursors: a coloured dot, their name, and their brush circle while they paint.
const STALE_MS = 10_000;
export function createPresence(getYou) {
  const users = new Map();
  const p = {
    set(list, { full = list.length !== 1 } = {}) { if (full) users.clear(); for (const u of list) users.set(u.email, { ...users.get(u.email), ...u }); },
    users: () => [...users.values()],
    visible(now = Date.now()) { const me = getYou()?.email; return [...users.values()].filter(u => u.email !== me && u.x != null && u.z != null && now - (u.at ?? 0) < STALE_MS); },
    layer: { id: 'presence', name: 'Friends', draw(ctx, view, w, h) {
      const dpr = window.devicePixelRatio || 1;
      ctx.font = `bold ${Math.round(12 * dpr)}px Norse`; ctx.textBaseline = 'middle'; ctx.textAlign = 'left'; ctx.lineWidth = 3 * dpr;
      for (const u of p.visible()) {
        const [sx, sy] = view.worldToScreen(u.x, u.z, w, h);
        if (u.tool === 'paint' && u.brush) { ctx.beginPath(); ctx.arc(sx, sy, u.brush * view.scale, 0, Math.PI * 2); ctx.strokeStyle = u.color; ctx.lineWidth = 1 * dpr; ctx.globalAlpha *= 0.6; ctx.stroke(); ctx.globalAlpha /= 0.6; ctx.lineWidth = 3 * dpr; }
        ctx.beginPath(); ctx.arc(sx, sy, 4 * dpr, 0, Math.PI * 2); ctx.fillStyle = u.color; ctx.fill();
        ctx.strokeStyle = 'rgba(0,0,0,0.85)'; ctx.strokeText(u.name, sx + 8 * dpr, sy); ctx.fillStyle = u.color; ctx.fillText(u.name, sx + 8 * dpr, sy);
      }
    } },
  };
  return p;
}
```
Then the `main.js`/`ui.js`/`tools.js`/`index.html`/`style.css` changes described in Interfaces. `index.html`: add `<div id="presence" class="palette"></div>` as the first child of `#sidebar`; `style.css`: `#presence .chip { padding: 2px 8px; border-radius: 10px; font-size: 12px; color: #111; }`. Because fresh presence needs redraws even without input, `main.js` runs `setInterval(() => { if (app.presence.visible().length) requestRender(); }, 1000)`.

- [ ] **Step 4: Verify** — `npm test` green; `npm run dev`; open http://localhost:8787/valheim-mapper/ and http://localhost:8787/valheim-mapper/?as=friend@x in two tabs: painting in one appears in the other within a frame; the other tab's cursor dot and name follow the mouse; pins/ink/undo sync both ways; killing `wrangler dev` shows "reconnecting…" and restarting it reconnects and reloads. Layer panel shows Friends; toggling grid persists across reload via localStorage.

- [ ] **Step 5: Commit** `mapper: presence, live sync boot, local settings`.

---

### Task 9: Runbook, README, ledger cleanup, deploy dry run

**Files:** Create `docs/superpowers/runbook-cloudflare.md`; Modify `README.md`

- [ ] **Step 1: Runbook** covering exactly: (1) `wrangler login`; (2) Zero Trust team domain; (3) Access → Applications → Add → Self-hosted: name Valheim Mapper, domain `jeffabliss.com`, path `valheim-mapper`, session duration 1 month; policy Allow, Include → Emails → paste the allow-list (kept outside the repo); Identity providers: One-time PIN only; copy the Application Audience (AUD) tag; (4) set vars: `npx wrangler secret put ACCESS_AUD` and `ACCESS_TEAM` (or dashboard → Settings → Variables), redeploy; (5) `npm run deploy` from a machine with `web/assets/`; (6) verify: incognito → OTP prompt; `curl -I https://jeffabliss.com/valheim-mapper/` → 302 to the Access login; `curl -I https://valheim-mapper.<account>.workers.dev/` → not found (workers_dev false); (7) operations: rotating the allow-list, `wrangler tail` for logs, storage reset (`wrangler` DO SQL: delete rows / delete the object via the dashboard), and how to export a backup (Export button).

- [ ] **Step 2: `npx wrangler deploy --dry-run --outdir /tmp/vm-dry`** succeeds (bundles worker, lists assets count ≈ 60 files). If not logged in, dry run still works offline.

- [ ] **Step 3: Final checks** — `npm test`, `npm run test:do`, `wc -l web/*.js worker/*.js` all ≤ 250; `git status` clean apart from ignored dirs.

- [ ] **Step 4: Commit** `mapper: Cloudflare runbook`.

## Spec coverage check

| Spec item | Task |
|---|---|
| Worker layout, wrangler config, assets prefix strip, redirect | 1, 5 |
| Access JWT verification, DEV_IDENTITY, ?as override | 4, 5 |
| Protocol frames, ids, validation limits | 2, 3, 5 |
| MapRoom: SQLite tiles/rows, alarm flush, snapshot cache, hibernation attachments, presence | 5 |
| Commands → ops, inverse on undo, combined ops | 6 |
| Client sync, reconnect, remote apply without touching recorder | 7 |
| Presence layer + sidebar, settings local, cursor throttle, no Save/Import/New map | 8 |
| Runbook, deploy, verification | 9 |
