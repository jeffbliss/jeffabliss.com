# valheim-mapper (subproject of jeffabliss.com)

Shared hand-drawn Valheim map served at jeffabliss.com/valheim-mapper by a Cloudflare Worker + Durable Object.
Design docs: docs/superpowers/specs/. This directory follows its own conventions, not the Hugo site's:

- Vanilla ES modules, zero runtime dependencies (browser and Worker). Dev deps: wrangler, vitest, @cloudflare/vitest-pool-workers.
- Short explanatory comments are welcome where the code is not self-evident.
- Tests: `npm test` (node:test, pure modules) and `npm run test:do` (Durable Object, workers pool). Run both before committing.
- `web/assets/` (game textures/fonts/icons) is gitignored and never committed or redistributed; `npm run deploy` uploads it from a machine that has it.
- Never commit emails, Access AUD tags or secrets. Access allow-list lives only in the Cloudflare dashboard.
- Local dev: `npm run dev` → http://localhost:8787/valheim-mapper/ (identity from .dev.vars; `?as=name@x` switches user in dev).
