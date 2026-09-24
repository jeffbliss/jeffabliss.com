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
- The map opens in View. Drag to pan, wheel or the + / − buttons (also `+` `-` keys) to zoom, `0` fits the world. Pins are live in View (see below); everything else is read-only.
- **Edit** (`E`) reveals the drawing tools and Undo / Redo; Done or `Esc` returns to read-only. While editing, right-drag, middle-drag or Space+drag pan.
- Tools: `B` paint, `I` ink, `V` select, `L` log, `M` measure (Measure also works without Edit) · `[` `]` step the paint brush through 8 / 16 / 32 / 64 / 128 m, or the ink width through 2 / 4 / 8 / 16 / 32 m while inking
- Paint: drag to paint the chosen biome; the **None** swatch erases. Painting and inking clear the fog where you draw. The **Fog** swatch in the palette re-fogs an area.
- Fill (`G`, or the Fill button in the brush row): click inside an enclosed area to fill it with the chosen biome. Painted biome boundaries and ink strokes both contain the fill; it is refused, and nothing changes, if the area reaches the edge of the world or is bigger than 4 km × 4 km.
- Copy and paste: in Select mode drag a box, `Cmd/Ctrl+C` copies the terrain, fog, ink and pins inside it, `Cmd/Ctrl+V` then click places the copy centred on the click (blank cells are transparent; `Esc` cancels). The copy goes through the system clipboard as text, so it can be pasted into a friend's tab.
- Leg log (`L`): dead reckoning. Click the map or a pin to set the start, then type one leg per line as bearing, seconds and gait, e.g. `NE 40 jog`, `E 25`, `120 1m30 sprint` (bearings are compass points or degrees; gaits walk / jog / sprint / swim or a speed in m/s, jog by default). The path previews live with its end error; Place (or `Cmd/Ctrl+Enter`) commits it as ink plus an end pin named with the error, clears fog along it, and makes that pin the start of the next log.
- Correct a log: when a chain of legs ends where you know you really are (spawn, a coastline you drew), select its last pin, press **Correct** in the popup and click the true spot (pins snap). The whole chain slides to fit: the end pin lands there, earlier pins and ink move in proportion to their distance along the route, and painted terrain and fog within a couple of zones of the route move with them. One undo step. A checked pin counts as a verified location: chains stop there, so check a waypoint once you have corrected it and later corrections leave it alone.
- Measure (`M`): click points along a route (pins snap) to read its length in metres and zones and the time at each gait; the last segment follows the cursor. Esc or Clear resets. Nothing is saved.
- Ink: the **Erase** button turns the drag into an eraser that removes any stroke it crosses; picking a colour turns it off. Eight quick colours plus a colour-wheel button for anything else.
- Scale bar (bottom-left) spans whole grid squares (zones) at the current zoom, with the jog time for that distance; hover it for walk, sprint and swim times. Zoomed right in, one 64 m zone fills the view.
- Pins work like the game's map, in any mode: double-click the map to place one of the type picked in the bottom bar and name it, click a pin to cross it off, right-click a pin to remove it (Cmd/Ctrl+Z brings it back), double-click a pin to rename it. In Edit the Select tool can also drag pins; `X` and Delete work on the selected pin
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

## To do

- Rotate a selection on copy/paste: while the paste ghost is shown, `R` turns it 90° (terrain and fog cells transposed, ink points and pin positions rotated about the centre), and the placed copy is the rotated one.
- Move the Fill option: it sits at the end of the brush-size row, where it reads as a sixth size and is easy to miss. Give it its own place, for example a Fill tool button in the toolbar next to Paint, or a Brush / Fill mode switch above the sizes.
- Scale a selection up or down: resize what is already drawn (terrain and fog cells resampled to the new size, ink points and pin positions scaled about the centre). Likely as a paste-ghost adjustment alongside rotate, or as drag handles on the selection box in Select mode; the result should be one undo step and sync like any other edit.
