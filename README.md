# Valheim Mapper

Hand-draw a Valheim world map outside the game, in the in-game style, for no-map playthroughs.

## Setup
1. Extract game assets (one-time, needs the Steam install): `source activate.sh && python scripts/extract_assets.py out/assets`
2. Copy them into the web app: `npm run assets`
3. Run: `npm start` → http://localhost:8080

## Controls
- Wheel: zoom · Middle-drag / Space+drag: pan · Double-click: recentre · `0`: fit world
- Tools: `H` pan, `B` paint, `I` ink, `P` pin, `V` select · `[` `]` brush size
- Paint: left drag paints the chosen biome, right or Alt drag erases. Painting and inking clear the fog where you draw; there is no separate fog tool.
- Ink: right or Alt drag across a line erases that stroke.
- Pins: click to place; selected pin → Enter rename, `X` toggle checked, Delete remove; drag to move
- Undo/redo: Cmd/Ctrl+Z, Shift+Cmd/Ctrl+Z

Map autosaves to `data/map.json` (with `.bak`). Export/Import produce a portable JSON file. **New map** resets everything to an empty map with only the start pin (export first if you want to keep the current one).

## Development
`npm test` runs the unit tests (Node ≥ 20, no dependencies).
Game assets under `out/`, `web/assets/` and saves under `data/` are gitignored and must not be redistributed.
