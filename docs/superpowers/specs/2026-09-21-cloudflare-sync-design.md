# Valheim Mapper — Shared Map on Cloudflare (Design)

Date: 2026-09-21
Status: approved
Supersedes the server/persistence sections of `2026-09-21-valheim-mapper-design.md`.

## Purpose

Host the mapper at `https://jeffabliss.com/valheim-mapper` so a small group of friends can draw
on one shared map at the same time, Google-Docs style: edits and cursors appear live for everyone.
Access is limited to an allow-list of email addresses. Everything runs on the Cloudflare free plan.

## Non-goals

- Multiple maps / rooms. There is exactly one map.
- Offline editing with later merge. A client that was disconnected reloads the snapshot.
- Whole-map replace from the UI (no "New map", no Import). Export stays.
- OAuth / identity providers. Cloudflare Access One-time PIN only.
- Faithful in-game minimap shader (unchanged renderer).

## Constraints

- Cloudflare Workers Free plan: 100k requests/day (incoming WebSocket messages count 20:1), 5 GB
  SQLite storage, 100k row writes/day, 5M row reads/day. Exceeding a limit returns errors.
- Durable Object SQLite row/blob values ≤ 2 MB → rasters are stored as tiles.
- Front end stays vanilla ES modules, zero runtime dependencies. Worker code likewise (WebCrypto for JWT).
- Game assets (`web/assets/`) are gitignored and uploaded as Workers static assets by `wrangler deploy`
  run from a machine that has them. They are served only behind Access.
- The jeffabliss.com repo is public: no emails or secrets in it.

## Repository layout (jeffabliss.com)

```
valheim-mapper/                    added with `git subtree add --prefix=valheim-mapper` (history preserved)
  wrangler.jsonc                   name, route jeffabliss.com/valheim-mapper*, assets ./web, DO binding MAP, vars
  package.json                     scripts: test (node:test), test:do (vitest-pool-workers), dev, deploy
  worker/index.js                  fetch: Access JWT check → redirect /valheim-mapper → …/, /api/ws → DO, else assets
  worker/access.js                 verifyAccessJwt(request, env) using JWKS from <team>.cloudflareaccess.com
  worker/ops.js                    op schemas, validate(op), apply(state, op), tile split/merge helpers (pure)
  worker/map.js                    MapRoom Durable Object
  web/                             front end (store.js/server removed; sync.js, presence.js added)
  tests/                           node:test (pure modules) ; tests/do/ vitest-pool-workers (Durable Object)
  scripts/, activate.sh, docs/     unchanged
```

`server/`, `web/store.js` (client part) and their tests are deleted. `png.js`, `createState`,
`serialize` remain (used by both client and Worker for the snapshot format).

## Access and identity

- Zero Trust → Access → self-hosted application `jeffabliss.com/valheim-mapper`, login method
  One-time PIN, session duration 1 month, one Allow policy with an email list (configured in the
  dashboard; the list is not in the repo). The `workers.dev` route is disabled.
- The Worker verifies `Cf-Access-Jwt-Assertion` on every request (assets, API, WebSocket upgrade):
  RS256 signature against JWKS `https://<TEAM>.cloudflareaccess.com/cdn-cgi/access/certs` (cached
  1 h, refetched on unknown `kid`), `iss === https://<TEAM>.cloudflareaccess.com`, `aud` contains
  `ACCESS_AUD`, `exp` in the future. Failure → 403.
- Identity = `email` claim. Display name = local part of the email; colour = deterministic hash of
  the email into a 12-hue palette.
- Dev mode: when `DEV_IDENTITY` var is set (only in `wrangler dev` config), the JWT check is skipped
  and that email is used.
- Identity is stored on the WebSocket via `serializeAttachment` so it survives hibernation.

## Protocol (one WebSocket, `GET /valheim-mapper/api/ws`)

Text frames are JSON `{ t: <type>, ... }`; raster patches are binary frames.

Server → client
- `hello { you: {email, name, color}, seq, doc }` — `doc` is the save-document format (version 1;
  rasters base64 PNG, `ink`, `pins`; no settings/player). Sent once per connection.
- `op { seq, by: {name, color}, op }` — an accepted op from another client (JSON ops), or a binary
  raster frame (see below) for raster ops.
- `presence { users: [{email, name, color, x, z, tool, brush, at}] }` — on join/leave and on cursor
  updates (server rebroadcasts each cursor as `presence` with just that user).
- `error { message }` — to the sender of a rejected op only.

Client → server
- `op { op }` where op is one of:
  - `ink.add { stroke: {id, color, width, points} }`, `ink.remove { id }`
  - `pin.add { pin: {id, x, z, type, name, checked} }`, `pin.update { id, patch: {name?, checked?, x?, z?} }`,
    `pin.remove { id }`
- Binary raster op (client → server): `Uint8Array` = 1 byte layer (0 terrain, 1 fog) + 4 × Uint16 LE
  (x0, z0, x1, z1 inclusive cells) + `(x1-x0+1)*(z1-z0+1)` bytes row-major.
  Server → client rebroadcast: 4-byte Uint32 LE `seq` + 1 byte name length + UTF-8 author name +
  the client payload unchanged. (`web/sync.js` exports `encodeRasterOp`/`decodeRasterOp` for both directions.)
- `cursor { x, z, tool, brush }` — throttled to 5/s client side; never stored.

Validation (server): rect inside 0..2559, byte length matches, ids are strings ≤ 64 chars, pin type in
`PIN_TYPES` and not `start`, stroke ≤ 5000 points, name ≤ 40 chars, `start` pin immutable
(`pin.update`/`pin.remove` on `start` rejected). Invalid → `error`, state untouched.

Conflict rule: last write wins per cell / per pin field / per stroke, in the order the DO receives
ops. Undo is local: the client sends the inverse as a new op.

## Durable Object `MapRoom` (one instance, name `main`)

SQLite schema
```
tiles(layer INTEGER, tx INTEGER, tz INTEGER, data BLOB, PRIMARY KEY(layer, tx, tz))   -- 128×128 cells
ink(id TEXT PRIMARY KEY, json TEXT)
pins(id TEXT PRIMARY KEY, json TEXT)
meta(key TEXT PRIMARY KEY, value TEXT)                                                -- schema, seq
```
In memory: `terrain`, `fog` (`Uint8Array(2560²)`), `ink: Map`, `pins: Map`, `seq`, `dirtyTiles: Set`,
`snapshot` cache `{seq, doc}`. Constructor (`blockConcurrencyWhile`): create schema, load tiles into
the arrays, load ink/pins/seq, rebuild `sessions` from `getWebSockets()` attachments.

Op handling: validate → apply to memory → `seq++` → mark dirty tiles (raster) or write row (ink/pin,
immediately) → invalidate snapshot → broadcast to all other sockets. Dirty tiles and `meta.seq` are
flushed by an alarm 2 s after the first dirty mark (`setAlarm`), so continuous strokes cost one write
per tile per flush. Flush also runs before returning `hello` if dirty (cheap consistency).

Presence: `sessions: Map<WebSocket, {email,name,color,x,z,tool,brush,at}>`; not persisted (rebuilt
from attachments with cursor = null). `webSocketClose/Error` remove and broadcast.

Snapshot: `hello.doc` built with the shared `serialize()`-equivalent (`png.js` `encodeGray` +
base64) and cached until the next op.

## Client changes

- `web/sync.js`: `createSync({url, state, history, onStatus, onPresence, onRemoteChange})`.
  Connects, handles `hello` (→ `createState(doc)` via `app.rebuild`), applies remote ops directly to
  state (raster: `raster.restore(rect, bytes)`; ink/pins: array edits; then `requestRender`), sends
  local ops from `history.onApply`, throttles `cursor`, reconnects with backoff (1 s → 30 s) and
  reloads the snapshot on reconnect (local queue discarded, status says "reconnected, reloaded").
  Status values: `connecting | connected | reconnecting | offline`.
- Commands carry `op` and `inverse`: stroke recorder → raster ops from before/after snapshots
  (`{layer, rect, bytes}`); ink tool → `ink.add`/`ink.remove`; pin tool/popup → `pin.*`.
  `history.js` gains `onApply(op)` called on push (op), undo (inverse), redo (op). Combined commands
  carry arrays of ops.
- Settings (grid, layer visibility/opacity, camera) → `localStorage` (`valheim-mapper:settings`).
- UI: remove New map, Import, Save, autosave status; add connection status, presence row (names in
  their colours), presence layer (dot + name + brush circle for painting users; fade after 10 s).
- Ink strokes get `id` (`crypto.randomUUID()`); older strokes get ids on snapshot load server-side.

## Deployment & runbook (docs/superpowers/runbook-cloudflare.md)

1. `wrangler login`; `cd valheim-mapper && npm run deploy` (uploads code + `web/` incl. assets).
2. Zero Trust: create team domain if none; Access → Applications → Add self-hosted:
   domain `jeffabliss.com`, path `valheim-mapper`; session 1 month; policy Allow, Include Emails
   (the four addresses); login method One-time PIN. Copy the AUD tag.
3. `wrangler secret put ACCESS_AUD` (or var) and set `ACCESS_TEAM` var; redeploy.
4. Workers → valheim-mapper → Settings → Domains & Routes: disable `workers.dev`.
5. Verify: incognito visit prompts for email OTP; `curl` without token → 403.

## Testing

- `node --test`: `worker/ops.js` (validate/apply/tiles), `worker/access.js` claim checks with a
  locally generated RSA key and fake JWKS fetch, `web/sync.js` op↔command mapping and message
  framing (binary raster frame encode/decode), presence colour hashing, existing view/raster/history/
  png/grid/ink/pins tests.
- `vitest-pool-workers` (`tests/do/`): two clients connect; a raster op from A is received by B and
  B's raster matches; ink/pin ops round-trip; invalid op → `error` and unchanged snapshot; flush →
  tiles persisted; new connection gets `hello` with the current doc.
- Manual: two browser tabs (dev identity) draw simultaneously; Access flow in production.

## Budget (5 users, 3 h/day heavy use)

~8k requests/day (cursors 5/s counted 20:1 dominate), ~25k row writes/day worst case (tiles per
flush + alarms), 13 MB storage, ~4k row reads/day. All well inside the free plan.
