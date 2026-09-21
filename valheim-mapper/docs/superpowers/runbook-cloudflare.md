# Cloudflare runbook — Valheim Mapper

This is both a record of how Access is currently configured for this Worker
and the procedure to reproduce or change it. The allow-list of emails is
deliberately **not** written down anywhere in this document or the repo — it
lives only in the Cloudflare Zero Trust dashboard.

## 1. Login

```
npx wrangler login
```

Opens a browser to authenticate the CLI against the Cloudflare account that
owns `jeffabliss.com`. Not required for `--dry-run` deploys (see §3).

## 2. Zero Trust / Access configuration (already done)

- **Team name:** `jeffabliss` — login page is `jeffabliss.cloudflareaccess.com`.
- **Plan:** Zero Trust Free.
- **Identity provider:** One-time PIN only, under Zero Trust →
  Integrations → Identity providers. No SSO/OAuth provider is configured —
  everyone authenticates with an emailed one-time code.
- **Access application:** Self-hosted, named **Valheim Mapper**.
  - Destination: domain `jeffabliss.com`, path `valheim-mapper`.
  - Session duration: 1 month.
  - Policy: **Friends** — Allow, Include → Emails. The actual list of
    allowed addresses is maintained only in the dashboard (Access →
    Applications → Valheim Mapper → Policies → Friends). Do not add emails
    to this repo.
  - Login page: customised under Zero Trust → Reusable components →
    Custom pages → Access login page.
  - **AUD tag:** under the application's **Additional settings** tab
    ("Application Audience (AUD) Tag"). The owner has this value; it is a
    per-application secret and must not be committed to the repo — it goes
    into a Worker secret, not `wrangler.jsonc` (see §4).

To reproduce this configuration from scratch (e.g. a new application):
Access → Applications → Add an application → Self-hosted → fill in the
name/domain/path/session duration above → add policy "Friends" (Allow,
Include → Emails, paste the list) → Identity providers: One-time PIN only →
save → open Additional settings and copy the AUD tag.

## 3. Dry-run deploy (safe, no login required)

```
npx wrangler deploy --dry-run --outdir /tmp/vm-dry
```

This builds the Worker bundle and lists the static assets without touching
the account. Last run: 60 files read from `web/`, total upload 25.03 KiB
(7.79 KiB gzip), bindings resolved (`MAP` Durable Object, `ASSETS`,
`ACCESS_TEAM`/`ACCESS_AUD` environment variables — both empty, since the
real values are set as secrets, not `vars`). Works offline / without
`wrangler login`.

## 4. Real deploy and secrets

`wrangler.jsonc` ships with `vars: { ACCESS_TEAM: "", ACCESS_AUD: "" }` as
placeholders. The real values are set as **Worker secrets**, which override
the empty `vars` at runtime. The Worker must exist before you can attach
secrets to it, so the order matters:

```
npm run deploy                       # 1. creates/updates the Worker first
npx wrangler secret put ACCESS_TEAM  # 2. paste: jeffabliss
npx wrangler secret put ACCESS_AUD   # 3. paste the AUD tag from §2
```

Each `secret put` triggers its own redeploy, so the Worker ends up running
with both secrets set after step 3. Run `npm run deploy` from a machine
that has `web/assets/` populated (extracted game assets — see the top-level
README's Setup section; these are gitignored and not redistributed).

`workers_dev` is already `false` in `wrangler.jsonc`, so there is no
`*.workers.dev` route exposing the Worker — `jeffabliss.com/valheim-mapper`
is the only route.

## 5. Verification after deploy

- Incognito browser to `https://jeffabliss.com/valheim-mapper/` → redirects
  to the Access one-time-PIN login page.
- After entering a code for an allowed email, the map loads at
  `https://jeffabliss.com/valheim-mapper/`.
- `curl -sI https://jeffabliss.com/valheim-mapper/` → `302` redirect to the
  Access login (confirms the route is protected and there is no unauthenticated
  path).
- Two browsers, signed in as two different allowed emails, each see the
  other's live cursor on the map (confirms the Durable Object presence
  channel and Access identity plumbing both work end to end).

### OTP behaviour worth knowing

Access only emails a one-time code to addresses that match a policy's
allow-list; for anyone else, the page still says "a code has been sent" —
it does not reveal whether the address was accepted. Matching is exact
string matching on the email, so Gmail's dot-insensitivity is not honored
by Access: `a.b@gmail.com` and `ab@gmail.com` are different addresses as
far as the policy is concerned, and only the exact address on the
allow-list will receive a code.

## 6. Local development

```
npm run dev
```

Serves `http://localhost:8787/valheim-mapper/`. Local dev bypasses Access
entirely: identity comes from `DEV_IDENTITY` in `.dev.vars` (gitignored,
create it yourself — see the top-level README), normally
`dev@localhost`. Appending `?as=someone@x` to the page URL impersonates a
different identity for testing multi-user behaviour; the client carries
that same query parameter onto the WebSocket URL, so both HTTP and the
socket connection see the impersonated identity.

## 7. Operations

- **Logs:** `npx wrangler tail valheim-mapper` streams live requests and
  console output from the deployed Worker.
- **Rotate the allow-list:** edit the "Friends" policy's Include → Emails
  list in the Zero Trust dashboard. No redeploy needed — Access enforces
  policy changes immediately.
- **Backup:** use the in-app **Export** button, which downloads a portable
  JSON copy of the current map state. There is no automated/scheduled
  backup — this is a manual, on-demand action.
- **Storage reset:** this is mostly manual and there's no single clean
  command for it.
  - Easiest: Cloudflare dashboard → Workers & Pages → `valheim-mapper` →
    Durable Objects, and delete the object instance from there.
  - Alternative: write a one-off script that uses `wrangler` (or the
    Durable Object's SQLite binding directly) to delete rows from the
    room's storage. There's no ready-made script for this in the repo;
    treat it as a "write it when you need it" operation, not a documented
    one-liner, since deleting the wrong rows is destructive.
