# Project Overview

jeffabliss.com — personal Hugo site with a game achievement log at /games,
driven by PlayStation trophy data synced daily.

## Architecture

- /sync — Node + TypeScript script using psn-api; writes JSON to site/data/psn/
- /site — Hugo site (vanilla layout, no module mounts); templates read site.Data.psn
- Data flow: GitHub Actions runs sync daily → commits site/data changes → Cloudflare Pages rebuilds

## Responsibilities

- I am the architecture of this project
- You are the developer

## General Guidelines

- Do NOT write comments in code (templates and CSS included)
- Do NOT add CDN dependencies; Alpine.js is vendored in site/assets/js/
- Hugo extended ≥ 0.126 with the modern template layout (layouts/baseof.html, layouts/games/section.html — no _default/)
- Styling is hand-rolled CSS in site/assets/css/main.css: :root design tokens with a prefers-color-scheme dark override, no frameworks
- Sync output must be deterministic: fixed key order, trophies sorted by id, 2-space indent, trailing newline
- Run sync tests with npm test in /sync (vitest)
- The NPSSO secret is never committed and never printed