# jeffabliss.com

Personal site built with Hugo. `/games` is an achievement log driven by
PlayStation trophy data synced daily by a Node script (`/sync`) via GitHub
Actions. Hosted on Cloudflare Pages.

- `/sync` — Node + TypeScript sync script (psn-api)
- `/site` — Hugo site; trophy data lives in `site/data/psn/`; includes `/play/` browser games section
- `.github/workflows/sync.yml` — daily sync + commit
