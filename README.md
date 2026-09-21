# Valheim Mapper

Hand-draw a Valheim world map outside the game, in the in-game style, for no-map playthroughs.

## Setup
1. Extract game assets (one-time, needs the Steam install): `source activate.sh && python scripts/extract_assets.py out/assets`
2. Copy them into the web app: `npm run assets`
3. Run: `npm start` → http://localhost:8080

## Controls
- Wheel: zoom · Middle-drag / Space+drag: pan · Double-click: recentre · `0`: fit world
- Tools: `H` pan, `B` paint, `I` ink, `P` pin, `V` select · `[` `]` brush size
- Paint: left drag paints the chosen biome, right or Alt drag erases. Painting and inking clear the fog where you draw. The **Fog** swatch in the palette re-fogs an area (right drag with it reveals).
- Ink: right or Alt drag across a line erases that stroke.
- Pins: click to place. A selected pin shows a popup to rename, check or delete it, and can be dragged; `X` and Delete also work as shortcuts
- Undo/redo: Cmd/Ctrl+Z, Shift+Cmd/Ctrl+Z

Map autosaves to `data/map.json` (with `.bak`). Export downloads a portable JSON copy.

## Rendering
Terrain (parchment, biomes, textures) and fog are drawn by a small WebGL renderer in `web/gl.js`: the 8 m biome raster and the fog raster live on the GPU as single-channel textures and one fragment shader composites them per frame, so panning stays smooth in every browser. Grid, ink and pins are plain Canvas 2D layers on top.

## Development
`npm test` runs the unit tests (Node ≥ 20, no dependencies).
Game assets under `out/`, `web/assets/` and saves under `data/` are gitignored and must not be redistributed.
