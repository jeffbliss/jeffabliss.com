# /play/ Games Section + "Wake Up" Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add a `/play/` games section to jeffabliss.com and ship the first game, "Wake Up" — a one-scene SVG adventure vignette.

**Architecture:** Each game is a Hugo page under `content/play/`; its TypeScript entry point is bundled at build time by Hugo's built-in esbuild (`js.Build`) and its SVG scene is inlined by the template. Pure game logic lives in `site/assets/js/games/lib/` with vitest coverage; DOM/animation glue lives in each game's `main.ts`. GSAP (npm-vendored) drives the ending transition.

**Tech Stack:** Hugo v0.165.0 extended, TypeScript (types stripped by esbuild — no separate compile step), GSAP, vitest, SVG.

## Global Constraints

- Spec: `docs/superpowers/specs/2026-08-30-play-section-design.md`
- No comments in any code, including templates, CSS, and SVG (project rule)
- No CDN dependencies; everything vendored via `site/node_modules` (project rule)
- Modern Hugo template layout — no `_default/` directory (project rule)
- Styling goes in `site/assets/css/main.css` using the existing `:root` design tokens; game-internal art colors are literal hex (games keep their own palette)
- Pixel-art-look SVG: integer coordinates, `shape-rendering="crispEdges"`, animatable parts as named groups
- End-card copy, verbatim: `ENJOY YOUR DAY. YOU ARE LOVED.`
- Dialogue copy, verbatim: `Good morning. Today will be a good day`
- Controls: arrow keys or WASD to move; E or Space to interact
- Cloudflare Pages builds with root dir `site`; it auto-installs npm deps when `site/package.json` exists — commit `package-lock.json`
- The user is new to TypeScript: when executing, briefly explain each new TS syntax feature the first time it appears
- Kaplay is deliberately NOT installed yet (spec lists it for arcade games; add it with the first arcade game — YAGNI)

---

### Task 1: npm scaffold + pure game-logic library

**Files:**
- Create: `site/package.json`
- Create: `site/tsconfig.json`
- Create: `site/assets/js/games/lib/logic.ts`
- Test: `site/assets/js/games/lib/logic.test.ts`

**Interfaces:**
- Consumes: nothing
- Produces (used by Task 4):
  - `interface Vec { x: number; y: number }`
  - `interface Rect { x: number; y: number; w: number; h: number }`
  - `directionFromKeys(keys: ReadonlySet<string>): Vec` — normalized direction from held keys (`arrowup`/`w`/etc., lowercase)
  - `stepPosition(feet: Rect, dir: Vec, speed: number, dt: number, bounds: Rect, obstacles: Rect[]): Vec` — new `{x, y}` origin for the feet box, axis-separated collision
  - `isNear(a: Vec, b: Vec, radius: number): boolean`

- [ ] **Step 1: Create the npm scaffold**

Create `site/package.json`:

```json
{
  "private": true,
  "scripts": {
    "test": "vitest run"
  },
  "dependencies": {
    "gsap": "^3.12.5"
  },
  "devDependencies": {
    "vitest": "^3.2.0"
  }
}
```

Create `site/tsconfig.json`:

```json
{
  "compilerOptions": {
    "target": "ES2020",
    "module": "ESNext",
    "moduleResolution": "bundler",
    "lib": ["ES2020", "DOM", "DOM.Iterable"],
    "strict": true
  },
  "include": ["assets/js"]
}
```

Run: `cd site && npm install`
Expected: `node_modules/` appears (already gitignored via the root `node_modules` pattern), `package-lock.json` is created.

- [ ] **Step 2: Write the failing tests**

Create `site/assets/js/games/lib/logic.test.ts`:

```ts
import { describe, expect, it } from "vitest"
import { directionFromKeys, isNear, stepPosition, type Rect } from "./logic"

const bounds: Rect = { x: 0, y: 0, w: 100, h: 100 }

describe("directionFromKeys", () => {
  it("returns zero vector with no keys held", () => {
    expect(directionFromKeys(new Set())).toEqual({ x: 0, y: 0 })
  })

  it("maps arrows and wasd to unit directions", () => {
    expect(directionFromKeys(new Set(["arrowright"]))).toEqual({ x: 1, y: 0 })
    expect(directionFromKeys(new Set(["a"]))).toEqual({ x: -1, y: 0 })
    expect(directionFromKeys(new Set(["w"]))).toEqual({ x: 0, y: -1 })
    expect(directionFromKeys(new Set(["arrowdown"]))).toEqual({ x: 0, y: 1 })
  })

  it("normalizes diagonals to length 1", () => {
    const d = directionFromKeys(new Set(["w", "d"]))
    expect(Math.hypot(d.x, d.y)).toBeCloseTo(1)
    expect(d.x).toBeGreaterThan(0)
    expect(d.y).toBeLessThan(0)
  })

  it("cancels opposing keys", () => {
    expect(directionFromKeys(new Set(["a", "d"]))).toEqual({ x: 0, y: 0 })
  })
})

describe("stepPosition", () => {
  const feet: Rect = { x: 50, y: 50, w: 10, h: 5 }

  it("moves by speed times dt", () => {
    const next = stepPosition(feet, { x: 1, y: 0 }, 60, 0.5, bounds, [])
    expect(next).toEqual({ x: 80, y: 50 })
  })

  it("clamps to bounds", () => {
    const next = stepPosition(feet, { x: 1, y: 0 }, 1000, 1, bounds, [])
    expect(next.x).toBe(90)
  })

  it("stops at an obstacle on the x axis but slides on y", () => {
    const wall: Rect = { x: 62, y: 0, w: 30, h: 100 }
    const next = stepPosition(feet, { x: 1, y: 1 }, 60, 0.5, bounds, [wall])
    expect(next.x).toBe(50)
    expect(next.y).toBeGreaterThan(50)
  })

  it("does not move into an obstacle on the y axis", () => {
    const shelf: Rect = { x: 0, y: 58, w: 100, h: 42 }
    const next = stepPosition(feet, { x: 0, y: 1 }, 60, 1, bounds, [shelf])
    expect(next.y).toBe(50)
  })
})

describe("isNear", () => {
  it("is true inside the radius and false outside", () => {
    expect(isNear({ x: 0, y: 0 }, { x: 3, y: 4 }, 5)).toBe(true)
    expect(isNear({ x: 0, y: 0 }, { x: 3, y: 4 }, 4.9)).toBe(false)
  })
})
```

- [ ] **Step 3: Run tests to verify they fail**

Run: `cd site && npm test`
Expected: FAIL — cannot resolve `./logic`.

- [ ] **Step 4: Implement the logic module**

Create `site/assets/js/games/lib/logic.ts`:

```ts
export interface Vec {
  x: number
  y: number
}

export interface Rect {
  x: number
  y: number
  w: number
  h: number
}

const KEY_DIRS: Record<string, Vec> = {
  arrowup: { x: 0, y: -1 },
  w: { x: 0, y: -1 },
  arrowdown: { x: 0, y: 1 },
  s: { x: 0, y: 1 },
  arrowleft: { x: -1, y: 0 },
  a: { x: -1, y: 0 },
  arrowright: { x: 1, y: 0 },
  d: { x: 1, y: 0 },
}

export function directionFromKeys(keys: ReadonlySet<string>): Vec {
  let x = 0
  let y = 0
  for (const key of keys) {
    const dir = KEY_DIRS[key]
    if (dir) {
      x += dir.x
      y += dir.y
    }
  }
  x = Math.sign(x)
  y = Math.sign(y)
  const len = Math.hypot(x, y)
  if (len === 0) return { x: 0, y: 0 }
  return { x: x / len, y: y / len }
}

function overlaps(a: Rect, b: Rect): boolean {
  return a.x < b.x + b.w && a.x + a.w > b.x && a.y < b.y + b.h && a.y + a.h > b.y
}

function blocked(feet: Rect, obstacles: Rect[]): boolean {
  return obstacles.some((o) => overlaps(feet, o))
}

function clamp(v: number, min: number, max: number): number {
  return Math.min(Math.max(v, min), max)
}

export function stepPosition(
  feet: Rect,
  dir: Vec,
  speed: number,
  dt: number,
  bounds: Rect,
  obstacles: Rect[],
): Vec {
  const next = { x: feet.x, y: feet.y }
  const tryX = clamp(feet.x + dir.x * speed * dt, bounds.x, bounds.x + bounds.w - feet.w)
  if (!blocked({ ...feet, x: tryX }, obstacles)) next.x = tryX
  const tryY = clamp(feet.y + dir.y * speed * dt, bounds.y, bounds.y + bounds.h - feet.h)
  if (!blocked({ ...feet, x: next.x, y: tryY }, obstacles)) next.y = tryY
  return next
}

export function isNear(a: Vec, b: Vec, radius: number): boolean {
  return Math.hypot(a.x - b.x, a.y - b.y) <= radius
}
```

- [ ] **Step 5: Run tests to verify they pass**

Run: `cd site && npm test`
Expected: PASS — 9 tests.

- [ ] **Step 6: Commit**

```bash
git add site/package.json site/package-lock.json site/tsconfig.json site/assets/js/games/lib/
git commit -m "add npm scaffold and tested game logic library"
```

---

### Task 2: /play/ section — content, layouts, nav, CSS, bundling pipeline

**Files:**
- Create: `site/content/play/_index.md`
- Create: `site/content/play/wake-up/index.md`
- Create: `site/layouts/play/section.html`
- Create: `site/layouts/play/single.html`
- Create: `site/assets/js/games/wake-up/main.ts` (stub, replaced in Task 4)
- Modify: `site/layouts/baseof.html:20` (nav)
- Modify: `site/assets/css/main.css` (append)

**Interfaces:**
- Consumes: nothing
- Produces (relied on by Tasks 3–5):
  - Game pages declare `entry` in front matter; `single.html` inlines `assets/js/games/<entry>/scene.svg` (when present) inside `<div class="game-stage">` and bundles `assets/js/games/<entry>/main.ts`
  - The DOM contract for game code: `.game-stage` (contains the inlined SVG) and an empty `.game-ui` sibling

- [ ] **Step 1: Create content pages**

Create `site/content/play/_index.md`:

```markdown
---
title: Play
---
```

Create `site/content/play/wake-up/index.md`:

```markdown
---
title: Wake Up
entry: wake-up
summary: A morning. A door. A good day ahead.
---

Arrow keys or WASD to move. E or Space to interact.
```

- [ ] **Step 2: Create the lobby template**

Create `site/layouts/play/section.html`:

```html
{{ define "main" }}
<div class="play-page">
  <h1>{{ .Title }}</h1>
  <ul class="play-grid">
    {{ range .Pages }}
    <li class="play-card">
      <a href="{{ .RelPermalink }}">
        <span class="play-title">{{ .Title }}</span>
        <span class="play-summary">{{ .Params.summary }}</span>
      </a>
    </li>
    {{ end }}
  </ul>
</div>
{{ end }}
```

- [ ] **Step 3: Create the game shell template**

Create `site/layouts/play/single.html`:

```html
{{ define "main" }}
<div class="play-page game-page">
  <h1>{{ .Title }}</h1>
  <div class="game-intro">{{ .Content }}</div>
  {{ with .Params.entry }}
  <div class="game-stage">
    {{ with resources.Get (printf "js/games/%s/scene.svg" .) }}{{ .Content | safeHTML }}{{ end }}
    <div class="game-ui"></div>
  </div>
  {{ with resources.Get (printf "js/games/%s/main.ts" .) }}
  {{ with . | js.Build (dict "minify" true "target" "es2020") | fingerprint }}
  <script defer src="{{ .RelPermalink }}"></script>
  {{ end }}{{ end }}
  {{ end }}
</div>
{{ end }}
```

- [ ] **Step 4: Create the stub entry point**

Create `site/assets/js/games/wake-up/main.ts`:

```ts
const ui = document.querySelector<HTMLElement>(".game-ui")
if (ui) ui.textContent = "Wake Up is under construction."
```

- [ ] **Step 5: Add Play to the site nav**

In `site/layouts/baseof.html`, change:

```html
    <nav><a href="/games/">Games</a></nav>
```

to:

```html
    <nav><a href="/play/">Play</a> <a href="/games/">Games</a></nav>
```

- [ ] **Step 6: Add lobby and stage CSS**

Append to `site/assets/css/main.css`:

```css
.play-page {
  max-width: 64rem;
  margin: 0 auto;
  padding: var(--space-3);
}

.play-grid {
  list-style: none;
  margin: 0;
  padding: 0;
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(14rem, 1fr));
  gap: var(--space-3);
}

.play-card a {
  display: flex;
  flex-direction: column;
  gap: var(--space-1);
  padding: var(--space-3);
  background: var(--surface);
  border: 1px solid var(--border);
  border-radius: var(--radius);
  text-decoration: none;
}

.play-card .play-title {
  color: var(--fg);
  font-weight: 700;
}

.play-card .play-summary {
  color: var(--muted);
  font-size: 0.9rem;
}

.game-intro {
  color: var(--muted);
}

.game-stage {
  position: relative;
  max-width: 40rem;
  margin: var(--space-3) 0;
  border: 1px solid var(--border);
  border-radius: var(--radius);
  overflow: hidden;
}

.game-stage svg {
  display: block;
  width: 100%;
  height: auto;
}
```

- [ ] **Step 7: Build and verify in the browser**

Run: `hugo -s site --printPathWarnings`
Expected: builds with no errors, no path warnings.

Open the dev server (`.claude/launch.json` entry running `hugo server -s site`), visit `/play/`:
- Lobby shows one card, "Wake Up", with the summary line.
- Card links to `/play/wake-up/`, which shows the title, the intro line, and "Wake Up is under construction." inside the stage (no SVG yet, so the stage is just the bordered box).
- Nav shows Play before Games on every page.

- [ ] **Step 8: Commit**

```bash
git add site/content/play/ site/layouts/play/ site/layouts/baseof.html site/assets/css/main.css site/assets/js/games/wake-up/
git commit -m "add /play/ section with lobby, game shell, and bundling pipeline"
```

---

### Task 3: Bedroom scene and hero sprite (SVG art)

**Files:**
- Create: `site/assets/js/games/wake-up/scene.svg`

**Interfaces:**
- Consumes: `single.html` inlines this file inside `.game-stage` (Task 2)
- Produces (relied on by Task 4 — these exact ids/classes/attributes):
  - Root `<svg>` with `viewBox="0 0 320 180"` and `shape-rendering="crispEdges"`
  - `<rect id="floor">` — the walkable bounds
  - `<rect class="obstacle">` elements — collision footprints (invisible, `fill="none"`)
  - `<g id="door-target" data-x="292" data-y="126">` — interaction point
  - `<g id="hero" transform="translate(64 96)">` containing `<g id="hero-body">` with the sprite drawn in a local 16×44 box, feet box = local `(1, 38, 14, 6)`

This is art: the executing agent should treat the code below as the starting draft, render it in the browser, and iterate on proportions and palette until it reads well — keeping every id, class, data attribute, viewBox, and the hero's 16×44 local box exactly as specified.

- [ ] **Step 1: Create the scene**

Create `site/assets/js/games/wake-up/scene.svg`:

```xml
<svg viewBox="0 0 320 180" xmlns="http://www.w3.org/2000/svg" shape-rendering="crispEdges" role="img" aria-label="A pixel-art bedroom in morning light">
  <rect width="320" height="180" fill="#2b2635"/>
  <rect x="8" y="8" width="304" height="104" fill="#4a4458"/>
  <rect x="8" y="104" width="304" height="8" fill="#3a3448"/>
  <rect x="8" y="112" width="304" height="60" fill="#8a6244"/>
  <rect x="8" y="112" width="304" height="4" fill="#6f4e36"/>
  <g id="window">
    <rect x="48" y="24" width="56" height="44" fill="#2b2635"/>
    <rect x="52" y="28" width="48" height="36" fill="#ffd98a"/>
    <rect x="74" y="28" width="4" height="36" fill="#2b2635"/>
    <rect x="52" y="44" width="48" height="4" fill="#2b2635"/>
    <rect x="60" y="32" width="12" height="8" fill="#ffe9b8"/>
  </g>
  <g id="bed">
    <rect x="24" y="118" width="72" height="34" fill="#5a3d2b"/>
    <rect x="26" y="112" width="68" height="30" fill="#d9d3c7"/>
    <rect x="28" y="114" width="20" height="12" fill="#f2ede2"/>
    <rect x="26" y="128" width="68" height="14" fill="#7a4b8f"/>
    <rect x="26" y="128" width="68" height="4" fill="#8f5ba6"/>
  </g>
  <g id="nightstand">
    <rect x="104" y="120" width="20" height="20" fill="#5a3d2b"/>
    <rect x="106" y="114" width="16" height="8" fill="#6f4e36"/>
    <rect x="110" y="106" width="8" height="10" fill="#ffd98a"/>
  </g>
  <g id="rug">
    <rect x="140" y="132" width="88" height="28" fill="#3f6f5a"/>
    <rect x="144" y="136" width="80" height="20" fill="#4d8a6f"/>
  </g>
  <g id="door">
    <rect x="276" y="40" width="34" height="72" fill="#5a3d2b"/>
    <rect x="280" y="44" width="26" height="68" fill="#8a6244"/>
    <rect x="282" y="48" width="22" height="26" fill="#7a563c"/>
    <rect x="282" y="80" width="22" height="28" fill="#7a563c"/>
    <rect x="284" y="76" width="4" height="4" fill="#ffd98a"/>
  </g>
  <g id="door-target" data-x="292" data-y="126"/>
  <rect id="floor" x="12" y="116" width="296" height="56" fill="none"/>
  <rect class="obstacle" x="24" y="118" width="100" height="26" fill="none"/>
  <g id="hero" transform="translate(64 96)">
    <g id="hero-body">
      <rect x="1" y="0" width="14" height="5" fill="#4a3524"/>
      <rect x="0" y="2" width="16" height="4" fill="#4a3524"/>
      <rect x="0" y="6" width="3" height="4" fill="#4a3524"/>
      <rect x="13" y="6" width="3" height="4" fill="#4a3524"/>
      <rect x="2" y="1" width="3" height="3" fill="#5c4430"/>
      <rect x="7" y="0" width="3" height="3" fill="#5c4430"/>
      <rect x="12" y="2" width="3" height="3" fill="#5c4430"/>
      <rect x="3" y="5" width="10" height="8" fill="#e8b88a"/>
      <g id="hero-eyes">
        <rect x="5" y="8" width="2" height="2" fill="#2b2b2b"/>
        <rect x="9" y="8" width="2" height="2" fill="#2b2b2b"/>
      </g>
      <rect x="3" y="12" width="10" height="5" fill="#4a3524"/>
      <rect x="6" y="13" width="4" height="2" fill="#5c4430"/>
      <rect x="2" y="17" width="12" height="13" fill="#3f6f8e"/>
      <rect x="2" y="17" width="12" height="3" fill="#4d82a3"/>
      <rect x="0" y="18" width="3" height="10" fill="#3f6f8e"/>
      <rect x="13" y="18" width="3" height="10" fill="#3f6f8e"/>
      <rect x="0" y="28" width="3" height="3" fill="#e8b88a"/>
      <rect x="13" y="28" width="3" height="3" fill="#e8b88a"/>
      <rect x="3" y="30" width="4" height="11" fill="#4a4a5a"/>
      <rect x="9" y="30" width="4" height="11" fill="#4a4a5a"/>
      <rect x="2" y="41" width="6" height="3" fill="#2b2b2b"/>
      <rect x="8" y="41" width="6" height="3" fill="#2b2b2b"/>
    </g>
  </g>
</svg>
```

- [ ] **Step 2: Verify in the browser and iterate on the art**

With the dev server running, open `/play/wake-up/` and check:
- The room reads as a bedroom: window with morning light, bed with pillow and blanket, nightstand with lamp, rug, door on the right wall.
- The hero stands by the bed — tall (sprite is taller than half the door), curly dark hair, full beard.
- Shapes are chunky and crisp at any browser width (no anti-aliasing blur).

Iterate on colors and shapes until it looks good; do not change the ids, classes, data attributes, viewBox, or the hero's local geometry contract.

- [ ] **Step 3: Commit**

```bash
git add site/assets/js/games/wake-up/scene.svg
git commit -m "draw wake-up bedroom scene and hero sprite"
```

---

### Task 4: Player movement and door proximity

**Files:**
- Modify: `site/assets/js/games/wake-up/main.ts` (replace the stub entirely)

**Interfaces:**
- Consumes: `directionFromKeys`, `stepPosition`, `isNear`, `Rect`, `Vec` from `../lib/logic` (Task 1); scene ids/classes (Task 3); `.game-stage`/`.game-ui` DOM contract (Task 2)
- Produces (extended in Task 5): module-level `keys` set, `feet` rect, the rAF loop, and the `hint` element

- [ ] **Step 1: Replace the stub with the movement implementation**

Replace the full contents of `site/assets/js/games/wake-up/main.ts`:

```ts
import { directionFromKeys, isNear, stepPosition, type Rect, type Vec } from "../lib/logic"

const SPEED = 70
const INTERACT_RADIUS = 26
const SPRITE_W = 16
const FEET = { dx: 1, dy: 38, w: 14, h: 6 }

const stage = document.querySelector<HTMLElement>(".game-stage")
const ui = document.querySelector<HTMLElement>(".game-ui")
const svg = stage?.querySelector<SVGSVGElement>("svg")
const hero = svg?.querySelector<SVGGElement>("#hero")
const floorEl = svg?.querySelector<SVGRectElement>("#floor")
const doorEl = svg?.querySelector<SVGGElement>("#door-target")

if (stage && ui && svg && hero && floorEl && doorEl) {
  start(stage, ui, svg, hero, floorEl, doorEl)
}

function rectFrom(el: SVGRectElement): Rect {
  return {
    x: Number(el.getAttribute("x")),
    y: Number(el.getAttribute("y")),
    w: Number(el.getAttribute("width")),
    h: Number(el.getAttribute("height")),
  }
}

function feetCenter(feet: Rect): Vec {
  return { x: feet.x + feet.w / 2, y: feet.y + feet.h / 2 }
}

function start(
  stage: HTMLElement,
  ui: HTMLElement,
  svg: SVGSVGElement,
  hero: SVGGElement,
  floorEl: SVGRectElement,
  doorEl: SVGGElement,
) {
  const bounds = rectFrom(floorEl)
  const obstacles = Array.from(svg.querySelectorAll<SVGRectElement>(".obstacle")).map(rectFrom)
  const door: Vec = { x: Number(doorEl.dataset.x), y: Number(doorEl.dataset.y) }

  const startMatch = /translate\((-?\d+)[ ,](-?\d+)\)/.exec(hero.getAttribute("transform") ?? "")
  let feet: Rect = {
    x: (startMatch ? Number(startMatch[1]) : 64) + FEET.dx,
    y: (startMatch ? Number(startMatch[2]) : 96) + FEET.dy,
    w: FEET.w,
    h: FEET.h,
  }
  let facing = 1

  const hint = document.createElement("div")
  hint.className = "game-hint"
  hint.textContent = "Press E to open the door"
  hint.hidden = true
  ui.append(hint)

  const keys = new Set<string>()
  const MOVE_KEYS = ["arrowup", "arrowdown", "arrowleft", "arrowright", "w", "a", "s", "d", " ", "e"]
  window.addEventListener("keydown", (ev) => {
    const key = ev.key.toLowerCase()
    if (!MOVE_KEYS.includes(key)) return
    ev.preventDefault()
    keys.add(key)
  })
  window.addEventListener("keyup", (ev) => {
    keys.delete(ev.key.toLowerCase())
  })

  let last = performance.now()
  function frame(now: number) {
    const dt = Math.min((now - last) / 1000, 0.05)
    last = now
    const dir = directionFromKeys(keys)
    if (dir.x !== 0) facing = dir.x > 0 ? 1 : -1
    feet = { ...feet, ...stepPosition(feet, dir, SPEED, dt, bounds, obstacles) }
    const flip = facing === -1 ? ` translate(${SPRITE_W} 0) scale(-1 1)` : ""
    hero.setAttribute("transform", `translate(${feet.x - FEET.dx} ${feet.y - FEET.dy})${flip}`)
    hint.hidden = !isNear(feetCenter(feet), door, INTERACT_RADIUS)
    requestAnimationFrame(frame)
  }
  requestAnimationFrame(frame)
}
```

- [ ] **Step 2: Run the existing tests**

Run: `cd site && npm test`
Expected: PASS — 8 tests (nothing broken).

- [ ] **Step 3: Verify in the browser**

Rebuild/reload `/play/wake-up/` and check:
- Arrow keys and WASD move the hero smoothly around the floor; diagonals are not faster than straight lines.
- The hero cannot walk through the bed/nightstand footprint, off the floor, or into the walls.
- The sprite faces left when moving left and right when moving right.
- Walking next to the door shows "Press E to open the door"; walking away hides it.
- Arrow keys do not scroll the page while playing.

- [ ] **Step 4: Commit**

```bash
git add site/assets/js/games/wake-up/main.ts
git commit -m "add player movement and door proximity to wake-up"
```

---

### Task 5: Interaction, dialogue, fade to black, end card

**Files:**
- Create: `site/assets/js/games/lib/phase.ts`
- Test: `site/assets/js/games/lib/phase.test.ts`
- Modify: `site/assets/js/games/wake-up/main.ts`
- Modify: `site/assets/css/main.css` (append)

**Interfaces:**
- Consumes: everything Task 4 produced; `gsap` from npm
- Produces:
  - `type Phase = "explore" | "dialogue" | "ending"`
  - `nextPhase(phase: Phase, event: "interact" | "dismiss"): Phase`

- [ ] **Step 1: Write the failing phase-machine tests**

Create `site/assets/js/games/lib/phase.test.ts`:

```ts
import { describe, expect, it } from "vitest"
import { nextPhase } from "./phase"

describe("nextPhase", () => {
  it("interact during explore opens the dialogue", () => {
    expect(nextPhase("explore", "interact")).toBe("dialogue")
  })

  it("dismiss during dialogue starts the ending", () => {
    expect(nextPhase("dialogue", "dismiss")).toBe("ending")
  })

  it("ignores dismiss during explore", () => {
    expect(nextPhase("explore", "dismiss")).toBe("explore")
  })

  it("ignores interact during dialogue", () => {
    expect(nextPhase("dialogue", "interact")).toBe("dialogue")
  })

  it("the ending is terminal", () => {
    expect(nextPhase("ending", "interact")).toBe("ending")
    expect(nextPhase("ending", "dismiss")).toBe("ending")
  })
})
```

- [ ] **Step 2: Run tests to verify they fail**

Run: `cd site && npm test`
Expected: FAIL — cannot resolve `./phase`.

- [ ] **Step 3: Implement the phase machine**

Create `site/assets/js/games/lib/phase.ts`:

```ts
export type Phase = "explore" | "dialogue" | "ending"

export function nextPhase(phase: Phase, event: "interact" | "dismiss"): Phase {
  if (phase === "explore" && event === "interact") return "dialogue"
  if (phase === "dialogue" && event === "dismiss") return "ending"
  return phase
}
```

- [ ] **Step 4: Run tests to verify they pass**

Run: `cd site && npm test`
Expected: PASS — 14 tests.

- [ ] **Step 5: Wire interaction, dialogue, and ending into the game**

Replace the full contents of `site/assets/js/games/wake-up/main.ts`:

```ts
import gsap from "gsap"
import { directionFromKeys, isNear, stepPosition, type Rect, type Vec } from "../lib/logic"
import { nextPhase, type Phase } from "../lib/phase"

const SPEED = 70
const INTERACT_RADIUS = 26
const SPRITE_W = 16
const FEET = { dx: 1, dy: 38, w: 14, h: 6 }
const DIALOGUE_TEXT = "Good morning. Today will be a good day"
const END_TEXT = "ENJOY YOUR DAY. YOU ARE LOVED."

const stage = document.querySelector<HTMLElement>(".game-stage")
const ui = document.querySelector<HTMLElement>(".game-ui")
const svg = stage?.querySelector<SVGSVGElement>("svg")
const hero = svg?.querySelector<SVGGElement>("#hero")
const floorEl = svg?.querySelector<SVGRectElement>("#floor")
const doorEl = svg?.querySelector<SVGGElement>("#door-target")

if (stage && ui && svg && hero && floorEl && doorEl) {
  start(stage, ui, svg, hero, floorEl, doorEl)
}

function rectFrom(el: SVGRectElement): Rect {
  return {
    x: Number(el.getAttribute("x")),
    y: Number(el.getAttribute("y")),
    w: Number(el.getAttribute("width")),
    h: Number(el.getAttribute("height")),
  }
}

function feetCenter(feet: Rect): Vec {
  return { x: feet.x + feet.w / 2, y: feet.y + feet.h / 2 }
}

function makeUi(ui: HTMLElement) {
  const hint = document.createElement("div")
  hint.className = "game-hint"
  hint.textContent = "Press E to open the door"
  hint.hidden = true

  const dialogue = document.createElement("div")
  dialogue.className = "game-dialogue"
  dialogue.hidden = true
  const line = document.createElement("p")
  line.textContent = DIALOGUE_TEXT
  const cont = document.createElement("span")
  cont.className = "game-dialogue-hint"
  cont.textContent = "E to continue"
  dialogue.append(line, cont)

  const overlay = document.createElement("div")
  overlay.className = "game-fade"

  const endCard = document.createElement("div")
  endCard.className = "game-end-card"
  endCard.textContent = END_TEXT

  ui.append(hint, dialogue, overlay, endCard)
  return { hint, dialogue, overlay, endCard }
}

function start(
  stage: HTMLElement,
  ui: HTMLElement,
  svg: SVGSVGElement,
  hero: SVGGElement,
  floorEl: SVGRectElement,
  doorEl: SVGGElement,
) {
  const bounds = rectFrom(floorEl)
  const obstacles = Array.from(svg.querySelectorAll<SVGRectElement>(".obstacle")).map(rectFrom)
  const door: Vec = { x: Number(doorEl.dataset.x), y: Number(doorEl.dataset.y) }

  const startMatch = /translate\((-?\d+)[ ,](-?\d+)\)/.exec(hero.getAttribute("transform") ?? "")
  let feet: Rect = {
    x: (startMatch ? Number(startMatch[1]) : 64) + FEET.dx,
    y: (startMatch ? Number(startMatch[2]) : 96) + FEET.dy,
    w: FEET.w,
    h: FEET.h,
  }
  let facing = 1
  let phase: Phase = "explore"

  const { hint, dialogue, overlay, endCard } = makeUi(ui)

  function playEnding() {
    hint.hidden = true
    const tl = gsap.timeline()
    tl.to(overlay, { autoAlpha: 1, duration: 1.4, ease: "power2.inOut" })
    tl.to(endCard, { autoAlpha: 1, duration: 1.0, ease: "power1.out" }, "+=0.4")
  }

  function onEvent(event: "interact" | "dismiss") {
    const before = phase
    phase = nextPhase(phase, event)
    if (phase === before) return
    if (phase === "dialogue") dialogue.hidden = false
    if (phase === "ending") {
      dialogue.hidden = true
      playEnding()
    }
  }

  const keys = new Set<string>()
  const GAME_KEYS = ["arrowup", "arrowdown", "arrowleft", "arrowright", "w", "a", "s", "d", " ", "e"]
  window.addEventListener("keydown", (ev) => {
    const key = ev.key.toLowerCase()
    if (!GAME_KEYS.includes(key)) return
    ev.preventDefault()
    if (ev.repeat) return
    keys.add(key)
    if (key === "e" || key === " ") {
      if (phase === "explore" && isNear(feetCenter(feet), door, INTERACT_RADIUS)) onEvent("interact")
      else if (phase === "dialogue") onEvent("dismiss")
    }
  })
  window.addEventListener("keyup", (ev) => {
    keys.delete(ev.key.toLowerCase())
  })

  let last = performance.now()
  function frame(now: number) {
    const dt = Math.min((now - last) / 1000, 0.05)
    last = now
    if (phase === "explore") {
      const dir = directionFromKeys(keys)
      if (dir.x !== 0) facing = dir.x > 0 ? 1 : -1
      feet = { ...feet, ...stepPosition(feet, dir, SPEED, dt, bounds, obstacles) }
      const flip = facing === -1 ? ` translate(${SPRITE_W} 0) scale(-1 1)` : ""
      hero.setAttribute("transform", `translate(${feet.x - FEET.dx} ${feet.y - FEET.dy})${flip}`)
      hint.hidden = !isNear(feetCenter(feet), door, INTERACT_RADIUS)
    }
    if (phase !== "ending") requestAnimationFrame(frame)
  }
  requestAnimationFrame(frame)
}
```

- [ ] **Step 6: Add the dialogue, fade, and end-card CSS**

Append to `site/assets/css/main.css`:

```css
.game-hint {
  position: absolute;
  top: var(--space-2);
  left: 50%;
  transform: translateX(-50%);
  padding: var(--space-1) var(--space-2);
  background: rgba(0, 0, 0, 0.7);
  color: #ffffff;
  font-size: 0.85rem;
  border-radius: var(--radius);
}

.game-dialogue {
  position: absolute;
  left: var(--space-2);
  right: var(--space-2);
  bottom: var(--space-2);
  padding: var(--space-2) var(--space-3);
  background: rgba(0, 0, 0, 0.85);
  border: 2px solid #ffffff;
  border-radius: var(--radius);
  color: #ffffff;
}

.game-dialogue p {
  margin: 0;
}

.game-dialogue-hint {
  display: block;
  margin-top: var(--space-1);
  font-size: 0.75rem;
  opacity: 0.7;
  text-align: right;
}

.game-fade {
  position: absolute;
  inset: 0;
  background: #000000;
  opacity: 0;
  visibility: hidden;
}

.game-end-card {
  position: absolute;
  inset: 0;
  display: flex;
  align-items: center;
  justify-content: center;
  padding: var(--space-3);
  color: #ffffff;
  font-weight: 700;
  font-size: 1.4rem;
  letter-spacing: 0.08em;
  text-align: center;
  opacity: 0;
  visibility: hidden;
}
```

- [ ] **Step 7: Verify the full loop in the browser**

Rebuild/reload `/play/wake-up/` and play it end to end:
- Walk to the door; the hint appears; press E.
- The dialogue box shows exactly: "Good morning. Today will be a good day" with "E to continue".
- Pressing E or Space again hides the dialogue; the scene fades to black over ~1.4s.
- Bold white centered text fades in, exactly: "ENJOY YOUR DAY. YOU ARE LOVED."
- After the ending, movement keys do nothing and the end card stays.
- Pressing E away from the door does nothing; Space near the door also interacts.
- Check the browser console for errors: there must be none.

- [ ] **Step 8: Commit**

```bash
git add site/assets/js/games/lib/phase.ts site/assets/js/games/lib/phase.test.ts site/assets/js/games/wake-up/main.ts site/assets/css/main.css
git commit -m "complete wake-up loop with dialogue and end card"
```

---

### Task 6: Docs, deploy notes, and final verification

**Files:**
- Modify: `CLAUDE.md` (architecture section)
- Modify: `README.md` (if it describes the site sections)

**Interfaces:**
- Consumes: everything prior
- Produces: nothing (documentation and verification only)

- [ ] **Step 1: Update CLAUDE.md architecture**

In the root `CLAUDE.md` under `## Architecture`, after the `/site` line, add:

```markdown
- /play — browser games section: one Hugo page per game, TypeScript entries in site/assets/js/games/<game>/ bundled by js.Build, pure logic in site/assets/js/games/lib/ tested with vitest (npm test in /site), GSAP vendored via site/package.json
```

- [ ] **Step 2: Update README if it lists site sections**

Read `README.md`; if it describes the site's structure or sections, add a matching one-line mention of `/play/`. If it doesn't go into that detail, skip this step.

- [ ] **Step 3: Full verification**

Run: `cd site && npm test`
Expected: PASS — 14 tests.

Run: `hugo -s site --printPathWarnings`
Expected: clean build.

Play the game once more end to end in the browser (per Task 5 Step 7 checklist).

- [ ] **Step 4: Commit**

```bash
git add CLAUDE.md README.md
git commit -m "document /play/ games section"
```

- [ ] **Step 5: Deploy check (after push)**

Pushing to master triggers Cloudflare Pages. The Pages project root dir is `site`; with `site/package.json` and `site/package-lock.json` committed, Pages auto-installs npm deps before running the Hugo build. After the deploy, verify `https://jeffabliss.com/play/wake-up/` loads and plays. If the Pages build fails on dependency install, check the build log — the fix is usually setting the build command to `npm ci && hugo` in the Pages dashboard (a manual step for Jeff).
