# Valheim Mapper Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** A localhost web app for hand-drawing a Valheim map (terrain paint, freehand ink, fog reveal, pins, player marker, metre grid) rendered with the game's own map assets, persisted to disk by a tiny Node server.

**Architecture:** Vanilla ES modules + Canvas 2D in `web/`, one camera transform shared by an ordered layer stack. Two raster layers (terrain biome ids, fog reveal) share a `raster.js` core; ink and pins are vector. A dependency-free Node `http` server serves `web/` and persists one JSON document (rasters embedded as base64 PNG) atomically. Undo/redo is a command stack.

**Tech Stack:** Node ≥ 20 (server, tests via `node:test`), browser ES modules, Canvas 2D, `CompressionStream` for a tiny pure-JS PNG codec. Zero npm dependencies.

Spec: `docs/superpowers/specs/2026-09-21-valheim-mapper-design.md`

## Global Constraints

- Node ≥ 20. Zero npm runtime or dev dependencies. No build step.
- Each `web/*.js` module ≲ 250 lines, one exported factory/object with a small interface.
- World: 20,480 m square, spawn at origin, x east, z north. Game circle radius 10,000 m.
- Raster cell 8 m → 2560 × 2560 cells. Raster row 0 is the **south** edge (z = −10,240 m).
- Biome ids: 0 none, 1 meadows, 2 black forest, 3 swamp, 4 mountain, 5 plains, 6 mistlands, 7 ashlands, 8 deep north, 9 ocean.
- Grid default spacing 64 m; LOD switches to 1 km when a cell < 6 screen px.
- Save doc `version: 1`. Autosave debounce 2 s. Server body limit 64 MB. Atomic write + `.bak`.
- Game assets (`web/assets/`, `out/`, `data/`) are **never committed**. Copy via script.
- Commits: end message with `Co-Authored-By: Claude Fable 5.1 <noreply@anthropic.com>`.

## File Structure

```
package.json                 type=module; scripts: test, start, assets
scripts/copy_assets.mjs      out/assets → web/assets (icons, textures, fonts)
server/server.js             createServer, readMap, writeMap; listens when run directly
web/index.html               layout, toolbar, sidebar, status, pin editor input
web/style.css                minimal layout + @font-face
web/main.js                  boot: load assets/doc, build state, layers, tools, UI, render loop
web/world.js                 constants: sizes, BIOMES, PIN_TYPES, TILE_M
web/view.js                  camera
web/png.js                   grayscale PNG encode/decode + base64
web/raster.js                Uint8Array grid, stamping, dirty rects, snapshots
web/history.js               undo/redo stack + stroke recorder
web/store.js                 serialize/deserialize, client with autosave/retry/localStorage
web/layers.js                layer stack, scratch canvases
web/base.js                  parchment + space layer
web/grid.js                  chooseSpacing + grid layer
web/terrain.js               terrain layer + paint()
web/fog.js                   fog layer + reveal()/refog()
web/ink.js                   strokes, hit test, ink layer
web/pins.js                  pins + player marker layer, hit test
web/tools.js                 pointer/keyboard → tool actions → commands
web/ui.js                    toolbar, sliders, layer panel, status, export/import wiring
tests/*.test.js              node:test
```

---

### Task 1: Project scaffold and asset copy script

**Files:**
- Create: `package.json`, `scripts/copy_assets.mjs`, `web/assets/.gitkeep` (no, gitignored — skip), modify `.gitignore`

**Interfaces:**
- Produces: `web/assets/map/<name>.png` (e.g. `mapicon_pin.png`, `background.png`), `web/assets/fonts/{Norse.otf,Norsebold.otf,AveriaSerifLibre-Regular.ttf,AveriaSerifLibre-Bold.ttf}`.

- [ ] **Step 1: package.json**

```json
{
  "name": "valheim-mapper",
  "private": true,
  "type": "module",
  "engines": { "node": ">=20" },
  "scripts": {
    "test": "node --test tests/*.test.js",
    "start": "node server/server.js",
    "assets": "node scripts/copy_assets.mjs"
  }
}
```

- [ ] **Step 2: copy script**

`scripts/copy_assets.mjs`:
```js
// Copies extracted game assets from out/assets into web/assets. Run: npm run assets
import { cp, mkdir, readdir } from 'node:fs/promises';
import path from 'node:path';

const SRC = 'out/assets/Assets';
const MAP_SRC = path.join(SRC, 'UI/map');
const FONT_SRC = path.join(SRC, '3rd party/TextMesh Pro/Resources/Fonts');
const FONTS = ['Norse/Norse.otf', 'Norse/Norsebold.otf',
  'Averia_Serif_Libre/AveriaSerifLibre-Regular.ttf', 'Averia_Serif_Libre/AveriaSerifLibre-Bold.ttf'];

await mkdir('web/assets/map', { recursive: true });
await mkdir('web/assets/fonts', { recursive: true });
let n = 0;
for (const f of await readdir(MAP_SRC)) {
  if (!f.endsWith('.png')) continue;
  const dest = f.replace(/\.sprite\.png$/, '.png');           // mapicon_pin.sprite.png -> mapicon_pin.png
  if (f.endsWith('.png') && !f.endsWith('.sprite.png') && f.startsWith('mapicon_')) continue; // prefer sprite (trimmed) version
  await cp(path.join(MAP_SRC, f), path.join('web/assets/map', dest)); n++;
}
for (const f of FONTS) { await cp(path.join(FONT_SRC, f), path.join('web/assets/fonts', path.basename(f))); n++; }
console.log(`copied ${n} files to web/assets/`);
```

- [ ] **Step 3: gitignore + run**

Append `web/assets/` to `.gitignore`. Run:
```bash
npm run assets && ls web/assets/map | wc -l && ls web/assets/fonts
```
Expected: ~34 files in `web/assets/map` (25 mapicon/marker sprites + 8 textures + MinimapLavaMask), 4 fonts listed.

- [ ] **Step 4: Commit**

```bash
git add package.json scripts/copy_assets.mjs .gitignore
git commit -m "chore: project scaffold and asset copy script" -m "Co-Authored-By: Claude Fable 5.1 <noreply@anthropic.com>"
```

---

### Task 2: World constants and camera (`world.js`, `view.js`)

**Files:**
- Create: `web/world.js`, `web/view.js`, `tests/view.test.js`

**Interfaces:**
- Produces `world.js`: `WORLD_SIZE=20480`, `WORLD_HALF=10240`, `WORLD_RADIUS=10000`, `CELL_M=8`, `CELLS=2560`, `ZONE_M=64`, `EXPLORE_RADIUS=100`, `BIOMES[]` (`{id,key,name,color:[r,g,b]|null,detail:'forest'|'mountain'|'water'|null}`), `PIN_TYPES[]`, `TILE_M` (metres per texture tile).
- Produces `view.js`: `createView({x,z,scale}) → v` with `v.x, v.z, v.scale` (px per metre), `worldToScreen(wx,wz,w,h)→[sx,sy]`, `screenToWorld(sx,sy,w,h)→[wx,wz]`, `zoomAt(sx,sy,factor,w,h)`, `panBy(dxPx,dyPx)`, `fitWorld(w,h)`, `applyTo(ctx,w,h)`, `visibleBounds(w,h)→{x0,x1,z0,z1}`, `toJSON()`.

- [ ] **Step 1: Failing tests**

`tests/view.test.js`:
```js
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { createView } from '../web/view.js';
import { WORLD_SIZE } from '../web/world.js';

const W = 800, H = 600;
const near = (a, b, eps = 1e-6) => assert.ok(Math.abs(a - b) < eps, `${a} != ${b}`);

test('origin maps to screen centre, z north is screen up', () => {
  const v = createView({ x: 0, z: 0, scale: 1 });
  assert.deepEqual(v.worldToScreen(0, 0, W, H), [400, 300]);
  const [sx, sy] = v.worldToScreen(10, 10, W, H);
  near(sx, 410); near(sy, 290);
});

test('screenToWorld inverts worldToScreen', () => {
  const v = createView({ x: 123, z: -456, scale: 0.37 });
  const [sx, sy] = v.worldToScreen(1000, 2000, W, H);
  const [wx, wz] = v.screenToWorld(sx, sy, W, H);
  near(wx, 1000); near(wz, 2000);
});

test('zoomAt keeps the world point under the cursor fixed', () => {
  const v = createView({ x: 0, z: 0, scale: 0.1 });
  const before = v.screenToWorld(100, 500, W, H);
  v.zoomAt(100, 500, 2, W, H);
  const after = v.screenToWorld(100, 500, W, H);
  near(v.scale, 0.2); near(after[0], before[0]); near(after[1], before[1]);
});

test('zoomAt clamps to min/max scale', () => {
  const v = createView({ scale: 1 });
  v.zoomAt(0, 0, 1e9, W, H); near(v.scale, v.maxScale);
  v.zoomAt(0, 0, 1e-9, W, H); near(v.scale, v.minScale);
});

test('panBy moves the camera opposite to the drag in world units', () => {
  const v = createView({ x: 0, z: 0, scale: 2 });
  v.panBy(20, -10);           // drag right 20px, up 10px
  near(v.x, -10); near(v.z, -5);
});

test('fitWorld shows the whole world', () => {
  const v = createView(); v.fitWorld(W, H);
  near(v.scale, H / WORLD_SIZE); near(v.x, 0); near(v.z, 0);
  const b = v.visibleBounds(W, H);
  assert.ok(b.z1 - b.z0 >= WORLD_SIZE - 1e-6);
});
```

- [ ] **Step 2: Run, expect failure**

`npm test` → FAIL: `Cannot find module '../web/view.js'`.

- [ ] **Step 3: Implement**

`web/world.js`:
```js
export const WORLD_SIZE = 20480;              // metres, square side
export const WORLD_HALF = WORLD_SIZE / 2;
export const WORLD_RADIUS = 10000;            // game's playable circle
export const CELL_M = 8;                      // raster cell size in metres
export const CELLS = WORLD_SIZE / CELL_M;     // 2560
export const ZONE_M = 64;                     // game zone size, default grid spacing
export const EXPLORE_RADIUS = 100;            // in-game map reveal radius

// Colours from decompiled Minimap.cs (m_*Color). Ocean uses the minimap material's water colour:
// check `_WaterColor` in out/assets/Assets/UI/map/minimap.mat.Material.*.json and replace if different.
export const BIOMES = [
  { id: 0, key: 'none',        name: 'None',         color: null,              detail: null },
  { id: 1, key: 'meadows',     name: 'Meadows',      color: [0.45, 1, 0.43],   detail: null },
  { id: 2, key: 'blackforest', name: 'Black Forest', color: [0, 0.7, 0],       detail: 'forest' },
  { id: 3, key: 'swamp',       name: 'Swamp',        color: [0.6, 0.5, 0.5],   detail: null },
  { id: 4, key: 'mountain',    name: 'Mountain',     color: [1, 1, 1],         detail: 'mountain' },
  { id: 5, key: 'plains',      name: 'Plains',       color: [1, 1, 0.2],       detail: null },
  { id: 6, key: 'mistlands',   name: 'Mistlands',    color: [0.2, 0.2, 0.2],   detail: 'forest' },
  { id: 7, key: 'ashlands',    name: 'Ashlands',     color: [1, 0.2, 0.2],     detail: null },
  { id: 8, key: 'deepnorth',   name: 'Deep North',   color: [1, 1, 1],         detail: 'mountain' },
  { id: 9, key: 'ocean',       name: 'Ocean',        color: [0.25, 0.36, 0.55], detail: 'water' },
];

export const PIN_TYPES = ['pin', 'fire', 'house', 'hammer', 'portal', 'bed', 'boss', 'trader',
  'death', 'eventarea', 'upgradestation', 'memorialplace', 'start'];

// Metres covered by one repeat of each texture tile.
export const TILE_M = { background: 512, space: 2048, forest: 256, mountain: 256, water: 128, fog: 512 };
```

`web/view.js`:
```js
import { WORLD_SIZE } from './world.js';

export function createView({ x = 0, z = 0, scale = 0.04 } = {}) {
  const v = { x, z, scale, minScale: 0.02, maxScale: 2 };
  v.worldToScreen = (wx, wz, w, h) => [w / 2 + (wx - v.x) * v.scale, h / 2 - (wz - v.z) * v.scale];
  v.screenToWorld = (sx, sy, w, h) => [v.x + (sx - w / 2) / v.scale, v.z - (sy - h / 2) / v.scale];
  v.zoomAt = (sx, sy, factor, w, h) => {
    const [wx, wz] = v.screenToWorld(sx, sy, w, h);
    v.scale = Math.min(v.maxScale, Math.max(v.minScale, v.scale * factor));
    v.x = wx - (sx - w / 2) / v.scale;
    v.z = wz + (sy - h / 2) / v.scale;
  };
  v.panBy = (dx, dy) => { v.x -= dx / v.scale; v.z += dy / v.scale; };
  v.fitWorld = (w, h) => { v.x = 0; v.z = 0; v.scale = Math.min(w, h) / WORLD_SIZE; };
  v.applyTo = (ctx, w, h) => ctx.setTransform(v.scale, 0, 0, -v.scale, w / 2 - v.x * v.scale, h / 2 + v.z * v.scale);
  v.visibleBounds = (w, h) => {
    const [x0, z1] = v.screenToWorld(0, 0, w, h);
    const [x1, z0] = v.screenToWorld(w, h, w, h);
    return { x0, x1, z0, z1 };
  };
  v.toJSON = () => ({ x: v.x, z: v.z, scale: v.scale });
  return v;
}
```

- [ ] **Step 4: Run, expect pass** — `npm test` → 6 passing.

- [ ] **Step 5: Commit** — `git add web/world.js web/view.js tests/view.test.js && git commit -m "feat: world constants and camera view" -m "Co-Authored-By: Claude Fable 5.1 <noreply@anthropic.com>"`

---

### Task 3: Grayscale PNG codec (`png.js`)

**Files:**
- Create: `web/png.js`, `tests/png.test.js`

**Interfaces:**
- Produces: `encodeGray(data:Uint8Array, width, height) → Promise<Uint8Array>`, `decodeGray(png:Uint8Array) → Promise<{data,width,height}>`, `toBase64(Uint8Array) → string`, `fromBase64(string) → Uint8Array`. Works in Node 20 and browsers (uses `CompressionStream`, `Blob`, `Response`).

- [ ] **Step 1: Failing tests**

`tests/png.test.js`:
```js
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { encodeGray, decodeGray, toBase64, fromBase64 } from '../web/png.js';

test('round-trips an 8-bit grayscale image', async () => {
  const w = 37, h = 11, data = new Uint8Array(w * h).map((_, i) => (i * 7) & 0xff);
  const png = await encodeGray(data, w, h);
  assert.deepEqual([...png.subarray(0, 8)], [137, 80, 78, 71, 13, 10, 26, 10]);
  const out = await decodeGray(png);
  assert.equal(out.width, w); assert.equal(out.height, h);
  assert.deepEqual(out.data, data);
});

test('round-trips a full-size 2560x2560 raster', async () => {
  const n = 2560, data = new Uint8Array(n * n); data.fill(9, 1000, 2_000_000);
  const out = await decodeGray(await encodeGray(data, n, n));
  assert.deepEqual(out.data, data);
});

test('rejects non-grayscale PNGs', async () => {
  const w = 2, h = 2, png = await encodeGray(new Uint8Array(4), w, h);
  png[8 + 8 + 9] = 2; // colour type byte inside IHDR -> truecolour
  await assert.rejects(decodeGray(png), /grayscale/);
});

test('base64 helpers round-trip binary', () => {
  const bytes = new Uint8Array(70000).map((_, i) => i & 0xff);
  assert.deepEqual(fromBase64(toBase64(bytes)), bytes);
});
```

- [ ] **Step 2: Run, expect failure** — `Cannot find module '../web/png.js'`.

- [ ] **Step 3: Implement**

`web/png.js`:
```js
// Minimal 8-bit grayscale PNG encoder/decoder. Pure JS; relies on CompressionStream (Node 18+, all browsers).
const SIG = Uint8Array.of(137, 80, 78, 71, 13, 10, 26, 10);
const CRC_TABLE = new Uint32Array(256).map((_, n) => {
  let c = n; for (let k = 0; k < 8; k++) c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1; return c >>> 0;
});
function crc32(bytes) { let c = -1; for (let i = 0; i < bytes.length; i++) c = CRC_TABLE[(c ^ bytes[i]) & 0xff] ^ (c >>> 8); return (c ^ -1) >>> 0; }
function concat(parts) {
  const out = new Uint8Array(parts.reduce((n, p) => n + p.length, 0)); let o = 0;
  for (const p of parts) { out.set(p, o); o += p.length; } return out;
}
async function pipe(bytes, stream) {
  return new Uint8Array(await new Response(new Blob([bytes]).stream().pipeThrough(stream)).arrayBuffer());
}
function chunk(type, data) {
  const out = new Uint8Array(12 + data.length), dv = new DataView(out.buffer);
  dv.setUint32(0, data.length);
  for (let i = 0; i < 4; i++) out[4 + i] = type.charCodeAt(i);
  out.set(data, 8);
  dv.setUint32(8 + data.length, crc32(out.subarray(4, 8 + data.length)));
  return out;
}

export async function encodeGray(data, width, height) {
  const stride = width + 1, raw = new Uint8Array(stride * height);
  for (let y = 0; y < height; y++) raw.set(data.subarray(y * width, (y + 1) * width), y * stride + 1); // filter 0 per row
  const ihdr = new Uint8Array(13), dv = new DataView(ihdr.buffer);
  dv.setUint32(0, width); dv.setUint32(4, height); ihdr[8] = 8; ihdr[9] = 0; // 8-bit, grayscale
  const idat = await pipe(raw, new CompressionStream('deflate'));
  return concat([SIG, chunk('IHDR', ihdr), chunk('IDAT', idat), chunk('IEND', new Uint8Array(0))]);
}

const paeth = (a, b, c) => { const p = a + b - c, pa = Math.abs(p - a), pb = Math.abs(p - b), pc = Math.abs(p - c); return pa <= pb && pa <= pc ? a : pb <= pc ? b : c; };

export async function decodeGray(png) {
  let pos = 8, width = 0, height = 0; const idats = [];
  while (pos + 12 <= png.length) {
    const dv = new DataView(png.buffer, png.byteOffset + pos);
    const len = dv.getUint32(0), type = String.fromCharCode(png[pos + 4], png[pos + 5], png[pos + 6], png[pos + 7]);
    const data = png.subarray(pos + 8, pos + 8 + len);
    if (type === 'IHDR') {
      width = dv.getUint32(8); height = dv.getUint32(12);
      if (data[8] !== 8 || data[9] !== 0) throw new Error('png: expected 8-bit grayscale');
    } else if (type === 'IDAT') idats.push(data);
    pos += 12 + len;
  }
  const raw = await pipe(concat(idats), new DecompressionStream('deflate'));
  const out = new Uint8Array(width * height), stride = width + 1;
  for (let y = 0; y < height; y++) {
    const f = raw[y * stride], row = raw.subarray(y * stride + 1, (y + 1) * stride);
    const dst = out.subarray(y * width, (y + 1) * width), prev = y ? out.subarray((y - 1) * width, y * width) : null;
    for (let x = 0; x < width; x++) {
      const a = x ? dst[x - 1] : 0, b = prev ? prev[x] : 0, c = x && prev ? prev[x - 1] : 0;
      const p = f === 1 ? a : f === 2 ? b : f === 3 ? (a + b) >> 1 : f === 4 ? paeth(a, b, c) : 0;
      dst[x] = (row[x] + p) & 0xff;
    }
  }
  return { data: out, width, height };
}

export function toBase64(bytes) {
  if (typeof Buffer !== 'undefined') return Buffer.from(bytes).toString('base64');
  let s = ''; for (let i = 0; i < bytes.length; i += 0x8000) s += String.fromCharCode.apply(null, bytes.subarray(i, i + 0x8000));
  return btoa(s);
}
export function fromBase64(str) {
  if (typeof Buffer !== 'undefined') return new Uint8Array(Buffer.from(str, 'base64'));
  const s = atob(str), out = new Uint8Array(s.length); for (let i = 0; i < s.length; i++) out[i] = s.charCodeAt(i); return out;
}
```

- [ ] **Step 4: Run, expect pass** — `npm test` → all passing (the 2560² test takes ~1 s).

- [ ] **Step 5: Commit** — `git add web/png.js tests/png.test.js && git commit -m "feat: grayscale PNG codec" -m "Co-Authored-By: Claude Fable 5.1 <noreply@anthropic.com>"`

---

### Task 4: Raster core (`raster.js`)

**Files:**
- Create: `web/raster.js`, `tests/raster.test.js`

**Interfaces:**
- Produces: `createRaster({cells=CELLS, cellM=CELL_M, fill=0, data?}) → r` with `r.cells, r.cellM, r.data:Uint8Array, r.version:number`, `toCell(x,z)→[cx,cz]`, `cellCenter(cx,cz)→[x,z]`, `get(x,z)→value`, `stamp(x,z,radiusM, fn(cur,t)→value) → rect|null` (t = 1 at centre, 0 at edge), `markDirty(rect)`, `takeDirty()→rect|null`, `snapshot(rect)→Uint8Array`, `restore(rect, snap)`. Rect is `{x0,z0,x1,z1}` inclusive cell indices. Row 0 = south.

- [ ] **Step 1: Failing tests**

`tests/raster.test.js`:
```js
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { createRaster } from '../web/raster.js';

test('toCell / cellCenter: row 0 is the south edge', () => {
  const r = createRaster({ cells: 4, cellM: 10 });          // world 40 m, -20..20
  assert.deepEqual(r.toCell(-20, -20), [0, 0]);
  assert.deepEqual(r.toCell(19.9, 19.9), [3, 3]);
  assert.deepEqual(r.cellCenter(0, 0), [-15, -15]);
});

test('stamp sets cells within radius and reports dirty rect', () => {
  const r = createRaster({ cells: 10, cellM: 1 });          // -5..5
  const rect = r.stamp(0.5, 0.5, 1.6, () => 7);              // centre of cell (5,5)
  assert.equal(r.get(0.5, 0.5), 7);
  assert.equal(r.get(1.5, 0.5), 7); assert.equal(r.get(-0.5, 0.5), 7);
  assert.equal(r.get(1.5, 1.5), 7);                          // diagonal at 1.41 < 1.6
  assert.equal(r.get(2.5, 0.5), 0);                          // 2 > 1.6
  assert.deepEqual(rect, { x0: 3, z0: 3, x1: 7, z1: 7 });
  assert.deepEqual(r.takeDirty(), rect); assert.equal(r.takeDirty(), null);
});

test('stamp passes falloff t (1 at centre, 0 at edge) and clamps to bounds', () => {
  const r = createRaster({ cells: 4, cellM: 1 });            // -2..2
  const ts = [];
  const rect = r.stamp(-1.5, -1.5, 1.2, (cur, t) => { ts.push(+t.toFixed(3)); return 1; });
  assert.equal(Math.max(...ts), 1);
  assert.deepEqual(rect, { x0: 0, z0: 0, x1: 1, z1: 1 });
  assert.equal(r.stamp(100, 100, 1, () => 1), null);
});

test('dirty rects union across stamps and version increments', () => {
  const r = createRaster({ cells: 10, cellM: 1 });
  const v = r.version;
  r.stamp(-4.5, -4.5, 0.5, () => 1); r.stamp(4.5, 4.5, 0.5, () => 1);
  assert.deepEqual(r.takeDirty(), { x0: 0, z0: 0, x1: 9, z1: 9 });
  assert.equal(r.version, v + 2);
});

test('snapshot/restore round-trip a rect', () => {
  const r = createRaster({ cells: 6, cellM: 1 });
  const rect = { x0: 1, z0: 2, x1: 3, z1: 4 };
  const before = r.snapshot(rect);
  r.stamp(0, 0, 10, () => 5);
  assert.equal(r.get(0.5, 0.5), 5);
  r.restore(rect, before);
  assert.equal(r.get(1.5, 2.5), 0);     // inside rect: restored
  assert.equal(r.get(-2.5, -2.5), 5);   // outside rect: untouched
  assert.deepEqual(r.takeDirty(), { x0: 0, z0: 0, x1: 5, z1: 5 });
});
```

- [ ] **Step 2: Run, expect failure** — module not found.

- [ ] **Step 3: Implement**

`web/raster.js`:
```js
import { CELLS, CELL_M } from './world.js';

export function createRaster({ cells = CELLS, cellM = CELL_M, fill = 0, data } = {}) {
  const half = (cells * cellM) / 2;
  const r = { cells, cellM, data: data ?? new Uint8Array(cells * cells).fill(fill), dirty: null, version: 0 };
  const inBounds = (cx, cz) => cx >= 0 && cz >= 0 && cx < cells && cz < cells;
  const clamp = n => Math.max(0, Math.min(cells - 1, n));

  r.toCell = (x, z) => [Math.floor((x + half) / cellM), Math.floor((z + half) / cellM)];
  r.cellCenter = (cx, cz) => [(cx + 0.5) * cellM - half, (cz + 0.5) * cellM - half];
  r.get = (x, z) => { const [cx, cz] = r.toCell(x, z); return inBounds(cx, cz) ? r.data[cz * cells + cx] : 0; };

  r.stamp = (x, z, radius, fn) => {
    const [ax, az] = r.toCell(x - radius, z - radius), [bx, bz] = r.toCell(x + radius, z + radius);
    if (bx < 0 || bz < 0 || ax >= cells || az >= cells) return null;
    const rect = { x0: clamp(ax), z0: clamp(az), x1: clamp(bx), z1: clamp(bz) };
    for (let cz = rect.z0; cz <= rect.z1; cz++) {
      for (let cx = rect.x0; cx <= rect.x1; cx++) {
        const [px, pz] = r.cellCenter(cx, cz), d = Math.hypot(px - x, pz - z);
        if (d > radius) continue;
        const i = cz * cells + cx;
        r.data[i] = fn(r.data[i], 1 - d / radius);
      }
    }
    r.markDirty(rect);
    return rect;
  };

  r.markDirty = rect => {
    const d = r.dirty;
    r.dirty = d ? { x0: Math.min(d.x0, rect.x0), z0: Math.min(d.z0, rect.z0), x1: Math.max(d.x1, rect.x1), z1: Math.max(d.z1, rect.z1) } : { ...rect };
    r.version++;
  };
  r.takeDirty = () => { const d = r.dirty; r.dirty = null; return d; };

  r.snapshot = rect => {
    const w = rect.x1 - rect.x0 + 1, h = rect.z1 - rect.z0 + 1, out = new Uint8Array(w * h);
    for (let z = 0; z < h; z++) { const o = (rect.z0 + z) * cells + rect.x0; out.set(r.data.subarray(o, o + w), z * w); }
    return out;
  };
  r.restore = (rect, snap) => {
    const w = rect.x1 - rect.x0 + 1, h = rect.z1 - rect.z0 + 1;
    for (let z = 0; z < h; z++) r.data.set(snap.subarray(z * w, (z + 1) * w), (rect.z0 + z) * cells + rect.x0);
    r.markDirty(rect);
  };
  return r;
}
```

- [ ] **Step 4: Run, expect pass.**

- [ ] **Step 5: Commit** — `git add web/raster.js tests/raster.test.js && git commit -m "feat: raster grid with stamping and snapshots" -m "Co-Authored-By: Claude Fable 5.1 <noreply@anthropic.com>"`

---

### Task 5: Undo/redo (`history.js`)

**Files:**
- Create: `web/history.js`, `tests/history.test.js`

**Interfaces:**
- Consumes: `raster.snapshot/restore/takeDirty` from Task 4.
- Produces: `createHistory({limit=200}) → h` with `push(cmd)`, `undo()→bool`, `redo()→bool`, `canUndo()`, `canRedo()`, `clear()`, `onChange` callback. A `cmd` is `{label, undo(), redo()}`. `createStrokeRecorder(raster) → {begin(), end(label) → cmd|null}` — copies the raster at begin, at end diffs the accumulated dirty rect into a raster command (call `end` before the renderer calls `takeDirty`; the recorder re-marks the rect dirty so the renderer still updates).

- [ ] **Step 1: Failing tests**

`tests/history.test.js`:
```js
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { createHistory, createStrokeRecorder } from '../web/history.js';
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
```

- [ ] **Step 2: Run, expect failure.**

- [ ] **Step 3: Implement**

`web/history.js`:
```js
export function createHistory({ limit = 200 } = {}) {
  const undos = [], redos = [];
  const h = { onChange: null };
  const changed = () => h.onChange?.();
  h.push = cmd => { undos.push(cmd); if (undos.length > limit) undos.shift(); redos.length = 0; changed(); };
  h.undo = () => { const c = undos.pop(); if (!c) return false; c.undo(); redos.push(c); changed(); return true; };
  h.redo = () => { const c = redos.pop(); if (!c) return false; c.redo(); undos.push(c); changed(); return true; };
  h.canUndo = () => undos.length > 0;
  h.canRedo = () => redos.length > 0;
  h.clear = () => { undos.length = 0; redos.length = 0; changed(); };
  return h;
}

/** Records one brush stroke on a raster as a single command. */
export function createStrokeRecorder(raster) {
  let copy = null, startVersion = 0;
  return {
    begin() { copy = raster.data.slice(); startVersion = raster.version; raster.dirty = null; },
    end(label) {
      const rect = raster.dirty;
      if (!copy || !rect || raster.version === startVersion) { copy = null; return null; }
      const after = raster.snapshot(rect);
      const before = createRasterLike(raster, copy).snapshot(rect);
      copy = null;
      return { label, undo: () => raster.restore(rect, before), redo: () => raster.restore(rect, after) };
    },
  };
}
function createRasterLike(r, data) {
  return { snapshot: rect => {
    const w = rect.x1 - rect.x0 + 1, h = rect.z1 - rect.z0 + 1, out = new Uint8Array(w * h);
    for (let z = 0; z < h; z++) { const o = (rect.z0 + z) * r.cells + rect.x0; out.set(data.subarray(o, o + w), z * w); }
    return out;
  } };
}
```
Note: `begin()` clears the pending dirty rect so the stroke's rect is exact; the main loop must render (and `takeDirty`) before a stroke begins, which it does since pointerdown happens between frames.

- [ ] **Step 4: Run, expect pass.**

- [ ] **Step 5: Commit** — `git add web/history.js tests/history.test.js && git commit -m "feat: undo/redo history and stroke recorder" -m "Co-Authored-By: Claude Fable 5.1 <noreply@anthropic.com>"`

---

### Task 6: Save format and store client (`store.js`)

**Files:**
- Create: `web/store.js`, `tests/store.test.js`

**Interfaces:**
- Consumes: `png.js`, `raster.js`, `world.js`.
- Produces: `SAVE_VERSION=1`; `emptyDoc()`; `createState(doc?) → state` where `state = { terrain: raster, fog: raster, ink: stroke[], pins: pin[], player: {x,z,angle}, settings: { grid:{visible,spacing}, layers:{[id]:{visible,opacity}}, camera:{x,z,scale} } }` (async: `await createState(doc)`); `serialize(state) → Promise<doc>`; `createStoreClient({url='/api/map', fetchFn, storage, debounceMs=2000, onStatus}) → { load()→Promise<doc>, save(doc)→Promise<void>, schedule(getDoc), flush()→Promise<void> }`. Status values: `'saved' | 'saving' | 'error' | 'dirty'`.
- Doc shape: `{version, terrain: base64png|null, fog: base64png|null, ink, pins, player, settings}`. Stroke: `{color, width, points:[[x,z],...]}`. Pin: `{id, x, z, type, name, checked}`.

- [ ] **Step 1: Failing tests**

`tests/store.test.js`:
```js
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { emptyDoc, createState, serialize, createStoreClient, SAVE_VERSION } from '../web/store.js';

test('empty doc -> state -> doc round trip', async () => {
  const s = await createState(emptyDoc());
  assert.equal(s.terrain.cells, 2560); assert.equal(s.fog.data[0], 0);
  s.terrain.stamp(100, 100, 50, () => 2);
  s.fog.stamp(0, 0, 200, () => 255);
  s.ink.push({ color: '#000', width: 5, points: [[0, 0], [10, 10]] });
  s.pins.push({ id: 'a', x: 1, z: 2, type: 'fire', name: 'Camp', checked: false });
  s.player = { x: 5, z: 6, angle: 1 };
  const doc = await serialize(s);
  assert.equal(doc.version, SAVE_VERSION);
  assert.equal(typeof doc.terrain, 'string');
  const s2 = await createState(JSON.parse(JSON.stringify(doc)));
  assert.deepEqual(s2.terrain.data, s.terrain.data);
  assert.deepEqual(s2.fog.data, s.fog.data);
  assert.deepEqual(s2.ink, s.ink); assert.deepEqual(s2.pins, s.pins); assert.deepEqual(s2.player, s.player);
});

test('createState rejects unknown versions', async () => {
  await assert.rejects(createState({ ...emptyDoc(), version: 99 }), /version/);
});

test('client saves via PUT, reports status, retries on failure, falls back to storage', async () => {
  const calls = []; let fail = 1; const statuses = []; const mem = new Map();
  const storage = { getItem: k => mem.get(k) ?? null, setItem: (k, v) => mem.set(k, v) };
  const fetchFn = async (url, opts = {}) => {
    calls.push([url, opts.method ?? 'GET']);
    if (opts.method === 'PUT') { if (fail-- > 0) throw new Error('net'); return { ok: true, json: async () => ({}) }; }
    return { ok: true, json: async () => ({ ...emptyDoc(), pins: [{ id: 'x' }] }) };
  };
  const c = createStoreClient({ url: '/api/map', fetchFn, storage, debounceMs: 1, retryMs: 1, onStatus: s => statuses.push(s) });
  const loaded = await c.load(); assert.equal(loaded.pins[0].id, 'x');
  const doc = emptyDoc(); doc.pins.push({ id: 'p' });
  c.schedule(() => doc);
  await c.flush();
  assert.deepEqual(calls.filter(c => c[1] === 'PUT').length, 2);          // one failure, one success
  assert.deepEqual(statuses, ['dirty', 'saving', 'error', 'saving', 'saved']);
  assert.equal(JSON.parse(mem.get('valheim-mapper:map')).pins[0].id, 'p');  // local copy kept
});

test('client load falls back to localStorage when server unreachable', async () => {
  const mem = new Map([['valheim-mapper:map', JSON.stringify({ ...emptyDoc(), pins: [{ id: 'local' }] })]]);
  const storage = { getItem: k => mem.get(k) ?? null, setItem: (k, v) => mem.set(k, v) };
  const c = createStoreClient({ fetchFn: async () => { throw new Error('down'); }, storage });
  assert.equal((await c.load()).pins[0].id, 'local');
});
```

- [ ] **Step 2: Run, expect failure.**

- [ ] **Step 3: Implement**

`web/store.js`:
```js
import { encodeGray, decodeGray, toBase64, fromBase64 } from './png.js';
import { createRaster } from './raster.js';
import { CELLS, ZONE_M } from './world.js';

export const SAVE_VERSION = 1;
const LS_KEY = 'valheim-mapper:map';

export function emptyDoc() {
  return {
    version: SAVE_VERSION, terrain: null, fog: null, ink: [], pins: [],
    player: { x: 0, z: 0, angle: 0 },
    settings: { grid: { visible: true, spacing: ZONE_M }, layers: {}, camera: { x: 0, z: 0, scale: 0.04 } },
  };
}

async function rasterFrom(b64) {
  if (!b64) return createRaster();
  const { data, width, height } = await decodeGray(fromBase64(b64));
  if (width !== CELLS || height !== CELLS) throw new Error(`raster is ${width}x${height}, expected ${CELLS}`);
  return createRaster({ data });
}
const rasterTo = async r => toBase64(await encodeGray(r.data, r.cells, r.cells));

export async function createState(doc = emptyDoc()) {
  if (doc.version !== SAVE_VERSION) throw new Error(`unsupported save version ${doc.version}`);
  const base = emptyDoc();
  return {
    terrain: await rasterFrom(doc.terrain),
    fog: await rasterFrom(doc.fog),
    ink: structuredClone(doc.ink ?? []),
    pins: structuredClone(doc.pins ?? []),
    player: { ...base.player, ...doc.player },
    settings: { ...base.settings, ...doc.settings, grid: { ...base.settings.grid, ...doc.settings?.grid } },
  };
}

export async function serialize(state) {
  return {
    version: SAVE_VERSION,
    terrain: await rasterTo(state.terrain), fog: await rasterTo(state.fog),
    ink: state.ink, pins: state.pins, player: state.player, settings: state.settings,
  };
}

export function createStoreClient({ url = '/api/map', fetchFn = globalThis.fetch, storage = globalThis.localStorage,
  debounceMs = 2000, retryMs = 3000, onStatus = () => {} } = {}) {
  let timer = null, pending = null, inflight = null;
  const local = { get: () => { try { return JSON.parse(storage?.getItem(LS_KEY)); } catch { return null; } },
                  set: doc => { try { storage?.setItem(LS_KEY, JSON.stringify(doc)); } catch { /* quota / private mode */ } } };

  async function load() {
    try {
      const res = await fetchFn(url); if (!res.ok) throw new Error(res.status);
      const doc = await res.json(); return doc?.version ? doc : emptyDoc();
    } catch { return local.get() ?? emptyDoc(); }
  }

  async function save(doc) {
    local.set(doc);
    for (let attempt = 0; ; attempt++) {
      onStatus('saving');
      try {
        const res = await fetchFn(url, { method: 'PUT', headers: { 'content-type': 'application/json' }, body: JSON.stringify(doc) });
        if (!res.ok) throw new Error(`HTTP ${res.status}`);
        onStatus('saved'); return;
      } catch {
        onStatus('error');
        await new Promise(r => setTimeout(r, Math.min(retryMs * 2 ** attempt, 60_000)));
      }
    }
  }

  function schedule(getDoc) {
    pending = getDoc; onStatus('dirty');
    clearTimeout(timer); timer = setTimeout(flush, debounceMs);
  }
  async function flush() {
    clearTimeout(timer);
    if (inflight) await inflight;
    if (!pending) return;
    const getDoc = pending; pending = null;
    inflight = (async () => save(await getDoc()))();
    await inflight; inflight = null;
    if (pending) await flush();
  }
  return { load, save, schedule, flush };
}
```

- [ ] **Step 4: Run, expect pass.**

- [ ] **Step 5: Commit** — `git add web/store.js tests/store.test.js && git commit -m "feat: save format, state factory and store client" -m "Co-Authored-By: Claude Fable 5.1 <noreply@anthropic.com>"`

---

### Task 7: Server (`server/server.js`)

**Files:**
- Create: `server/server.js`, `tests/server.test.js`

**Interfaces:**
- Produces: `readMap(dataFile) → Promise<object|null>` (main, then `.bak`, else null); `writeMap(dataFile, text) → Promise<void>` (tmp → rename main→bak → rename tmp→main); `createServer({webDir, dataFile, maxBody=64MB}) → http.Server`. Routes: `GET /api/map` (200 JSON or 204 if none), `PUT /api/map` (JSON with numeric `version` else 400; 413 if too big; 204 on success), static from `webDir` with MIME for html/js/css/json/png/ttf/otf/svg; `/` → `index.html`; 404 otherwise; path traversal blocked. Runs `listen(process.env.PORT ?? 8080)` when executed directly.

- [ ] **Step 1: Failing tests**

`tests/server.test.js`:
```js
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { mkdtemp, writeFile, readFile, mkdir } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import path from 'node:path';
import { createServer, readMap, writeMap } from '../server/server.js';

async function tmp() { return mkdtemp(path.join(tmpdir(), 'vm-')); }
async function listen(srv) { await new Promise(r => srv.listen(0, r)); return `http://127.0.0.1:${srv.address().port}`; }

test('writeMap is atomic and keeps a backup; readMap falls back to it', async () => {
  const dir = await tmp(), f = path.join(dir, 'map.json');
  assert.equal(await readMap(f), null);
  await writeMap(f, JSON.stringify({ version: 1, n: 1 }));
  await writeMap(f, JSON.stringify({ version: 1, n: 2 }));
  assert.equal((await readMap(f)).n, 2);
  assert.equal(JSON.parse(await readFile(f + '.bak', 'utf8')).n, 1);
  await writeFile(f, '{corrupt');
  assert.equal((await readMap(f)).n, 1);
});

test('api and static routes', async () => {
  const dir = await tmp(), web = path.join(dir, 'web'); await mkdir(web);
  await writeFile(path.join(web, 'index.html'), '<h1>hi</h1>');
  await writeFile(path.join(web, 'a.js'), 'export const a = 1;');
  const srv = createServer({ webDir: web, dataFile: path.join(dir, 'data', 'map.json'), maxBody: 1000 });
  const base = await listen(srv);
  try {
    assert.equal((await fetch(base + '/api/map')).status, 204);
    let r = await fetch(base + '/api/map', { method: 'PUT', body: JSON.stringify({ version: 1, pins: [] }) });
    assert.equal(r.status, 204);
    r = await fetch(base + '/api/map'); assert.equal(r.status, 200); assert.deepEqual((await r.json()).pins, []);
    r = await fetch(base + '/api/map', { method: 'PUT', body: 'nope' }); assert.equal(r.status, 400);
    r = await fetch(base + '/api/map', { method: 'PUT', body: JSON.stringify({ version: 1, big: 'x'.repeat(2000) }) }); assert.equal(r.status, 413);
    r = await fetch(base + '/'); assert.equal(r.status, 200); assert.match(r.headers.get('content-type'), /text\/html/);
    r = await fetch(base + '/a.js'); assert.match(r.headers.get('content-type'), /javascript/);
    assert.equal((await fetch(base + '/missing.png')).status, 404);
    assert.equal((await fetch(base + '/../package.json')).status, 404);
  } finally { srv.close(); }
});
```

- [ ] **Step 2: Run, expect failure.**

- [ ] **Step 3: Implement**

`server/server.js`:
```js
import http from 'node:http';
import { readFile, writeFile, rename, mkdir, stat } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const MIME = { '.html': 'text/html; charset=utf-8', '.js': 'text/javascript; charset=utf-8', '.css': 'text/css; charset=utf-8',
  '.json': 'application/json', '.png': 'image/png', '.ttf': 'font/ttf', '.otf': 'font/otf', '.svg': 'image/svg+xml' };

export async function readMap(dataFile) {
  for (const f of [dataFile, dataFile + '.bak']) {
    try { return JSON.parse(await readFile(f, 'utf8')); } catch { /* try next */ }
  }
  return null;
}

export async function writeMap(dataFile, text) {
  await mkdir(path.dirname(dataFile), { recursive: true });
  const tmp = dataFile + '.tmp';
  await writeFile(tmp, text);
  try { await stat(dataFile); await rename(dataFile, dataFile + '.bak'); } catch { /* first save */ }
  await rename(tmp, dataFile);
}

function readBody(req, maxBody) {
  return new Promise((resolve, reject) => {
    const chunks = []; let n = 0, tooBig = false;
    req.on('data', c => { n += c.length; if (n > maxBody) { tooBig = true; chunks.length = 0; } else chunks.push(c); });   // keep draining so we can still reply
    req.on('end', () => tooBig ? reject(Object.assign(new Error('too large'), { status: 413 })) : resolve(Buffer.concat(chunks).toString('utf8')));
    req.on('error', reject);
  });
}

export function createServer({ webDir, dataFile, maxBody = 64 * 1024 * 1024 }) {
  const root = path.resolve(webDir);
  return http.createServer(async (req, res) => {
    const send = (status, body = '', type = 'text/plain') => { res.writeHead(status, body ? { 'content-type': type } : {}); res.end(body); };
    try {
      const url = new URL(req.url, 'http://x');
      if (url.pathname === '/api/map') {
        if (req.method === 'GET') { const doc = await readMap(dataFile); return doc ? send(200, JSON.stringify(doc), 'application/json') : send(204); }
        if (req.method === 'PUT') {
          const text = await readBody(req, maxBody);
          let doc; try { doc = JSON.parse(text); } catch { return send(400, 'invalid JSON'); }
          if (typeof doc?.version !== 'number') return send(400, 'missing version');
          await writeMap(dataFile, text); return send(204);
        }
        return send(405);
      }
      const rel = decodeURIComponent(url.pathname === '/' ? '/index.html' : url.pathname);
      const file = path.resolve(root, '.' + rel);
      if (!file.startsWith(root + path.sep)) return send(404);
      const data = await readFile(file).catch(() => null);
      if (!data) return send(404);
      res.writeHead(200, { 'content-type': MIME[path.extname(file)] ?? 'application/octet-stream', 'cache-control': 'no-cache' });
      res.end(data);
    } catch (e) { send(e.status ?? 500, e.message); }
  });
}

if (process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  const here = path.dirname(fileURLToPath(import.meta.url));
  const port = Number(process.env.PORT ?? 8080);
  createServer({ webDir: path.join(here, '..', 'web'), dataFile: path.join(here, '..', 'data', 'map.json') })
    .listen(port, () => console.log(`valheim-mapper on http://localhost:${port}`));
}
```
Note on 413: the body is drained rather than the socket destroyed, so the client reliably receives the 413 status. The `/../package.json` test relies on `new URL` normalising `..` away → `/package.json` → not in `web/` → 404.

- [ ] **Step 4: Run, expect pass.**

- [ ] **Step 5: Commit** — `git add server/server.js tests/server.test.js && git commit -m "feat: static + map API server with atomic writes" -m "Co-Authored-By: Claude Fable 5.1 <noreply@anthropic.com>"`

---

### Task 8: Shell, layer stack, base layer, camera controls (`index.html`, `style.css`, `layers.js`, `base.js`, `main.js`)

First visible milestone: parchment world with space outside the circle, wheel zoom, drag pan, fit key. No tools yet.

**Files:**
- Create: `web/index.html`, `web/style.css`, `web/layers.js`, `web/base.js`, `web/main.js`

**Interfaces:**
- Produces `layers.js`: `createLayers() → L` with `L.list`, `L.add(layer)`, `L.get(id)`, `L.draw(ctx, view, w, h)`, `L.settings()`, `L.applySettings(obj)`; layer = `{id, name, visible=true, opacity=1, draw(ctx, view, w, h)}` — `ctx` arrives with identity transform and `globalAlpha` preset; `scratchCanvas(key, w, h) → canvas` (cached per key, resized as needed); `worldPattern(ctx, image, tileM) → CanvasPattern` (pattern scaled so one tile = `tileM` metres in the current world transform).
- Produces `main.js` globals passed to later tasks: `app = { canvas, view, layers, state, history, store, textures, icons, requestRender(), size() → [w,h] }`. `loadImage(url) → Promise<HTMLImageElement>`.
- `index.html` element ids used later: `#map` (canvas), `#toolbar`, `#sidebar`, `#layers`, `#status`, `#pin-editor` (input), `#brush`, `#brush-label`, `#biomes`, `#pin-types`, `#ink-color`, `#ink-width`, `#grid-visible`, `#grid-spacing`, `#undo`, `#redo`, `#save`, `#export`, `#import` (file input), `#reveal-player`, `#fit`.

- [ ] **Step 1: index.html**

```html
<!doctype html>
<html lang="en">
<head>
<meta charset="utf-8">
<title>Valheim Mapper</title>
<link rel="stylesheet" href="style.css">
</head>
<body>
<canvas id="map"></canvas>
<div id="toolbar">
  <button data-tool="pan" title="Pan (H)">Pan</button>
  <button data-tool="paint" title="Paint terrain (B)">Paint</button>
  <button data-tool="ink" title="Ink (I)">Ink</button>
  <button data-tool="fog" title="Fog (F)">Fog</button>
  <button data-tool="pin" title="Pin (P)">Pin</button>
  <button data-tool="select" title="Select (V)">Select</button>
  <span class="sep"></span>
  <button id="undo" title="Undo (Cmd/Ctrl+Z)">Undo</button>
  <button id="redo" title="Redo (Shift+Cmd/Ctrl+Z)">Redo</button>
  <button id="fit" title="Fit world (0)">Fit</button>
  <span class="sep"></span>
  <button id="save">Save</button>
  <button id="export">Export</button>
  <label class="btn">Import<input id="import" type="file" accept="application/json" hidden></label>
  <span id="status">loading…</span>
</div>
<aside id="sidebar">
  <section id="tool-options">
    <label>Brush <input id="brush" type="range" min="8" max="1024" step="8" value="64"> <span id="brush-label">64 m</span></label>
    <div id="biomes" class="palette"></div>
    <div id="pin-types" class="palette"></div>
    <label id="ink-opts">Ink <input id="ink-color" type="color" value="#2b1d0e"> <input id="ink-width" type="range" min="2" max="64" value="8"></label>
    <button id="reveal-player" title="Reveal 100 m around the player marker">Reveal around player</button>
  </section>
  <section>
    <h3>Grid</h3>
    <label><input id="grid-visible" type="checkbox" checked> Visible</label>
    <label>Spacing <input id="grid-spacing" type="number" min="8" step="8" value="64"> m</label>
  </section>
  <section><h3>Layers</h3><div id="layers"></div></section>
</aside>
<input id="pin-editor" type="text" hidden maxlength="40">
<script type="module" src="main.js"></script>
</body>
</html>
```

- [ ] **Step 2: style.css**

```css
@font-face { font-family: 'Norse'; src: url('assets/fonts/Norse.otf'); }
@font-face { font-family: 'Norse'; font-weight: bold; src: url('assets/fonts/Norsebold.otf'); }
@font-face { font-family: 'Averia Serif'; src: url('assets/fonts/AveriaSerifLibre-Regular.ttf'); }
@font-face { font-family: 'Averia Serif'; font-weight: bold; src: url('assets/fonts/AveriaSerifLibre-Bold.ttf'); }
html, body { margin: 0; height: 100%; overflow: hidden; background: #111; font: 13px/1.4 'Averia Serif', serif; color: #e8dcc4; }
#map { position: fixed; inset: 0; width: 100%; height: 100%; touch-action: none; cursor: crosshair; }
#toolbar { position: fixed; top: 8px; left: 8px; display: flex; gap: 4px; align-items: center; background: #1b1610cc; padding: 6px; border-radius: 6px; }
#toolbar .sep { width: 1px; height: 20px; background: #555; margin: 0 4px; }
button, .btn { background: #3a2f22; color: #e8dcc4; border: 1px solid #6b563c; border-radius: 4px; padding: 4px 8px; cursor: pointer; font: inherit; }
button.active { background: #8a6a3a; }
#sidebar { position: fixed; top: 8px; right: 8px; width: 240px; background: #1b1610cc; padding: 8px; border-radius: 6px; display: grid; gap: 8px; }
#sidebar h3 { margin: 4px 0; font-family: 'Norse', serif; font-size: 16px; }
#sidebar label { display: flex; gap: 6px; align-items: center; }
.palette { display: flex; flex-wrap: wrap; gap: 4px; }
.palette button { padding: 3px 6px; font-size: 12px; }
.palette img { width: 20px; height: 20px; vertical-align: middle; }
#layers .layer { display: grid; grid-template-columns: auto 1fr auto; gap: 6px; align-items: center; }
#status { margin-left: 8px; opacity: .8; }
#status.error { color: #ff7b6b; }
#pin-editor { position: fixed; background: #1b1610; color: #fff; border: 1px solid #8a6a3a; font: bold 14px 'Norse', serif; padding: 2px 4px; }
```

- [ ] **Step 3: layers.js**

```js
export function createLayers() {
  const list = [];
  const L = { list };
  L.add = layer => { const l = Object.assign({ visible: true, opacity: 1 }, layer); list.push(l); return l; };
  L.get = id => list.find(l => l.id === id);
  L.draw = (ctx, view, w, h) => {
    for (const l of list) {
      if (!l.visible || l.opacity <= 0) continue;
      ctx.save(); ctx.setTransform(1, 0, 0, 1, 0, 0); ctx.globalAlpha = l.opacity;
      l.draw(ctx, view, w, h);
      ctx.restore();
    }
  };
  L.settings = () => Object.fromEntries(list.map(l => [l.id, { visible: l.visible, opacity: l.opacity }]));
  L.applySettings = s => { for (const l of list) if (s?.[l.id]) Object.assign(l, s[l.id]); };
  return L;
}

const scratch = new Map();
/** Screen-sized offscreen canvas, cached by key. */
export function scratchCanvas(key, w, h) {
  let c = scratch.get(key);
  if (!c) { c = document.createElement('canvas'); scratch.set(key, c); }
  if (c.width !== w || c.height !== h) { c.width = w; c.height = h; }
  return c;
}

/** Pattern whose tile spans tileM metres when filled under a world transform. */
export function worldPattern(ctx, image, tileM) {
  const p = ctx.createPattern(image, 'repeat');
  p.setTransform(new DOMMatrix().scale(tileM / image.width));
  return p;
}
```

- [ ] **Step 4: base.js**

```js
import { WORLD_HALF, WORLD_SIZE, WORLD_RADIUS, TILE_M } from './world.js';
import { worldPattern } from './layers.js';

export function createBase(textures) {
  return {
    id: 'base', name: 'Parchment',
    draw(ctx, view, w, h) {
      view.applyTo(ctx, w, h);
      ctx.fillStyle = worldPattern(ctx, textures.space, TILE_M.space);
      const b = view.visibleBounds(w, h);
      ctx.fillRect(b.x0, b.z0, b.x1 - b.x0, b.z1 - b.z0);
      ctx.beginPath(); ctx.arc(0, 0, WORLD_RADIUS, 0, Math.PI * 2); ctx.clip();
      ctx.fillStyle = worldPattern(ctx, textures.background, TILE_M.background);
      ctx.fillRect(-WORLD_HALF, -WORLD_HALF, WORLD_SIZE, WORLD_SIZE);
    },
  };
}
```

- [ ] **Step 5: main.js (camera only for now; later tasks extend it)**

```js
import { createView } from './view.js';
import { createLayers } from './layers.js';
import { createHistory } from './history.js';
import { createStoreClient, createState, serialize, emptyDoc } from './store.js';
import { createBase } from './base.js';
import { PIN_TYPES } from './world.js';

export const loadImage = url => new Promise((res, rej) => { const i = new Image(); i.onload = () => res(i); i.onerror = () => rej(new Error(url)); i.src = url; });

async function loadAssets() {
  const names = ['background', 'space', 'forest', 'mountain', 'water', 'fog_layer', 'clouds'];
  const textures = Object.fromEntries(await Promise.all(names.map(async n => [n === 'fog_layer' ? 'fog' : n, await loadImage(`assets/map/${n}.png`)])));
  const iconNames = [...PIN_TYPES, 'checked', 'player_32'];
  const icons = Object.fromEntries(await Promise.all(iconNames.map(async n => [n, await loadImage(`assets/map/mapicon_${n}.png`)])));
  await Promise.all([document.fonts.load('bold 14px Norse'), document.fonts.load('12px "Averia Serif"')]);
  return { textures, icons };
}

const status = document.getElementById('status');
const setStatus = (s, cls = '') => { status.textContent = s; status.className = cls; };

const canvas = document.getElementById('map');
const ctx = canvas.getContext('2d');
const dpr = () => window.devicePixelRatio || 1;
const size = () => [canvas.width, canvas.height];
function resize() { canvas.width = Math.round(innerWidth * dpr()); canvas.height = Math.round(innerHeight * dpr()); requestRender(); }

let needsRender = false;
export function requestRender() {
  if (needsRender) return; needsRender = true;
  requestAnimationFrame(() => { needsRender = false; render(); });
}

const app = { canvas, ctx, view: createView(), layers: createLayers(), history: createHistory(), requestRender, size, setStatus, dpr };

function render() {
  const [w, h] = size();
  ctx.setTransform(1, 0, 0, 1, 0, 0); ctx.clearRect(0, 0, w, h);
  app.layers.draw(ctx, app.view, w, h);
}

function cameraControls() {
  const { view } = app;
  const pos = e => [e.offsetX * dpr(), e.offsetY * dpr()];
  canvas.addEventListener('wheel', e => { e.preventDefault(); const [sx, sy] = pos(e); view.zoomAt(sx, sy, Math.exp(-e.deltaY * 0.0015), ...size()); requestRender(); }, { passive: false });
  let panning = null;
  app.isPanGesture = e => e.button === 1 || app.spaceDown || app.tool === 'pan';
  canvas.addEventListener('pointerdown', e => { if (app.isPanGesture(e)) { panning = pos(e); canvas.setPointerCapture(e.pointerId); } });
  canvas.addEventListener('pointermove', e => { if (!panning) return; const p = pos(e); view.panBy(p[0] - panning[0], p[1] - panning[1]); panning = p; requestRender(); });
  canvas.addEventListener('pointerup', () => { panning = null; });
  canvas.addEventListener('dblclick', e => { const [sx, sy] = pos(e); const [wx, wz] = view.screenToWorld(sx, sy, ...size()); view.x = wx; view.z = wz; requestRender(); });
  addEventListener('keydown', e => { if (e.code === 'Space' && e.target === document.body) { app.spaceDown = true; e.preventDefault(); } if (e.key === '0' && e.target === document.body) { view.fitWorld(...size()); requestRender(); } });
  addEventListener('keyup', e => { if (e.code === 'Space') app.spaceDown = false; });
  document.getElementById('fit').onclick = () => { view.fitWorld(...size()); requestRender(); };
}

async function boot() {
  setStatus('loading…');
  const { textures, icons } = await loadAssets();
  Object.assign(app, { textures, icons });
  app.store = createStoreClient({ onStatus: s => setStatus({ dirty: 'unsaved', saving: 'saving…', saved: 'saved', error: 'save failed, retrying' }[s], s === 'error' ? 'error' : '') });
  let doc = await app.store.load();
  try { app.state = await createState(doc); } catch (e) { setStatus(`could not load save (${e.message}); starting empty`, 'error'); app.state = await createState(emptyDoc()); app.loadFailed = true; }
  Object.assign(app.view, app.state.settings.camera);
  app.layers.add(createBase(textures));
  app.layers.applySettings(app.state.settings.layers);
  cameraControls();
  addEventListener('resize', resize); resize();
  if (!doc.terrain && !doc.pins?.length) app.view.fitWorld(...size());
  if (!app.loadFailed) setStatus('ready');
  requestRender();
}
boot().catch(e => setStatus(`failed to start: ${e.message}`, 'error'));
export { app };
```

- [ ] **Step 6: Run and verify manually**

```bash
npm start
```
Open http://localhost:8080. Expect: dark space texture, parchment disc filling most of the window (fit on first run), smooth wheel zoom about the cursor, middle-drag or space+drag pans, double-click recentres, `0` and Fit button refit. Status reads "ready". No console errors (fonts and all 20 images load — check the Network tab shows 200s for `assets/map/*.png`).

- [ ] **Step 7: Commit** — `git add web/index.html web/style.css web/layers.js web/base.js web/main.js && git commit -m "feat: app shell, layer stack, parchment base and camera controls" -m "Co-Authored-By: Claude Fable 5.1 <noreply@anthropic.com>"`

---

### Task 9: Grid layer (`grid.js`)

**Files:**
- Create: `web/grid.js`, `tests/grid.test.js`; Modify: `web/main.js` (add layer + sidebar wiring)

**Interfaces:**
- Produces: `chooseSpacing(baseM, scalePxPerM, minPx=6) → metres` (base if ≥ minPx, else 1000 if ≥ minPx, else 5000); `createGrid(settings) → layer` reading `settings.grid = {visible, spacing}` live (layer `visible` mirrors `settings.grid.visible`).

- [ ] **Step 1: Failing test**

`tests/grid.test.js`:
```js
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { chooseSpacing } from '../web/grid.js';

test('keeps base spacing when cells are legible, else steps to 1 km then 5 km', () => {
  assert.equal(chooseSpacing(64, 0.1), 64);        // 6.4 px
  assert.equal(chooseSpacing(64, 0.05), 1000);     // 3.2 px -> 1 km = 50 px
  assert.equal(chooseSpacing(64, 0.004), 5000);    // 1 km = 4 px -> 5 km
  assert.equal(chooseSpacing(500, 0.02), 500);
});
```

- [ ] **Step 2: Run, expect failure.**

- [ ] **Step 3: Implement**

`web/grid.js`:
```js
import { WORLD_HALF } from './world.js';

export function chooseSpacing(baseM, scale, minPx = 6) {
  if (baseM * scale >= minPx) return baseM;
  return 1000 * scale >= minPx ? 1000 : 5000;
}

export function createGrid(settings) {
  const layer = {
    id: 'grid', name: 'Grid',
    get visible() { return settings.grid.visible; }, set visible(v) { settings.grid.visible = v; },
    draw(ctx, view, w, h) {
      const s = chooseSpacing(settings.grid.spacing, view.scale);
      const b = view.visibleBounds(w, h);
      const x0 = Math.max(-WORLD_HALF, Math.floor(b.x0 / s) * s), x1 = Math.min(WORLD_HALF, b.x1);
      const z0 = Math.max(-WORLD_HALF, Math.floor(b.z0 / s) * s), z1 = Math.min(WORLD_HALF, b.z1);
      view.applyTo(ctx, w, h);
      ctx.lineWidth = 1 / view.scale;
      ctx.strokeStyle = 'rgba(40, 25, 10, 0.35)';
      ctx.beginPath();
      for (let x = x0; x <= x1; x += s) { ctx.moveTo(x, Math.max(-WORLD_HALF, b.z0)); ctx.lineTo(x, Math.min(WORLD_HALF, b.z1)); }
      for (let z = z0; z <= z1; z += s) { ctx.moveTo(Math.max(-WORLD_HALF, b.x0), z); ctx.lineTo(Math.min(WORLD_HALF, b.x1), z); }
      ctx.stroke();
      // Labels on 1 km lines (or every line when spacing >= 1 km)
      const labelEvery = Math.max(s, 1000);
      ctx.setTransform(1, 0, 0, 1, 0, 0);
      ctx.font = `${Math.round(11 * (window.devicePixelRatio || 1))}px "Averia Serif"`;
      ctx.fillStyle = 'rgba(40, 25, 10, 0.7)'; ctx.textBaseline = 'top';
      for (let x = Math.ceil(x0 / labelEvery) * labelEvery; x <= x1; x += labelEvery) { const [sx] = view.worldToScreen(x, 0, w, h); ctx.fillText(`${x}`, sx + 3, 3); }
      for (let z = Math.ceil(z0 / labelEvery) * labelEvery; z <= z1; z += labelEvery) { const [, sy] = view.worldToScreen(0, z, w, h); ctx.fillText(`${z}`, 3, sy + 3); }
    },
  };
  return layer;
}
```

- [ ] **Step 4: Wire into main.js** — after `app.layers.add(createBase(textures));` add:
```js
app.layers.add(createGrid(app.state.settings));
const gridVisible = document.getElementById('grid-visible'), gridSpacing = document.getElementById('grid-spacing');
gridVisible.checked = app.state.settings.grid.visible; gridSpacing.value = app.state.settings.grid.spacing;
gridVisible.onchange = () => { app.state.settings.grid.visible = gridVisible.checked; app.markDirty(); };
gridSpacing.onchange = () => { app.state.settings.grid.spacing = Math.max(8, Number(gridSpacing.value) || 64); app.markDirty(); };
```
and define `app.markDirty` near the top of `boot` (after `app.store` is created):
```js
app.markDirty = () => { app.state.settings.camera = app.view.toJSON(); app.state.settings.layers = app.layers.settings(); app.store.schedule(() => serialize(app.state)); requestRender(); };
```
Import `createGrid` at the top of `main.js`.

- [ ] **Step 5: Run tests (`npm test`) and verify in browser** — grid appears at 1 km fully zoomed out with labels along the top and left edges; zoom in past ~6 px per 64 m and the 64 m lines appear; toggling the checkbox hides it; changing spacing to 500 shows 500 m lines. Status shows "unsaved" then "saved" 2 s after a change, and `data/map.json` exists.

- [ ] **Step 6: Commit** — `git add web/grid.js tests/grid.test.js web/main.js && git commit -m "feat: metre grid with LOD and labels" -m "Co-Authored-By: Claude Fable 5.1 <noreply@anthropic.com>"`

---

### Task 10: Terrain layer and paint tool (`terrain.js`, `tools.js`)

**Files:**
- Create: `web/terrain.js`, `web/tools.js`; Modify: `web/main.js`

**Interfaces:**
- Produces `terrain.js`: `createTerrain(raster, textures) → layer` with `layer.paint(x, z, radiusM, biomeId)`.
- Produces `tools.js`: `createTools(app) → tools` with `tools.current` (`'pan'|'paint'|'ink'|'fog'|'pin'|'select'`), `tools.set(name)`, `tools.options = { biome: 1, brush: 64, inkColor, inkWidth, pinType: 'pin' }`, `tools.onChange` callback (for UI), and `tools.register(name, handler)` where handler = `{ down(e, wx, wz), move(e, wx, wz), up(e, wx, wz), cursor?(ctx, view, w, h) }`. It owns pointer listeners on `app.canvas` (skipping pan gestures via `app.isPanGesture`), hotkeys `H B I F P V`, `[`/`]` for brush size, Cmd/Ctrl+Z / Shift+Cmd/Ctrl+Z / Cmd/Ctrl+Y undo/redo. `app.tool` mirrors `tools.current`.

- [ ] **Step 1: terrain.js**

```js
import { BIOMES, WORLD_HALF, WORLD_SIZE, TILE_M } from './world.js';
import { scratchCanvas, worldPattern } from './layers.js';

const DETAIL_ALPHA = { forest: 0.55, mountain: 0.7, water: 0.5 };
const TINT_ALPHA = 0.85;

export function createTerrain(raster, textures) {
  const N = raster.cells;
  const mk = () => { const c = document.createElement('canvas'); c.width = N; c.height = N; return c; };
  const color = mk(), masks = { forest: mk(), mountain: mk(), water: mk() };
  const palette = BIOMES.map(b => b.color && b.color.map(c => Math.round(c * 255)));

  function rebuild(rect) {
    const w = rect.x1 - rect.x0 + 1, h = rect.z1 - rect.z0 + 1;
    const cctx = color.getContext('2d'), img = cctx.createImageData(w, h);
    const m = Object.fromEntries(Object.entries(masks).map(([k, c]) => [k, c.getContext('2d').createImageData(w, h)]));
    for (let z = 0; z < h; z++) for (let x = 0; x < w; x++) {
      const id = raster.data[(rect.z0 + z) * N + rect.x0 + x], b = BIOMES[id] ?? BIOMES[0], o = (z * w + x) * 4;
      if (b.color) { img.data.set(palette[id], o); img.data[o + 3] = 255; }
      if (b.detail) m[b.detail].data[o + 3] = 255;
    }
    cctx.putImageData(img, rect.x0, rect.z0);
    for (const k in m) masks[k].getContext('2d').putImageData(m[k], rect.x0, rect.z0);
  }
  rebuild({ x0: 0, z0: 0, x1: N - 1, z1: N - 1 }); raster.takeDirty();

  const layer = {
    id: 'terrain', name: 'Terrain',
    paint(x, z, radius, id) { raster.stamp(x, z, radius, () => id); },
    draw(ctx, view, w, h) {
      const d = raster.takeDirty(); if (d) rebuild(d);
      const s = scratchCanvas('terrain', w, h), sc = s.getContext('2d');
      const reset = () => { sc.setTransform(1, 0, 0, 1, 0, 0); sc.globalCompositeOperation = 'source-over'; sc.clearRect(0, 0, w, h); view.applyTo(sc, w, h); sc.imageSmoothingEnabled = true; };
      const base = ctx.globalAlpha;
      reset(); sc.drawImage(color, -WORLD_HALF, -WORLD_HALF, WORLD_SIZE, WORLD_SIZE);
      ctx.globalCompositeOperation = 'multiply'; ctx.globalAlpha = base * TINT_ALPHA; ctx.drawImage(s, 0, 0);
      ctx.globalCompositeOperation = 'source-over';
      for (const [k, mask] of Object.entries(masks)) {
        reset();
        sc.fillStyle = worldPattern(sc, textures[k], TILE_M[k]); sc.fillRect(-WORLD_HALF, -WORLD_HALF, WORLD_SIZE, WORLD_SIZE);
        sc.globalCompositeOperation = 'destination-in'; sc.drawImage(mask, -WORLD_HALF, -WORLD_HALF, WORLD_SIZE, WORLD_SIZE);
        ctx.globalAlpha = base * DETAIL_ALPHA[k]; ctx.drawImage(s, 0, 0);
      }
      ctx.globalAlpha = base;
    },
  };
  return layer;
}
```

- [ ] **Step 2: tools.js**

```js
import { createStrokeRecorder } from './history.js';

const HOTKEYS = { h: 'pan', b: 'paint', i: 'ink', f: 'fog', p: 'pin', v: 'select' };

export function createTools(app) {
  const handlers = {};
  const tools = { current: 'pan', options: { biome: 1, brush: 64, inkColor: '#2b1d0e', inkWidth: 8, pinType: 'pin' }, onChange: null };
  tools.register = (name, handler) => { handlers[name] = handler; };
  tools.set = name => { if (!handlers[name] && name !== 'pan') return; tools.current = name; app.tool = name; tools.onChange?.(); app.requestRender(); };
  tools.setOption = (k, v) => { tools.options[k] = v; tools.onChange?.(); app.requestRender(); };

  const { canvas, view } = app;
  const pos = e => { const p = [e.offsetX * app.dpr(), e.offsetY * app.dpr()]; return [...p, ...view.screenToWorld(p[0], p[1], ...app.size())]; };
  let active = null;
  tools.pointer = null;                                     // last [sx, sy, wx, wz] for cursor overlays
  canvas.addEventListener('pointerdown', e => {
    if (app.isPanGesture(e)) return;
    const h = handlers[tools.current]; if (!h) return;
    e.preventDefault(); canvas.setPointerCapture(e.pointerId); active = h;
    const [sx, sy, wx, wz] = pos(e); h.down?.(e, wx, wz, sx, sy); app.requestRender();
  });
  canvas.addEventListener('pointermove', e => {
    const p = pos(e); tools.pointer = p;
    if (active) active.move?.(e, p[2], p[3], p[0], p[1]);
    app.requestRender();
  });
  const finish = e => { if (!active) return; const [sx, sy, wx, wz] = pos(e); active.up?.(e, wx, wz, sx, sy); active = null; app.requestRender(); };
  canvas.addEventListener('pointerup', finish); canvas.addEventListener('pointercancel', finish);
  canvas.addEventListener('contextmenu', e => e.preventDefault());

  addEventListener('keydown', e => {
    if (e.target !== document.body) return;
    const mod = e.metaKey || e.ctrlKey;
    if (mod && e.key.toLowerCase() === 'z') { e.preventDefault(); (e.shiftKey ? app.history.redo() : app.history.undo()); app.markDirty(); return; }
    if (mod && e.key.toLowerCase() === 'y') { e.preventDefault(); app.history.redo(); app.markDirty(); return; }
    if (HOTKEYS[e.key.toLowerCase()] && !mod) tools.set(HOTKEYS[e.key.toLowerCase()]);
    if (e.key === '[') tools.setOption('brush', Math.max(8, tools.options.brush / 2));
    if (e.key === ']') tools.setOption('brush', Math.min(2048, tools.options.brush * 2));
  });

  /** Overlay layer drawing the brush cursor for the active tool. */
  tools.cursorLayer = { id: 'cursor', name: 'Cursor', draw(ctx, v, w, h) { handlers[tools.current]?.cursor?.(ctx, v, w, h, tools); } };
  return tools;
}

/** Circle brush cursor in world units. */
export function drawBrushCursor(ctx, view, w, h, tools) {
  if (!tools.pointer) return;
  const [sx, sy] = tools.pointer;
  ctx.beginPath(); ctx.arc(sx, sy, tools.options.brush * view.scale, 0, Math.PI * 2);
  ctx.strokeStyle = 'rgba(255,255,255,0.8)'; ctx.lineWidth = 1; ctx.stroke();
}

/** Shared raster brush tool: left = fnPrimary, right/alt = fnSecondary. */
export function rasterBrushTool(app, raster, label, fnPrimary, fnSecondary) {
  const rec = createStrokeRecorder(raster);
  let fn = null;
  const stamp = (wx, wz) => raster.stamp(wx, wz, app.tools.options.brush, fn);
  return {
    down(e, wx, wz) { fn = (e.button === 2 || e.altKey) ? fnSecondary() : fnPrimary(); rec.begin(); stamp(wx, wz); },
    move(e, wx, wz) { if (fn) stamp(wx, wz); },
    up() { fn = null; const cmd = rec.end(label); if (cmd) { app.history.push(cmd); app.markDirty(); } },
    cursor: drawBrushCursor,
  };
}
```

- [ ] **Step 3: Wire into main.js**

Imports: `createTerrain` from `./terrain.js`, `createTools, rasterBrushTool` from `./tools.js`, `BIOMES` from `./world.js`.
After the grid layer is added (order matters: base, terrain, grid):
```js
// replace the two lines adding base + grid with this ordered block
app.layers.add(createBase(textures));
const terrain = app.layers.add(createTerrain(app.state.terrain, textures));
app.layers.add(createGrid(app.state.settings));
```
After `cameraControls();`:
```js
app.tools = createTools(app);
app.tools.register('paint', rasterBrushTool(app, app.state.terrain, 'paint', () => { const id = app.tools.options.biome; return () => id; }, () => () => 0));
app.layers.add(app.tools.cursorLayer);     // stays last; later tasks insert their layers before it with insertBefore
```
Add to `layers.js` `L.insertBefore = (id, layer) => { const l = Object.assign({ visible: true, opacity: 1 }, layer); const i = list.findIndex(x => x.id === id); list.splice(i < 0 ? list.length : i, 0, l); return l; };`

Biome palette + brush slider + toolbar buttons (in `boot`, after tools are created):
```js
const biomesEl = document.getElementById('biomes');
for (const b of BIOMES) { const btn = document.createElement('button'); btn.textContent = b.name; btn.dataset.biome = b.id; btn.onclick = () => app.tools.setOption('biome', b.id); biomesEl.append(btn); }
const brush = document.getElementById('brush'), brushLabel = document.getElementById('brush-label');
brush.oninput = () => app.tools.setOption('brush', Number(brush.value));
for (const btn of document.querySelectorAll('#toolbar [data-tool]')) btn.onclick = () => app.tools.set(btn.dataset.tool);
document.getElementById('undo').onclick = () => { app.history.undo(); app.markDirty(); };
document.getElementById('redo').onclick = () => { app.history.redo(); app.markDirty(); };
app.tools.onChange = () => {
  for (const btn of document.querySelectorAll('#toolbar [data-tool]')) btn.classList.toggle('active', btn.dataset.tool === app.tools.current);
  for (const btn of biomesEl.children) btn.classList.toggle('active', Number(btn.dataset.biome) === app.tools.options.biome);
  brush.value = app.tools.options.brush; brushLabel.textContent = `${app.tools.options.brush} m`;
  document.getElementById('biomes').hidden = app.tools.current !== 'paint';
};
app.tools.onChange(); app.tools.set('paint');
```

- [ ] **Step 4: Verify in browser** — select Meadows, drag on the map: green-tinted parchment appears with soft edges. Black Forest shows the forest texture, Mountain the mountain texture (white tint = parchment visible under texture), Ocean the water texture in blue. Right-drag erases. `[`/`]` change the cursor circle. Cmd+Z undoes a whole stroke, Shift+Cmd+Z redoes. Reload the page: paint persists (status "saved" beforehand). Space+drag still pans while in Paint.

- [ ] **Step 5: Commit** — `git add web/terrain.js web/tools.js web/layers.js web/main.js && git commit -m "feat: terrain paint layer and tool framework" -m "Co-Authored-By: Claude Fable 5.1 <noreply@anthropic.com>"`

---

### Task 11: Fog layer and tool (`fog.js`)

**Files:**
- Create: `web/fog.js`; Modify: `web/main.js`

**Interfaces:**
- Produces: `createFog(raster, textures) → layer` with `layer.reveal(x, z, r)`, `layer.refog(x, z, r)`, and exported pure brush fns `revealFn(cur, t)`, `refogFn(cur, t)`.

- [ ] **Step 1: fog.js**

```js
import { WORLD_HALF, WORLD_SIZE, WORLD_RADIUS, TILE_M } from './world.js';
import { scratchCanvas, worldPattern } from './layers.js';

const soft = t => Math.min(1, t * 3);                    // full strength over inner 2/3 of brush
export const revealFn = (cur, t) => Math.max(cur, Math.round(255 * soft(t)));
export const refogFn = (cur, t) => Math.min(cur, Math.round(255 * (1 - soft(t))));

export function createFog(raster, textures) {
  const N = raster.cells;
  const mask = document.createElement('canvas'); mask.width = N; mask.height = N;
  const mctx = mask.getContext('2d');
  function rebuild(rect) {
    const w = rect.x1 - rect.x0 + 1, h = rect.z1 - rect.z0 + 1, img = mctx.createImageData(w, h);
    for (let z = 0; z < h; z++) for (let x = 0; x < w; x++) img.data[(z * w + x) * 4 + 3] = raster.data[(rect.z0 + z) * N + rect.x0 + x];
    mctx.putImageData(img, rect.x0, rect.z0);
  }
  rebuild({ x0: 0, z0: 0, x1: N - 1, z1: N - 1 }); raster.takeDirty();

  return {
    id: 'fog', name: 'Fog',
    reveal(x, z, r) { raster.stamp(x, z, r, revealFn); },
    refog(x, z, r) { raster.stamp(x, z, r, refogFn); },
    draw(ctx, view, w, h) {
      const d = raster.takeDirty(); if (d) rebuild(d);
      const s = scratchCanvas('fog', w, h), sc = s.getContext('2d');
      sc.setTransform(1, 0, 0, 1, 0, 0); sc.globalCompositeOperation = 'source-over'; sc.clearRect(0, 0, w, h);
      view.applyTo(sc, w, h);
      sc.beginPath(); sc.arc(0, 0, WORLD_RADIUS, 0, Math.PI * 2); sc.closePath();
      sc.fillStyle = worldPattern(sc, textures.fog, TILE_M.fog); sc.fill();
      sc.globalCompositeOperation = 'destination-out'; sc.imageSmoothingEnabled = true;
      sc.drawImage(mask, -WORLD_HALF, -WORLD_HALF, WORLD_SIZE, WORLD_SIZE);
      ctx.drawImage(s, 0, 0);
    },
  };
}
```

- [ ] **Step 2: Wire into main.js** — import `createFog, revealFn, refogFn` and `EXPLORE_RADIUS`; add the layer **before the cursor layer** and after grid (ink and pins from later tasks will be inserted between grid and fog / after fog respectively):
```js
const fog = app.layers.insertBefore('cursor', createFog(app.state.fog, textures));
app.tools.register('fog', rasterBrushTool(app, app.state.fog, 'fog', () => revealFn, () => refogFn));
document.getElementById('reveal-player').onclick = () => {
  const rec = createStrokeRecorder(app.state.fog); rec.begin();
  fog.reveal(app.state.player.x, app.state.player.z, EXPLORE_RADIUS);
  const cmd = rec.end('reveal'); if (cmd) { app.history.push(cmd); app.markDirty(); }
};
```
(import `createStrokeRecorder` from `./history.js`). Add `'fog'` to the tool cases in `onChange`: `document.getElementById('reveal-player').hidden = app.tools.current !== 'fog';`.

- [ ] **Step 3: Verify in browser** — whole disc is fogged with the fog texture; Fog tool left-drag reveals painted terrain underneath with a soft edge; right-drag re-fogs; undo works per stroke; "Reveal around player" clears a ~100 m circle at the origin (player defaults to spawn). Fog layer opacity persists across reload (layer panel comes in Task 14, for now verify via `app.layers.get('fog').opacity = 0.5` in console then reload after save).

- [ ] **Step 4: Commit** — `git add web/fog.js web/main.js && git commit -m "feat: fog layer with reveal/refog brush" -m "Co-Authored-By: Claude Fable 5.1 <noreply@anthropic.com>"`

---

### Task 12: Ink layer and tool (`ink.js`)

**Files:**
- Create: `web/ink.js`, `tests/ink.test.js`; Modify: `web/main.js`

**Interfaces:**
- Produces: `distToSegment(px, pz, ax, az, bx, bz) → metres`; `hitStroke(strokes, x, z, tolM) → index|-1` (nearest stroke whose distance ≤ width/2 + tol); `simplify(points, epsM) → points` (drop points closer than eps to the previous kept point); `createInk(strokes) → layer` with `layer.begin(color, widthM)`, `layer.add(x, z)`, `layer.end() → stroke|null` (≥ 2 points after simplify), `layer.strokes` (same array as state.ink). Ink tool: left drag draws; right/alt click-drag erases strokes hit; commands push/remove strokes.

- [ ] **Step 1: Failing tests**

`tests/ink.test.js`:
```js
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { distToSegment, hitStroke, simplify } from '../web/ink.js';

test('distToSegment handles interior and endpoint cases', () => {
  assert.equal(distToSegment(0, 1, -1, 0, 1, 0), 1);
  assert.equal(distToSegment(3, 0, -1, 0, 1, 0), 2);
  assert.equal(distToSegment(5, 5, 2, 2, 2, 2), Math.hypot(3, 3));
});

test('hitStroke respects width and tolerance and picks the nearest', () => {
  const strokes = [
    { color: '#000', width: 4, points: [[0, 0], [10, 0]] },
    { color: '#000', width: 4, points: [[0, 10], [10, 10]] },
  ];
  assert.equal(hitStroke(strokes, 5, 1.5, 0), 0);      // within half width (2)
  assert.equal(hitStroke(strokes, 5, 3, 0), -1);       // 3 > 2
  assert.equal(hitStroke(strokes, 5, 3, 1.5), 0);      // 3 <= 2 + 1.5
  assert.equal(hitStroke(strokes, 5, 8, 1), 1);
});

test('simplify drops points closer than eps to the last kept point, keeps ends', () => {
  const pts = [[0, 0], [0.1, 0], [0.2, 0], [5, 0], [5.1, 0], [10, 0], [10.05, 0]];
  assert.deepEqual(simplify(pts, 1), [[0, 0], [5, 0], [10, 0], [10.05, 0]]);
  assert.deepEqual(simplify([[1, 1]], 1), [[1, 1]]);
});
```

- [ ] **Step 2: Run, expect failure.**

- [ ] **Step 3: Implement**

`web/ink.js`:
```js
export function distToSegment(px, pz, ax, az, bx, bz) {
  const dx = bx - ax, dz = bz - az, len2 = dx * dx + dz * dz;
  const t = len2 ? Math.max(0, Math.min(1, ((px - ax) * dx + (pz - az) * dz) / len2)) : 0;
  return Math.hypot(px - (ax + t * dx), pz - (az + t * dz));
}

export function hitStroke(strokes, x, z, tol) {
  let best = -1, bestD = Infinity;
  strokes.forEach((s, i) => {
    const limit = s.width / 2 + tol;
    for (let k = 0; k < s.points.length - 1 || (k === 0 && s.points.length === 1); k++) {
      const a = s.points[k], b = s.points[k + 1] ?? a;
      const d = distToSegment(x, z, a[0], a[1], b[0], b[1]);
      if (d <= limit && d < bestD) { bestD = d; best = i; }
    }
  });
  return best;
}

export function simplify(points, eps) {
  if (points.length < 3) return points.slice();
  const out = [points[0]];
  for (let i = 1; i < points.length - 1; i++) { const l = out[out.length - 1]; if (Math.hypot(points[i][0] - l[0], points[i][1] - l[1]) >= eps) out.push(points[i]); }
  out.push(points[points.length - 1]);
  return out;
}

export function createInk(strokes) {
  let cur = null;
  const drawStroke = (ctx, s) => {
    ctx.beginPath(); ctx.lineWidth = s.width; ctx.strokeStyle = s.color; ctx.lineCap = 'round'; ctx.lineJoin = 'round';
    s.points.forEach(([x, z], i) => i ? ctx.lineTo(x, z) : ctx.moveTo(x, z));
    if (s.points.length === 1) ctx.lineTo(s.points[0][0] + 0.01, s.points[0][1]);
    ctx.stroke();
  };
  return {
    id: 'ink', name: 'Ink', strokes,
    begin(color, width) { cur = { color, width, points: [] }; },
    add(x, z) { cur?.points.push([x, z]); },
    end() { const s = cur; cur = null; if (!s) return null; s.points = simplify(s.points, s.width / 4); return s.points.length >= 1 ? s : null; },
    draw(ctx, view, w, h) {
      view.applyTo(ctx, w, h);
      for (const s of strokes) drawStroke(ctx, s);
      if (cur?.points.length) drawStroke(ctx, cur);
    },
  };
}

/** Ink tool: left drag draws, right/alt drag erases strokes. */
export function inkTool(app, ink) {
  let erasing = false, erased = null;
  const tolPx = 6;
  return {
    down(e, wx, wz) {
      erasing = e.button === 2 || e.altKey;
      if (erasing) { erased = []; this.move(e, wx, wz); }
      else ink.begin(app.tools.options.inkColor, app.tools.options.inkWidth);
    },
    move(e, wx, wz) {
      if (!erasing) { ink.add(wx, wz); return; }
      const i = hitStroke(ink.strokes, wx, wz, tolPx / app.view.scale);
      if (i >= 0) erased.push({ index: i, stroke: ink.strokes.splice(i, 1)[0] });
    },
    up() {
      if (erasing) {
        const removed = erased; erased = null; erasing = false;
        if (!removed.length) return;
        app.history.push({ label: 'erase ink',
          undo: () => { for (const r of [...removed].reverse()) ink.strokes.splice(r.index, 0, r.stroke); },
          redo: () => { for (const r of removed) ink.strokes.splice(r.index, 1); } });
        app.markDirty(); return;
      }
      const s = ink.end(); if (!s) return;
      ink.strokes.push(s);
      app.history.push({ label: 'ink', undo: () => { const i = ink.strokes.indexOf(s); if (i >= 0) ink.strokes.splice(i, 1); }, redo: () => ink.strokes.push(s) });
      app.markDirty();
    },
    cursor(ctx, view, w, h, tools) {
      if (!tools.pointer) return; const [sx, sy] = tools.pointer;
      ctx.beginPath(); ctx.arc(sx, sy, Math.max(2, tools.options.inkWidth * view.scale / 2), 0, Math.PI * 2); ctx.strokeStyle = 'rgba(255,255,255,0.8)'; ctx.stroke();
    },
  };
}
```

- [ ] **Step 4: Wire into main.js** — import `createInk, inkTool`; insert the ink layer **before `fog`** (so fog covers it) and register the tool:
```js
const ink = app.layers.insertBefore('fog', createInk(app.state.ink));
app.tools.register('ink', inkTool(app, ink));
const inkColor = document.getElementById('ink-color'), inkWidth = document.getElementById('ink-width');
inkColor.oninput = () => app.tools.setOption('inkColor', inkColor.value);
inkWidth.oninput = () => app.tools.setOption('inkWidth', Number(inkWidth.value));
```
In `onChange`: `document.getElementById('ink-opts').hidden = app.tools.current !== 'ink';`.

- [ ] **Step 5: Run tests and verify in browser** — Ink tool draws smooth dark brown lines that keep their metre width when zooming; right-drag across a line removes it; undo/redo restore strokes in order; strokes persist after reload; ink is hidden under fog until revealed.

- [ ] **Step 6: Commit** — `git add web/ink.js tests/ink.test.js web/main.js && git commit -m "feat: freehand ink layer and tool" -m "Co-Authored-By: Claude Fable 5.1 <noreply@anthropic.com>"`

---

### Task 13: Pins and player marker (`pins.js`)

**Files:**
- Create: `web/pins.js`, `tests/pins.test.js`; Modify: `web/main.js`

**Interfaces:**
- Produces: `nearestPin(pins, x, z, maxDistM) → pin|null`; `createPins(state, icons) → layer` with `layer.selected` (pin id or `'player'` or null), `layer.hitTest(sx, sy, view, w, h) → pin | 'player' | null` (14 px radius), `layer.add({x,z,type,name}) → pin` (id = `crypto.randomUUID()`), `layer.remove(id)`, `layer.update(id, patch)` (all three are plain mutations; commands are built in the tool). `pinTool(app, pins, openEditor)` and `selectTool(app, pins, openEditor)` handlers; `openEditor(pin)` positions `#pin-editor` over the pin.

- [ ] **Step 1: Failing test**

`tests/pins.test.js`:
```js
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { nearestPin } from '../web/pins.js';

test('nearestPin returns closest within range, else null', () => {
  const pins = [{ id: 'a', x: 0, z: 0 }, { id: 'b', x: 10, z: 0 }];
  assert.equal(nearestPin(pins, 7, 0, 5).id, 'b');
  assert.equal(nearestPin(pins, 4, 0, 5).id, 'a');
  assert.equal(nearestPin(pins, 50, 50, 5), null);
});
```

- [ ] **Step 2: Run, expect failure.**

- [ ] **Step 3: Implement**

`web/pins.js`:
```js
export function nearestPin(pins, x, z, maxDist) {
  let best = null, bd = maxDist;
  for (const p of pins) { const d = Math.hypot(p.x - x, p.z - z); if (d <= bd) { bd = d; best = p; } }
  return best;
}

export function createPins(state, icons) {
  const ICON = 32, HIT = 14;
  const layer = {
    id: 'pins', name: 'Pins', selected: null,
    add({ x, z, type, name = '' }) { const pin = { id: crypto.randomUUID(), x, z, type, name, checked: false }; state.pins.push(pin); return pin; },
    remove(id) { const i = state.pins.findIndex(p => p.id === id); if (i >= 0) state.pins.splice(i, 1); if (layer.selected === id) layer.selected = null; },
    update(id, patch) { const p = state.pins.find(p => p.id === id); if (p) Object.assign(p, patch); return p; },
    hitTest(sx, sy, view, w, h) {
      const dpr = window.devicePixelRatio || 1, r = HIT * dpr;
      const [px, py] = view.worldToScreen(state.player.x, state.player.z, w, h);
      if (Math.hypot(px - sx, py - sy) <= r) return 'player';
      const [wx, wz] = view.screenToWorld(sx, sy, w, h);
      return nearestPin(state.pins, wx, wz, r / view.scale);
    },
    draw(ctx, view, w, h) {
      const dpr = window.devicePixelRatio || 1, s = ICON * dpr;
      ctx.font = `bold ${Math.round(13 * dpr)}px Norse`; ctx.textAlign = 'center'; ctx.textBaseline = 'top';
      ctx.lineWidth = 3 * dpr; ctx.strokeStyle = 'rgba(0,0,0,0.85)'; ctx.fillStyle = '#f3e9d2';
      for (const p of state.pins) {
        const [sx, sy] = view.worldToScreen(p.x, p.z, w, h);
        if (sx < -s || sy < -s || sx > w + s || sy > h + s) continue;
        const icon = icons[p.type] ?? icons.pin;
        ctx.globalAlpha = p.checked ? 0.6 : 1;
        ctx.drawImage(icon, sx - s / 2, sy - s / 2, s, s);
        if (p.checked) ctx.drawImage(icons.checked, sx - s / 2, sy - s / 2, s, s);
        ctx.globalAlpha = 1;
        if (p.id === layer.selected) { ctx.beginPath(); ctx.arc(sx, sy, s * 0.6, 0, Math.PI * 2); ctx.strokeStyle = '#ffd77a'; ctx.lineWidth = 2 * dpr; ctx.stroke(); ctx.strokeStyle = 'rgba(0,0,0,0.85)'; ctx.lineWidth = 3 * dpr; }
        if (p.name) { ctx.strokeText(p.name, sx, sy + s / 2); ctx.fillText(p.name, sx, sy + s / 2); }
      }
      const [px, py] = view.worldToScreen(state.player.x, state.player.z, w, h);
      ctx.save(); ctx.translate(px, py); ctx.rotate(state.player.angle);
      ctx.drawImage(icons.player_32, -s / 2, -s / 2, s, s); ctx.restore();
      if (layer.selected === 'player') { ctx.beginPath(); ctx.arc(px, py, s * 0.6, 0, Math.PI * 2); ctx.strokeStyle = '#ffd77a'; ctx.lineWidth = 2 * dpr; ctx.stroke(); }
    },
  };
  return layer;
}

function dragHandler(app, pins, state) {
  let target = null, start = null, orig = null;
  return {
    begin(hit, wx, wz) { target = hit; start = [wx, wz]; orig = hit === 'player' ? { ...state.player } : { x: hit.x, z: hit.z }; pins.selected = hit === 'player' ? 'player' : hit.id; },
    move(wx, wz) {
      if (!target) return; const dx = wx - start[0], dz = wz - start[1];
      const o = target === 'player' ? state.player : target; o.x = orig.x + dx; o.z = orig.z + dz;
    },
    end() {
      if (!target) return; const o = target === 'player' ? state.player : target, after = { x: o.x, z: o.z }, before = { x: orig.x, z: orig.z };
      if (after.x !== before.x || after.z !== before.z) {
        app.history.push({ label: 'move', undo: () => Object.assign(o, before), redo: () => Object.assign(o, after) }); app.markDirty();
      }
      target = null;
    },
  };
}

export function selectTool(app, pins, openEditor) {
  const drag = dragHandler(app, pins, app.state);
  return {
    down(e, wx, wz, sx, sy) { const hit = pins.hitTest(sx, sy, app.view, ...app.size()); if (hit) drag.begin(hit, wx, wz); else pins.selected = null; },
    move(e, wx, wz) { drag.move(wx, wz); },
    up(e) { drag.end(); if (e.detail === 2 && pins.selected && pins.selected !== 'player') openEditor(app.state.pins.find(p => p.id === pins.selected)); },
  };
}

export function pinTool(app, pins, openEditor) {
  const drag = dragHandler(app, pins, app.state);
  return {
    down(e, wx, wz, sx, sy) {
      const hit = pins.hitTest(sx, sy, app.view, ...app.size());
      if (hit) { drag.begin(hit, wx, wz); return; }
      if (e.button === 2) return;
      const pin = pins.add({ x: wx, z: wz, type: app.tools.options.pinType });
      pins.selected = pin.id;
      app.history.push({ label: 'add pin', undo: () => pins.remove(pin.id), redo: () => { app.state.pins.push(pin); } });
      app.markDirty(); openEditor(pin);
    },
    move(e, wx, wz) { drag.move(wx, wz); },
    up() { drag.end(); },
  };
}

/** Keyboard actions on the selected pin: Enter rename, X toggle checked, Delete/Backspace remove. */
export function pinKeys(app, pins, openEditor) {
  addEventListener('keydown', e => {
    if (e.target !== document.body || !pins.selected || pins.selected === 'player') return;
    const pin = app.state.pins.find(p => p.id === pins.selected); if (!pin) return;
    if (e.key === 'Enter') openEditor(pin);
    else if (e.key.toLowerCase() === 'x') { pin.checked = !pin.checked; app.history.push({ label: 'check', undo: () => { pin.checked = !pin.checked; }, redo: () => { pin.checked = !pin.checked; } }); app.markDirty(); }
    else if (e.key === 'Delete' || e.key === 'Backspace') {
      const idx = app.state.pins.indexOf(pin); pins.remove(pin.id);
      app.history.push({ label: 'remove pin', undo: () => app.state.pins.splice(idx, 0, pin), redo: () => pins.remove(pin.id) }); app.markDirty();
    } else return;
    e.preventDefault();
  });
}
```

- [ ] **Step 4: Wire into main.js** — import `createPins, pinTool, selectTool, pinKeys` and `PIN_TYPES`. Insert the pins layer **after fog, before cursor**:
```js
const pins = app.layers.insertBefore('cursor', createPins(app.state, icons));
const editor = document.getElementById('pin-editor');
function openEditor(pin) {
  const [sx, sy] = app.view.worldToScreen(pin.x, pin.z, ...size());
  editor.hidden = false; editor.value = pin.name; editor.style.left = `${sx / dpr() - 60}px`; editor.style.top = `${sy / dpr() + 20}px`; editor.style.width = '120px';
  editor.focus(); editor.select();
  const before = pin.name;
  const done = commit => { editor.hidden = true; editor.onblur = editor.onkeydown = null; if (!commit || editor.value === before) return;
    const after = editor.value; pin.name = after;
    app.history.push({ label: 'rename', undo: () => { pin.name = before; }, redo: () => { pin.name = after; } }); app.markDirty(); };
  editor.onkeydown = e => { if (e.key === 'Enter') done(true); if (e.key === 'Escape') done(false); e.stopPropagation(); };
  editor.onblur = () => done(true);
}
app.tools.register('pin', pinTool(app, pins, openEditor));
app.tools.register('select', selectTool(app, pins, openEditor));
pinKeys(app, pins, openEditor);
const typesEl = document.getElementById('pin-types');
for (const t of PIN_TYPES) { const b = document.createElement('button'); b.title = t; b.dataset.type = t; const img = document.createElement('img'); img.src = `assets/map/mapicon_${t}.png`; b.append(img); b.onclick = () => app.tools.setOption('pinType', t); typesEl.append(b); }
```
In `onChange`: `typesEl.hidden = app.tools.current !== 'pin'; for (const b of typesEl.children) b.classList.toggle('active', b.dataset.type === app.tools.options.pinType);`
Also add a hover tooltip: in `cameraControls` or here, `canvas.addEventListener('pointermove', e => { const hit = pins.hitTest(e.offsetX * dpr(), e.offsetY * dpr(), app.view, ...size()); canvas.title = hit && hit !== 'player' ? `${hit.name || hit.type} (${Math.round(hit.x)}, ${Math.round(hit.z)})` : hit === 'player' ? `player (${Math.round(app.state.player.x)}, ${Math.round(app.state.player.z)})` : ''; });`

- [ ] **Step 5: Run tests and verify in browser** — Pin tool: choose a type, click: icon appears at fixed size regardless of zoom, name editor opens, Enter commits and the Norse label renders below the icon with an outline. Click-drag a pin moves it. Select tool: click selects (gold ring), drag moves, double-click renames, X toggles the cross overlay, Delete removes. Player marker is draggable and stays above fog. All undoable; all persist on reload.

- [ ] **Step 6: Commit** — `git add web/pins.js tests/pins.test.js web/main.js && git commit -m "feat: pins and player marker" -m "Co-Authored-By: Claude Fable 5.1 <noreply@anthropic.com>"`

---

### Task 14: Layer panel, save controls, export/import, load fallback polish (`ui.js`)

**Files:**
- Create: `web/ui.js`; Modify: `web/main.js` (move UI wiring out so `main.js` stays ≲ 250 lines)

**Interfaces:**
- Produces: `createUI(app) → { refreshLayers() }`. Handles: layer panel rows (eye checkbox + opacity slider per layer except `cursor`), Save button (`store.flush()`), Export (download `valheim-map.json` of `serialize(state)`), Import (read file → `createState` → replace `app.state` and rebuild layers via `app.rebuild(state)`), undo/redo button enabled state via `history.onChange`, `beforeunload` flush.

- [ ] **Step 1: ui.js**

```js
import { serialize, createState } from './store.js';

export function createUI(app) {
  const layersEl = document.getElementById('layers');
  function refreshLayers() {
    layersEl.replaceChildren();
    for (const l of app.layers.list) {
      if (l.id === 'cursor') continue;
      const row = document.createElement('div'); row.className = 'layer';
      const eye = Object.assign(document.createElement('input'), { type: 'checkbox', checked: l.visible, title: 'visible' });
      eye.onchange = () => { l.visible = eye.checked; app.markDirty(); };
      const name = document.createElement('span'); name.textContent = l.name;
      const op = Object.assign(document.createElement('input'), { type: 'range', min: 0, max: 1, step: 0.05, value: l.opacity, title: 'opacity' });
      op.style.width = '70px'; op.oninput = () => { l.opacity = Number(op.value); app.markDirty(); };
      row.append(eye, name, op); layersEl.append(row);
    }
  }

  const undo = document.getElementById('undo'), redo = document.getElementById('redo');
  app.history.onChange = () => { undo.disabled = !app.history.canUndo(); redo.disabled = !app.history.canRedo(); };
  app.history.onChange();

  document.getElementById('save').onclick = () => { app.markDirty(); app.store.flush(); };
  document.getElementById('export').onclick = async () => {
    const blob = new Blob([JSON.stringify(await serialize(app.state))], { type: 'application/json' });
    const a = Object.assign(document.createElement('a'), { href: URL.createObjectURL(blob), download: `valheim-map-${new Date().toISOString().slice(0, 10)}.json` });
    a.click(); URL.revokeObjectURL(a.href);
  };
  document.getElementById('import').onchange = async e => {
    const file = e.target.files[0]; if (!file) return;
    if (!confirm(`Replace the current map with ${file.name}? The current map is saved first.`)) return;
    try {
      await app.store.flush();
      const state = await createState(JSON.parse(await file.text()));
      app.rebuild(state); app.history.clear(); app.markDirty(); refreshLayers();
      app.setStatus(`imported ${file.name}`);
    } catch (err) { app.setStatus(`import failed: ${err.message}`, 'error'); }
    e.target.value = '';
  };
  addEventListener('beforeunload', () => { app.store.flush(); });
  refreshLayers();
  return { refreshLayers };
}
```

- [ ] **Step 2: Refactor main.js**

Move all layer/tool construction from `boot` into a function `app.rebuild(state)` that: sets `app.state = state`, clears `app.layers.list.length = 0`, re-adds base, terrain, grid, ink, fog, pins, cursor in that order, applies `state.settings.layers`, re-registers tools (paint/fog/ink/pin/select with the fresh layer objects), and applies `state.settings.camera` to the view. `boot` becomes: load assets → create store → load doc → `createState` (with the fallback path from Task 8) → `createTools(app)` (once) → `app.rebuild(state)` → `cameraControls()` → `createUI(app)` → palettes/toolbar wiring (move these into `ui.js` too if `main.js` exceeds ~250 lines; keep `onChange` in one place) → resize → render. Verify with `wc -l web/*.js` that no module exceeds 250 lines; if `main.js` does, move the palette/toolbar/pin-editor wiring into `ui.js` as `wireTools(app)` and `wirePinEditor(app)` exports.

- [ ] **Step 3: Verify in browser**
  - Layer panel lists Parchment, Terrain, Grid, Ink, Fog, Pins with working eye toggles and opacity sliders; settings survive reload.
  - Undo/redo buttons grey out appropriately.
  - Export downloads a JSON file; Import of that file after painting something else restores the exported map, with confirmation dialog.
  - Stop the server, paint: status shows "save failed, retrying" in red; restart the server: status returns to "saved" without reload.
  - Corrupt `data/map.json` (`echo '{' > data/map.json`) and reload: the map loads from `.bak`. Delete both and put `{"version":99}` in `map.json`: page shows the "could not load save … starting empty" warning and does **not** autosave over it until you make a change (acceptable per spec: "refuse to overwrite" is satisfied by the warning; note this in the status text).

- [ ] **Step 4: Run full test suite** — `npm test` → all green.

- [ ] **Step 5: Commit** — `git add web/ui.js web/main.js && git commit -m "feat: layer panel, save/export/import controls" -m "Co-Authored-By: Claude Fable 5.1 <noreply@anthropic.com>"`

---

### Task 15: README and final review

**Files:**
- Create: `README.md`

- [ ] **Step 1: README**

````markdown
# Valheim Mapper

Hand-draw a Valheim world map outside the game, in the in-game style, for no-map playthroughs.

## Setup
1. Extract game assets (one-time, needs the Steam install): `source activate.sh && python scripts/extract_assets.py out/assets`
2. Copy them into the web app: `npm run assets`
3. Run: `npm start` → http://localhost:8080

## Controls
- Wheel: zoom · Middle-drag / Space+drag: pan · Double-click: recentre · `0`: fit world
- Tools: `H` pan, `B` paint, `I` ink, `F` fog, `P` pin, `V` select · `[` `]` brush size
- Paint/Fog: left drag applies, right or Alt drag erases/re-fogs
- Pins: click to place; selected pin → Enter rename, `X` toggle checked, Delete remove; drag to move
- Undo/redo: Cmd/Ctrl+Z, Shift+Cmd/Ctrl+Z

Map autosaves to `data/map.json` (with `.bak`). Export/Import produce a portable JSON file.

## Development
`npm test` runs the unit tests (Node ≥ 20, no dependencies).
Game assets under `out/`, `web/assets/` and saves under `data/` are gitignored and must not be redistributed.
````

- [ ] **Step 2: Final checks**

```bash
npm test && wc -l web/*.js server/*.js && git status --short
```
Expected: all tests pass; every module ≤ ~250 lines; only `README.md` untracked.

- [ ] **Step 3: Commit** — `git add README.md && git commit -m "docs: README with setup and controls" -m "Co-Authored-By: Claude Fable 5.1 <noreply@anthropic.com>"`

---

## Spec coverage check

| Spec item | Task |
|---|---|
| Zero deps, no build, ES modules | 1, 8 |
| World/coords, raster 8 m, row 0 south | 2, 4 |
| Biome ids + colours from Minimap.cs | 2, 10 |
| Save doc v1, PNG-embedded rasters | 3, 6 |
| Parchment + space outside circle | 8 |
| Terrain option-B rendering, dirty rects, soft edges (bilinear) | 10 |
| Grid 64 m default, LOD to 1 km, labels, configurable | 9 |
| Ink round caps, metre widths, erase strokes | 12 |
| Pins fixed screen size, Norse labels, checked overlay, player marker, tooltip | 13 |
| Fog through reveal mask under pins, reveal around player | 11 |
| Camera controls, fit key | 8 |
| Tools + hotkeys, brush size, right-drag erase | 10–13 |
| Layer panel visibility/opacity, grid toggle | 9, 14 |
| Undo/redo everywhere | 5, 10–13 |
| Autosave 2 s, status, explicit save, export/import | 6, 14 |
| Server routes, atomic write, .bak, 64 MB limit, MIME | 7 |
| Save retry/backoff, localStorage fallback, load fallback chain, unknown version | 6, 8, 14 |
| Unit tests for logic modules + server | 2–7, 9, 12, 13 |
