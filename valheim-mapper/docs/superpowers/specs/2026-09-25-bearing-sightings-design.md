# Bearing sightings (fix a pin by intersection)

## Goal

A campfire or tower you built can be placed on the map without walking to it: from two or more verified pins you read the compass point it lies on, and the map intersects those bearings. Bearings come from the in-game build ghost, so they are compass points only, 22.5° apart; the feature treats each as a ±11.25° wedge and never pretends to more precision than that.

## Data model

A target pin gains an optional `sightings` array: `[{ from: <observer pin id>, bearing: <degrees, a multiple of 22.5 in [0, 337.5]> }]`. At most one sighting per observer; a new one replaces it. Two new ops:

- `pin.sight { id, from, bearing }` upserts a sighting on pin `id`.
- `pin.unsight { id, from }` removes it.

The worker validates both (ids, bearing a multiple of 22.5 in range, `from !== id`) and persists `sightings` on the pin the way `log` is persisted. `pin.update` patches never touch `sightings`. Removing or unchecking an observer pin leaves its sightings stored but they stop contributing until the observer exists and is checked again. Pins without `sightings` are unchanged; no migration.

## Interaction

- Select a **checked** pin, in View or Edit; its popup shows **Sight**. Pressing it shows a bar of the sixteen compass points. Pick one, then click the target pin. While choosing, the overlay draws the wedge from the observer along the chosen point. Esc cancels. Clicking anything other than a pin does nothing.
- The target's popup lists its sightings as "from <observer name>, NE" with an × that removes that sighting.
- When two or more contributing wedges intersect in a bounded region, the popup shows "estimate N m away · ±E m" and, in Edit only, a **Correct to sightings** button. Otherwise it shows one line: "need another sighting from a different angle" (unbounded or fewer than two), or "sightings contradict each other" (empty).

## Geometry (`web/sight.js`, pure)

- Bearing 0 is north (+z), 90 is east (+x), matching `parseBearing` in `web/leglog.js`.
- `wedge(observer, bearing)`: the sector from bearing − 11.25° to bearing + 11.25° at the observer, expressed as two half-planes.
- `region(sightings, pins)`: a 4 km square centred on the mean of the contributing observers, clipped by every contributing wedge's two half-planes (Sutherland–Hodgman). Sightings whose observer is missing or unchecked are skipped. Returns the polygon (possibly empty).
- `estimate(polygon, square)`: null when the polygon is empty or any vertex lies on the square's boundary (unbounded). Otherwise `{ x, z, error }` with `(x, z)` the centroid and `error` the largest vertex distance from it, rounded to metres.

## Drawing

For the selected pin only, the pins layer draws each contributing wedge as a translucent fan from its observer out to the region's far extent, the region as a filled polygon, and a small cross at the estimate. Nothing is drawn for unselected pins.

## Correction

**Correct to sightings** calls `correctionCommand(app, pin, [estimate.x, estimate.z])`. A logged pin's chain, ink, terrain and fog warp as they do for Correct today. When the pin has no log the command returns null, and the button instead pushes a plain `pin.update` move. Either way the pin's name gets `±E m` appended, replacing an existing `±N m` if present. One undo step.

## Code

- `web/sight.js`: `wedge`, `region`, `estimate`, plus `sightOps` (`sight`, `unsight` commands with inverses).
- `web/pins.js`: `plainPin` copies `sightings`; the layer draws wedges, region and estimate for the selected pin.
- `web/ui.js`: Sight button, compass-point bar, intercept and overlay; sightings list in the popup; Correct to sightings button.
- `worker/ops.js`: validate and persist `pin.sight` / `pin.unsight`.
- README Controls: a paragraph on sightings.

## Verification

Unit tests: a wedge contains a point dead ahead and excludes one 12° off; two perpendicular sightings from checked pins give a diamond whose centroid is the true point; two sightings one compass point apart give no estimate; opposing sightings that cannot meet give an empty region; unchecked observers are skipped; `sightOps` round-trip with undo. Worker tests: `validateOp` accepts and rejects `pin.sight` shapes; a pin with sightings survives the snapshot. Dev server: check two pins, sight a third from each, see the diamond and cross, Correct to sightings, undo.
