# Valheim Mapper — Design

Date: 2026-09-21
Status: approved

## Purpose

A lightweight web application for hand-drawing a Valheim world map outside the game, for
no-map playthroughs, using the game's own map assets so it looks like the in-game map. First
version runs on localhost with a tiny server that persists the map to disk. A later version will
be hosted and shared (link or credentials) with live multi-user drawing; the design must not
block that, but it is out of scope here.

## Non-goals (v1)

- Reading world/save data or generating terrain from a seed.
- Multi-user sync, auth, ping/shout, death markers, cartography table, auto-explore.
- Faithful WebGL recreation of the in-game minimap shader (renderer is swappable later).
- Build tooling, frameworks, runtime dependencies.

## Constraints

- Node ≥ 20, zero npm dependencies. No build step; browser loads ES modules directly.
- Assets come from `out/assets/` (extracted with `scripts/extract_assets.py`) and are copied
  into `web/assets/`. Game textures/fonts are Iron Gate's; Averia fonts are SIL OFL. Not to be
  redistributed publicly.
- Each web module should stay under ~250 lines and expose one object with a small interface.

## Architecture

```
server/server.js   Node http server: static files, GET/PUT /api/map, atomic writes
web/index.html     shell: canvas, toolbar, layer panel, status
web/main.js        boot, wiring, render loop (redraw on change only)
web/view.js        camera: world<->screen, wheel zoom about cursor, pan, fit-to-world
web/layers.js      ordered layer stack, offscreen canvases, visibility/opacity, composite
web/terrain.js     biome paint layer: Uint8Array cells + Canvas 2D renderer
web/ink.js         freehand vector strokes
web/fog.js         reveal mask + fog texture
web/pins.js        pins + player marker: icons, hit test, drag, inline editor
web/grid.js        toggleable metre grid with LOD and labels
web/tools.js       tool state machine (pan/paint/ink/fog/pin/select), hotkeys, brush size
web/history.js     undo/redo command stack (memory only)
web/store.js       serialise/deserialise, autosave, /api/map client, localStorage fallback
web/assets/        textures, mapicon sprites, fonts
data/map.json      saved map (+ map.json.bak)
tests/             node:test unit tests for logic modules and server
```

## Coordinate system and data model

- World: 20,480 m square centred on spawn. Game circle radius is 10,000 m; area outside the
  circle renders as the "space" texture. Axes: x east, z north (as in game).
- **Terrain**: `Uint8Array` grid, 8 m/cell, 2560×2560. Biome ids: 0 none, 1 meadows,
  2 black forest, 3 swamp, 4 mountain, 5 plains, 6 mistlands, 7 ashlands, 8 deep north, 9 ocean.
- **Fog**: `Uint8Array` 2560×2560, 0 = fogged, 255 = fully revealed. Soft-edged brushes.
- **Ink**: array of strokes `{color, width (m), points: [[x,z],...]}`.
- **Pins**: array of `{id, x, z, type, name, checked}`. Types map to `mapicon_*` sprites.
- **Player**: `{x, z, angle}`.
- **Settings**: grid `{visible, spacing}`, layer visibility/opacity, last camera `{x, z, scale}`.
- **Save format**: one JSON document, version field, raster layers embedded as base64 PNG
  (terrain as indexed values in the R channel, fog as grayscale).

## Rendering (Canvas 2D, option B styling)

Per frame, bottom to top, in world coordinates under one camera transform:

1. Parchment: `background.png` tiled; `space.png` outside the world circle.
2. Terrain: offscreen canvas at cell resolution, dirty-rect updates. Each cell = parchment tile
   tinted with the biome colour from `Minimap.cs` (meadows 0.45,1,0.43; black forest 0,0.7,0;
   swamp 0.6,0.5,0.5; mountain 1,1,1; plains "heath" 1,1,0.2; mistlands 0.2,0.2,0.2;
   ashlands 1,0.2,0.2; deep north 1,1,1). Black forest/mistlands blend `forest.png`;
   mountain/deep north blend `mountain.png`; ocean uses `water.png` with the minimap
   material's water colours. One-cell soft edge blend between biomes.
3. Grid: 64 m lines by default (game zone size); when a cell is < ~6 screen px, switch to 1 km
   lines with signed-metre labels in Averia Serif. Spacing is user-configurable.
4. Ink: round caps/joins, width in metres so it scales with zoom.
5. Pins + player: drawn in screen space at fixed pixel size. Names in Norse Bold with dark
   outline. Checked pins show `mapicon_checked` overlay.
6. Fog: `fog_layer.png` drawn through the reveal mask, composited over layers 1–4 but under
   pins.

Zoom range: full world to ~0.5 m/px. Redraw only on change.

## Interaction

Always active: wheel zoom about cursor; middle-drag or space+left-drag pans; double-click
empty map recentres; key fits whole world.

Tools (toolbar + hotkey):
- **Paint (B)**: biome palette; brush radius in metres (slider, `[` `]`); left drag paints,
  right/alt drag erases to none; cursor shows brush circle.
- **Ink (I)**: colour + width; right drag erases whole strokes crossed.
- **Fog (F)**: left drag reveals, right drag re-fogs; "reveal around player" button clears a
  ~100 m circle at the player marker.
- **Pin (P)**: click places pin of selected type and opens inline name editor. Click selects:
  drag moves, Enter renames, X toggles checked, Delete removes. Hover tooltip: name + coords.
- **Select (V)**: move pins / player marker without painting.

Sidebar: per-layer eye toggle + opacity; grid toggle + spacing. Undo/redo (Cmd/Ctrl+Z,
Shift+Cmd/Ctrl+Z) covers every action on every layer.

Saving: autosave debounced 2 s after last change with a status indicator; explicit save;
export/import JSON file.

## Server

- `GET /api/map` → saved JSON or an empty map document.
- `PUT /api/map` → validate JSON, write to temp file, rename over `data/map.json`, keep prior
  as `map.json.bak`. Reject bodies over a configurable limit (default 64 MB).
- Static serving of `web/` with correct MIME types (js, png, ttf, otf, json, html, css).
- No auth in v1. Future: token/password middleware + websocket broadcast added alongside.

## Error handling

- Save failure: retry with backoff, red status indicator, keep working from memory and a
  localStorage copy.
- Load: corrupt `map.json` → try `.bak` → empty map with visible warning. Never a blank page.
- Unknown save version → refuse to overwrite; show message.

## Testing

- `node --test tests/`: view maths (round-trip world↔screen, zoom about point), history
  (undo/redo/coalescing), store (serialise↔deserialise round trip incl. PNG encode/decode via
  a pure-JS fallback), terrain/fog brush stamping (soft edge, bounds), pin hit testing, grid LOD
  choice, server atomic write + backup + fallback.
- Rendering verified manually in browser. Optional Playwright smoke test later.

## Future (out of scope, must not be blocked)

- Hosted deployment with link token or password.
- Websocket live sync (server broadcasts PUT deltas; client applies remote commands through
  the same command types used by history).
- WebGL renderer replacing `terrain.js` draw path using the extracted textures and the
  `mapshader` inputs.
