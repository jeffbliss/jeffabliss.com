# Leg log storage

## Goal

Every placed leg log is reconstructible later, so a future "snap to pin" re-anchoring can rebuild and correct a whole chain of legs, including the ink, terrain and fog around it. Step 1 of that feature: store the log on its end pin.

## Shape

The end pin that `logCommand` places gains an optional field:

```
log: { from: <start pin id> | null, start: [x, z], legs: <raw leg text>, ink: <path stroke id> }
```

`from` is the id of the pin the log started on (`'start'` for spawn, another log's end pin for a chained log) or null when the start was a bare map click; `start` always holds the start coordinates so the chain can be walked even if `from` is missing. `legs` is the sidebar text as typed, trimmed, at most 1000 characters. `ink` names the stroke drawn for the path.

## Changes

- `web/leglog.js`: `tool.start` carries the id of the pin it snapped to; after Place the next start is the new pin's id. `logCommand` takes the leg text and writes `pin.log`.
- `web/pins.js`: `plainPin` copies `log` when present, so pin ops carry it.
- `worker/ops.js`: `pin.add` validates `log` when present (from id or null, start two finite numbers, legs string ≤ 1000, ink id) and `planOp` persists it. `pin.update` patches do not touch `log`.
- Pins without `log` are unchanged; existing data needs no migration.

## Verification

Unit tests: `validateOp` accepts a good `log` and rejects bad shapes; `logCommand` writes `log` with the right `from`, `start`, `legs` and `ink`; Durable Object test round-trips a pin with `log` through the snapshot. In the dev server: place a log from spawn and confirm the pin in the snapshot carries `log.from === 'start'`.
