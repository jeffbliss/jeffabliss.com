# World import: the cartography table onto the map

## Goal

Draw the group's real in-game exploration on the mapper from the dedicated server's world save, without touching anything the game itself does not show a no-map player: the cartography table's explored bitmap and the pins written to it (boss vegvisirs). Rerunnable after every session at the table.

## Source

Valheim 1.0 chunked world folder (`_main.N.chunks/.db2/.fwl2/.ok` plus `xx_yy__g_v.chunk`), copied by SFTP into `import/savegame/` (gitignored). The newest `_main.N.chunks` names the chunk files of the current save. Each chunk is `[u16 version][u32 count]` followed by `count` ZDO records:

```
flags u16
position: 3 × f32, or 2 × i16 metres when flags bit 13 is set
prefab u32 (StableHashCode)
bit 12 → rotation: 2 bytes, plus 2 more when the second byte's high bit is clear
bit 0  → connection: 5 bytes
bits 1..7 → segments floats / vec3 / quat / int / long / string / byteArray,
  each [varint count][count × (u32 key + value)], strings varint-length, byteArrays i32-length
```

The cartography table is prefab `piece_cartographytable`; its `data` byteArray is gzip of a version-3 map package: `i32 version, i32 n, n bytes explored (2048 × 2048, row-major, 1 = explored), i32 pinCount, pins × (i64 owner, string name, 3 × f32 pos, i32 type, u8 checked, string author)`. Map pixel `(i, j)` covers world x in `[(i − 1024) · 12, +12)`, z likewise. Several tables merge: explored OR, pins deduplicated by name and rounded position.

## Output

`scripts/import-world.mjs` writes a mapper document (`import/world.json`, the same shape Export produces): terrain all zero, fog 255 on every 8 m cell overlapped by an explored pixel, no ink, and one pin per table pin. Coordinates are shifted so the start temple (the `StartTemple` location proxy, found in the chunks) lands on the mapper's fixed START at (0, 0); the shift is printed. Valheim pin types map to mapper types: 0 fire, 1 house, 2 hammer, 3 pin, 4 death, 5 bed, 6 portal, 9 boss, others pin. Boss names `$enemy_eikthyr`, `$enemy_gdking`, `$enemy_bonemass`, `$enemy_dragon`, `$enemy_goblinking`, `$enemy_seekerqueen`, `$enemy_fader` become Eikthyr, The Elder, Bonemass, Moder, Yagluth, The Queen, Fader; anything else keeps its text. Pins are checked as in the table. The script prints counts: chunks, records, tables, explored pixels, fog cells, pins.

## Import button

In Edit, **Import** (next to Export) opens a file picker for a mapper document. After `confirm('Replace the whole map with this file? This cannot be undone.')`, the client replaces its state and sends the difference as ordinary ops so the server and every friend follow: for terrain and fog, one `raster` op per 128-cell tile whose bytes differ; `ink.remove` for every current stroke and `ink.add` for each incoming one; `pin.remove` for every current non-fixed pin and `pin.add` for each incoming one (START is never sent). History is cleared. Pure logic lives in `web/importmap.js` as `replaceOps(state, next)` returning `{ ops, apply }`; `web/ui.js` wires the button.

## Verification

Unit: StableHashCode of `piece_cartographytable` is `0xf631b195`; a synthetic chunk with float-position, short-position, rotated and segmented records decodes with the right positions and byteArray; a synthetic map package decodes explored pixels and pins; explored pixel to fog cells covers all overlapped cells after the shift; `replaceOps` emits only differing tiles and the right pin/ink ops. Real data: the script on `import/savegame` reports one table, 4 pins, about 47 k explored pixels. Dev server: Import the file, see fog cleared and the four boss pins, a second tab sees the same, reload keeps it.

## Biomes (added 2026-09-27)

The world save holds no biomes, but a whole-world render of the seed from valheim-map.world (layer Biomes Only, flat palette, 6144 px over the 24 576 m minimap extent, 4 m/px, north up, centred on the world origin) does. `scripts/lib/biomeimage.mjs` decodes the PNG, classifies pixels to the nearest palette colour, and `scripts/paint-biomes.mjs` paints the biome id onto every fog-revealed cell of `import/world.json` (shallows count as ocean, out-of-disc pixels are skipped). The geometry is assumed rather than fitted, since it reproduces the known biomes at the start temple and every boss altar; `--fit` runs the coastline fit instead for a render that does not follow the convention.
