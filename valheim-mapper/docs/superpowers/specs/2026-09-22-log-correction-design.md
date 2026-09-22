# Leg log correction (snap to pin)

## Goal

After a chain of dead-reckoned legs closes on a known point, one action moves the whole chain onto it: the end pin lands on the known point, every earlier pin, the ink, and the painted terrain and fog along the route shift proportionally, as one undoable synced edit.

## Interaction

In Edit, select a pin that carries a `log`. Its popup shows **Correct**. Clicking it starts a placement, like paste: a toast asks where the pin really is, the overlay draws a line from the pin to the cursor with the offset in metres, and a click applies. The click snaps to a pin under the cursor, otherwise uses the map point. `Esc` cancels. The end pin keeps its log, so a later correction can rebuild the same chain.

## Model

- **Chain**: follow `log.from` back from the selected pin until a pin without a log, spawn, or a bare start. Logs oldest first.
- **Route**: each log contributes its stored ink stroke's points, or the straight line start to pin when the stroke is gone. Concatenated, this is a polyline of total length L.
- **Correction** D = target − end pin.
- **Field**: for a point P, take its nearest point on the route at arc fraction t and its distance d from the route. The shift is `w(d) · t · D`, where w is 1 within R, fades linearly to 0 at 2R, and R is the chain's end error plus one zone (64 m). The route start does not move, the end moves by exactly D.
- **What moves**: every non-fixed pin (the field applied at the pin), every ink stroke with any point inside 2R (all its points shifted, same id), and terrain and fog cells in the route's bounding box grown by 2R plus |D|, resampled nearest-neighbour from the unshifted copy (a cell takes the value from `P − shift(P)`).

## Code

- `web/anchor.js`: `chainFor(pins, end)`, `chainRoute(chain, ink)`, `createField(route, dx, dz, radius)`, `warpRaster(raster, field, bbox)`, `correctionCommand(app, endPin, target)` returning a combined history command (`raster` ops via the stroke recorder, `ink.add` upserts with `ink.add` inverses, `pin.update` x/z patches).
- `web/ui.js`: the Correct button in the pin popup, visible only in Edit for logged pins; the intercept, toast, overlay and Esc handling.
- Server unchanged: all ops are existing types within existing limits.

## Verification

Unit tests for the chain walk (single, chained, missing from), the field (start fixed, end exact, fade to zero beyond 2R), the raster warp (a painted block moves by the shift, cells outside are untouched), and the command (end pin on target, mid pin at half, ink shifted, terrain moved, undo restores everything). Dev server: log two legs, paint around the end, Correct onto spawn, see everything slide, undo.
