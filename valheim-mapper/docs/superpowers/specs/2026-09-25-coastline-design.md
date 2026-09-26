# Coastline from shore pins, and log paths that go with their pin

## Goal

A surveyed stretch of coast becomes one smooth ink line drawn through the verified shore pins, so the pins can be deleted afterwards. Deleting a log's end pin also removes the path that log drew, so a finished survey leaves nothing behind but what was baked.

## Shore tag

- A pin gains an optional boolean `shore`. The popup gets a **Shore** toggle beside Check, in any mode. It is a `pin.update` patch like `checked`, so the worker's patch whitelist gains `shore` (boolean); `pin.add` accepts it too. `plainPin` copies it. Absent means false; no migration.
- The pins layer draws a small blue dot under a shore pin's icon.

## Coast

- In Edit the toolbar gets **Coast**, enabled when at least two checked shore pins exist.
- Pressing it takes the checked shore pins, orders them by bearing from spawn clockwise from north (bearing 0 = +z, 90 = +x, `atan2(x, z)`), samples a Catmull-Rom curve through them every 8 m (uniform parameterisation, end segments extrapolated by duplicating the end points), and adds one ink stroke: colour `#3b7dbf`, width 4, the sampled points rounded to 0.1 m. One undo step; ordinary ink afterwards (erasable, copyable). Pressing again adds another stroke.
- Untagged, unchecked, fixed and missing pins are ignored.
- Assumption stated in the README: one survey's shore pins run along the coast without doubling back; survey a fjord in two batches.

## Log paths

- `pinActions.remove(pin)` on a pin with `log.ink` also removes that ink stroke (if it still exists) in the same history command: ops `pin.remove` + `ink.remove`, inverses `ink.add` + `pin.add`. Undo restores both. Later logs that started from that pin keep their own paths.

## Code

- `web/coast.js`: `shorePins(pins)`, `catmullRom(points, step)`, `coastCommand(app)`.
- `web/pins.js`: `plainPin` copies `shore`; shore dot in `draw`; `pinActions.remove` combines the stroke removal.
- `web/ui.js`, `web/index.html`, `web/style.css`: Shore toggle in the popup, Coast button in the Edit toolbar (hidden outside Edit like the other edit tools), enabled state refreshed with the toolbar.
- `worker/ops.js`: `shore` on `pin.add` and in `pin.update` patches.
- README: Coast bullet; note that deleting a logged pin removes its path.

## Verification

Unit tests: `shorePins` sorts by bearing around spawn and drops untagged/unchecked/fixed pins; `catmullRom` passes through every control point and spaces samples at about the step; `coastCommand` returns null with fewer than two pins and otherwise adds one stroke with undo; removing a logged pin removes its stroke and undo restores both, and a pin whose stroke is already gone removes cleanly; worker accepts `shore: true` on add and update and rejects non-booleans. Dev server: tag three checked pins, press Coast, see the blue curve, delete the pins, curve stays; delete a logged pin, its path goes, undo brings both back.
