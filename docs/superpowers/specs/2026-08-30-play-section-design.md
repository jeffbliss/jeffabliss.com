# /play/ Games Section — Design

## Overview

jeffabliss.com gains a `/play/` section: small browser games shared with friends.
Two kinds of games, one theme — a small experience of Jeff's life in game form:

- **Adventure vignettes** — short autobiographical scenes with SVG characters
- **Arcade games** — small retro games, added later as the itch strikes

Division of labor: Jeff writes the writing, code, and music. Claude draws the art.
Jeff is comfortable in JavaScript but new to TypeScript; new TS syntax gets
explained as it appears in real code.

## Tech stack

- **Hugo** (existing site) — each game is a page; scripts bundled with `js.Build`
  (esbuild built into Hugo — no new build toolchain)
- **TypeScript** — game code; esbuild strips types at build time, no strict
  compiler gate
- **SVG + GSAP** — adventure vignettes render SVG in the DOM; GSAP animates it
- **Kaplay** — canvas framework for arcade games (successor to Kaboom.js)
- **npm-vendored dependencies** — GSAP and Kaplay installed to `site/node_modules`,
  resolved by Hugo at build time; no CDNs (house rule)
- **Cloudflare Pages** — existing deploy; build command gains an `npm install`
  step before the Hugo build

## Art direction

Pixel-art look built as SVG: chunky retro squares (think Undertale-era sprites)
that stay crisp at any size. `shape-rendering: crispEdges` throughout. Sprites
are structured SVGs — every animatable part (head, eyes, arms, legs) is a named
group so game code and GSAP can target parts directly (e.g. `#hero .arm-left`).

## Site structure

```
site/content/play/_index.md          lobby front matter
site/content/play/<game>/index.md    one page per game
site/layouts/play/section.html       lobby: grid of game cards
site/layouts/play/single.html        game shell: intro, mount point, bundled script
site/assets/js/games/<game>/main.ts  game entry point (named in page front matter)
site/assets/js/games/<game>/*.svg    game art, inlined by the template
site/assets/js/games/lib/            shared utilities, grown as patterns emerge
```

Templates follow the site's existing modern layout conventions (no `_default/`).
Styling continues in `site/assets/css/main.css` with the existing design tokens
and dark-mode override.

## Out of scope (for now)

Save systems, shared world state, scoreboards, a connected overworld. Each game
is self-contained. Small is the way.

## Testing

Pure game logic (movement bounds, interaction proximity, scene state) is written
as plain functions so it can gain vitest coverage later if wanted. Initial
verification is manual in the browser preview. The `/sync` test suite is
untouched.

## First game: "Wake Up"

A single-scene adventure vignette exercising the whole pipeline end to end:
SVG art, player movement, interaction, GSAP transition, lobby page.

**Player character:** a very simple 40-year-old man with curly hair and a beard,
roughly 6'2" — drawn as a tall pixel-style SVG sprite.

**Scene:** his bedroom, morning. The player wakes up and has complete control
of the character.

**Loop:**

1. Player walks freely around the bedroom (arrow keys or WASD).
2. Player walks to the bedroom door and presses the interact key
   (Space or E) while near it.
3. A dialogue box reads: **"Good morning. Today will be a good day"**
4. The scene fades to black; bold white text reads:
   **"ENJOY YOUR DAY. YOU ARE LOVED."**

That end card is the whole game. No fail state, no inventory, no timer.
Desktop keyboard only for now; touch controls are a later addition.
