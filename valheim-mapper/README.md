# Valheim Mapper

Hand-draw a Valheim world map outside the game, in the in-game style, for no-map playthroughs.

## Setup
1. Extract game assets once (needs the Steam install): `source activate.sh && python scripts/extract_assets.py out/assets && npm run assets`
2. `npm install`
3. Create `.dev.vars` with `DEV_IDENTITY=dev@localhost` for local dev (gitignored; it bypasses Cloudflare Access on your machine).
4. Local dev: `npm run dev` → http://localhost:8787/valheim-mapper/ . Open a second tab with `?as=friend@x` to simulate another user.

## Deploy
`npm run deploy` from a machine with `web/assets/` populated, then — once, after that first
deploy — set the Access secrets: `npx wrangler secret put ACCESS_TEAM` and the same for
`ACCESS_AUD`. The Worker must exist before secrets can be attached to it, and the two names
must never appear in `wrangler.jsonc` (a `vars` entry there replaces the remote secret on
every deploy). Once set, the secrets survive all later deploys. Full Zero Trust/Access setup, verification steps and
operations (logs, allow-list rotation, backup, storage reset): see
`docs/superpowers/runbook-cloudflare.md`.

## Controls
- Wheel or the + / − buttons (also `+` `-` keys): zoom · Middle-drag / Space+drag: pan · Double-click: recentre · `0`: fit world
- Tools: `H` pan, `B` paint, `I` ink, `P` pin, `V` select · `[` `]` step the brush through 8 / 16 / 32 / 64 / 128 m
- Paint: left drag paints the chosen biome, right or Alt drag erases. Painting and inking clear the fog where you draw. The **Fog** swatch in the palette re-fogs an area (right drag with it reveals).
- Ink: right or Alt drag across a line erases that stroke.
- Pins: click to place. A selected pin shows a popup to rename, check or delete it, and can be dragged; `X` and Delete also work as shortcuts
- Undo/redo: Cmd/Ctrl+Z, Shift+Cmd/Ctrl+Z

Export downloads a portable JSON copy.

## Scale reference
Speeds from the game's Player character: jog (default movement) 4 m/s, sprint 7 m/s, walk 1.6 m/s, swim 2 m/s.
So 10 s of jogging is about 40 m, 10 s of sprinting about 70 m. One raster cell is 8 m, a game zone is 64 m,
and the in-game map reveals 100 m around you. The default 32 m brush paints a 64 m wide patch: one zone,
or roughly 16 s of jogging across.

## Rendering
Terrain (parchment, biomes, textures) and fog are drawn by a small WebGL renderer in `web/gl.js`: the 8 m biome raster and the fog raster live on the GPU as single-channel textures and one fragment shader composites them per frame, so panning stays smooth in every browser. Grid, ink and pins are plain Canvas 2D layers on top.

## Development
`npm test` (pure modules, node:test) and `npm run test:do` (Durable Object, workers pool). Game assets under `out/`, `web/assets/` are gitignored and must not be redistributed.
