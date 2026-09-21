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
