# PSN Trophy Site Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Rebuild jeffabliss.com as a Hugo site with a `/games` achievement log driven by PlayStation trophy data synced daily via a Node/psn-api script and GitHub Actions.

**Architecture:** A Node + TypeScript script in `/sync` fetches trophy data from Sony via `psn-api` and writes deterministic JSON into `/site/data/psn/` (one file per game + `summary.json`). Hugo (vanilla layout, no mounts) generates per-game pages from that data via a content adapter and renders the `/games` list page from `summary.json`. Alpine.js (vendored) provides the platform filter and feed pagination client-side. GitHub Actions runs the sync daily and commits changes; Cloudflare Pages rebuilds on push.

**Tech Stack:** Hugo extended ≥ 0.126 (modern template layout), Node 24+ / TypeScript / tsx / vitest, psn-api ^2.18.1, Alpine.js 3.x (vendored single file), hand-rolled CSS, GitHub Actions, Cloudflare Pages.

**Spec:** `docs/superpowers/specs/2026-08-30-psn-trophy-site-design.md`

## Global Constraints

- Do NOT write comments in code — applies to TS, templates, CSS, JS, YAML.
- Hugo extended, pinned ≥ 0.126; use the modern template layout (`layouts/baseof.html`, `layouts/games/section.html` — no `_default/` directory).
- No CDN dependencies; Alpine.js is vendored into `site/assets/js/`.
- No CSS frameworks; one stylesheet `site/assets/css/main.css` with `:root` design tokens + `prefers-color-scheme: dark` override.
- Sync output must be deterministic: fixed key order, trophies sorted by `id`, 2-space indent, trailing newline. Unchanged data ⇒ byte-identical files.
- Sync performs no partial writes: fetch everything into memory, then write all files.
- The `NPSSO` credential is never committed and never printed; locally it lives in `sync/.env` (gitignored), in CI as the `NPSSO` repository secret.
- Commit messages end with `Co-Authored-By: Claude claude-fable-5 <noreply@anthropic.com>`.
- URLs: list page `/games/`, detail pages `/games/{slug}/` where slug is platform-prefixed, e.g. `psn-astro-bot`.

---

### Task 1: Repo teardown + new skeleton

**Files:**
- Delete: `src/`, `public/`, `worker/`, `dist/`, `node_modules/`, `index.html`, `vite.config.js`, `.eslintrc.cjs`, `.eslintrc.json`, `package.json`, `package-lock.json`, `.github/workflows/static.yml`, `.idea/`, `.DS_Store`
- Rewrite: `.gitignore`, `README.md`, `CLAUDE.md`

**Interfaces:**
- Produces: a clean repo containing only `.claude/`, `.github/` (empty workflows dir), `docs/`, `CLAUDE.md`, `README.md`, `.gitignore`.

- [ ] **Step 1: Delete the old site**

```bash
cd /Users/jbliss/WebstormProjects/jeffabliss.com
git rm -r --quiet src public worker index.html vite.config.js .eslintrc.cjs .eslintrc.json package.json package-lock.json .github/workflows/static.yml
rm -rf node_modules dist .idea .DS_Store
```

- [ ] **Step 2: Rewrite `.gitignore`**

```
node_modules
dist
.env
.DS_Store
.idea
site/public
site/resources/_gen
.hugo_build.lock
.superpowers/
```

- [ ] **Step 3: Rewrite `README.md`**

```markdown
# jeffabliss.com

Personal site built with Hugo. `/games` is an achievement log driven by
PlayStation trophy data synced daily by a Node script (`/sync`) via GitHub
Actions. Hosted on Cloudflare Pages.

- `/sync` — Node + TypeScript sync script (psn-api)
- `/site` — Hugo site; trophy data lives in `site/data/psn/`
- `.github/workflows/sync.yml` — daily sync + commit
```

- [ ] **Step 4: Rewrite `CLAUDE.md`**

```markdown
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
```

- [ ] **Step 5: Verify and commit**

Run: `git status --short`
Expected: only deletions (D) and modified `.gitignore`/`README.md`/`CLAUDE.md`; `ls` shows `CLAUDE.md README.md docs` plus dotfiles.

```bash
git add -A
git commit -m "$(cat <<'EOF'
tear down React site and nice-check-xiv worker

Co-Authored-By: Claude claude-fable-5 <noreply@anthropic.com>
EOF
)"
```

---

### Task 2: Sync scaffold + types + deterministic serialization

**Files:**
- Create: `sync/package.json`, `sync/tsconfig.json`, `sync/src/types.ts`, `sync/src/serialize.ts`
- Test: `sync/src/serialize.test.ts`

**Interfaces:**
- Produces:
  - `slugify(name: string): string` — lowercase, diacritics stripped, `&` → `and`, apostrophes removed, non-alphanumerics collapsed to single hyphens, trimmed.
  - `buildGameFile(title: TrophyTitle, trophies: TrophyOut[]): GameFile` — fixed key order, trophies sorted by id, slug `psn-{slugify(name)}`.
  - `dedupeSlugs(games: GameFile[]): GameFile[]` — appends `-{slugify(titlePlatform)}` to colliding slugs, then `-{gameId lowercased}` if still colliding.
  - `serializeGame(game: GameFile): string` / `serializeSummary(summary: Summary): string` — `JSON.stringify(x, null, 2) + "\n"`.
  - Types `TrophyOut`, `GameFile`, `SummaryGame`, `RecentTrophy`, `Summary` (exact shapes below) consumed by Tasks 3–4 and by Hugo templates in Tasks 6–8.

- [ ] **Step 1: Scaffold the package**

`sync/package.json`:

```json
{
  "name": "psn-sync",
  "private": true,
  "type": "module",
  "scripts": {
    "sync": "node --env-file-if-exists=.env --import tsx src/index.ts",
    "test": "vitest run",
    "typecheck": "tsc --noEmit"
  },
  "dependencies": {
    "psn-api": "^2.18.1"
  },
  "devDependencies": {
    "@types/node": "^24.0.0",
    "tsx": "^4.19.0",
    "typescript": "^5.6.0",
    "vitest": "^3.0.0"
  }
}
```

`sync/tsconfig.json`:

```json
{
  "compilerOptions": {
    "target": "ES2023",
    "module": "NodeNext",
    "moduleResolution": "NodeNext",
    "strict": true,
    "noEmit": true,
    "skipLibCheck": true
  },
  "include": ["src"]
}
```

Run: `cd sync && npm install`
Expected: lockfile created, no errors.

- [ ] **Step 2: Write `sync/src/types.ts`**

```typescript
export interface TrophyOut {
  id: number;
  name: string;
  description: string;
  type: "bronze" | "silver" | "gold" | "platinum";
  hidden: boolean;
  iconUrl: string | null;
  earned: boolean;
  earnedAt: string | null;
  rarityPercent: number | null;
}

export interface GameFile {
  platform: "psn";
  gameId: string;
  slug: string;
  name: string;
  titlePlatform: string;
  progressPercent: number;
  lastUpdated: string;
  trophies: TrophyOut[];
}

export interface SummaryGame {
  name: string;
  gameId: string;
  slug: string;
  platform: string;
  titlePlatform: string;
  progressPercent: number;
  earnedCount: number;
  totalCount: number;
  lastEarnedAt: string | null;
}

export interface RecentTrophy {
  platform: string;
  gameName: string;
  gameId: string;
  slug: string;
  trophyName: string;
  trophyType: string;
  iconUrl: string | null;
  earnedAt: string;
}

export interface Summary {
  totals: {
    bronze: number;
    silver: number;
    gold: number;
    platinum: number;
  };
  gameCount: number;
  averageCompletion: number;
  recentTrophies: RecentTrophy[];
  games: SummaryGame[];
}
```

- [ ] **Step 3: Write the failing tests**

`sync/src/serialize.test.ts`:

```typescript
import { describe, expect, it } from "vitest";
import type { TrophyTitle } from "psn-api";
import { buildGameFile, dedupeSlugs, serializeGame, slugify } from "./serialize.js";
import type { TrophyOut } from "./types.js";

function title(overrides: Partial<TrophyTitle> = {}): TrophyTitle {
  return {
    npServiceName: "trophy2",
    npCommunicationId: "NPWR12345_00",
    trophySetVersion: "01.00",
    trophyTitleName: "ASTRO BOT™",
    trophyTitleIconUrl: "https://img.example/icon.png",
    trophyTitlePlatform: "PS5",
    hasTrophyGroups: false,
    definedTrophies: { bronze: 1, silver: 1, gold: 0, platinum: 0 },
    progress: 50,
    earnedTrophies: { bronze: 1, silver: 0, gold: 0, platinum: 0 },
    hiddenFlag: false,
    lastUpdatedDateTime: "2026-08-01T10:00:00Z",
    ...overrides,
  } as TrophyTitle;
}

function trophy(id: number, overrides: Partial<TrophyOut> = {}): TrophyOut {
  return {
    id,
    name: `Trophy ${id}`,
    description: `Do thing ${id}`,
    type: "bronze",
    hidden: false,
    iconUrl: "https://img.example/t.png",
    earned: false,
    earnedAt: null,
    rarityPercent: 12.3,
    ...overrides,
  };
}

describe("slugify", () => {
  it("handles trademark symbols, apostrophes, and ampersands", () => {
    expect(slugify("ASTRO BOT™")).toBe("astro-bot");
    expect(slugify("Astro's Playroom")).toBe("astros-playroom");
    expect(slugify("Ratchet & Clank: Rift Apart")).toBe("ratchet-and-clank-rift-apart");
  });
});

describe("buildGameFile", () => {
  it("sorts trophies by id and prefixes the slug with the platform", () => {
    const game = buildGameFile(title(), [trophy(2), trophy(1)]);
    expect(game.slug).toBe("psn-astro-bot");
    expect(game.trophies.map((t) => t.id)).toEqual([1, 2]);
    expect(game.progressPercent).toBe(50);
  });
});

describe("serializeGame", () => {
  it("is deterministic regardless of trophy input order", () => {
    const a = serializeGame(buildGameFile(title(), [trophy(1), trophy(2)]));
    const b = serializeGame(buildGameFile(title(), [trophy(2), trophy(1)]));
    expect(a).toBe(b);
    expect(a.endsWith("\n")).toBe(true);
    expect(JSON.parse(a).platform).toBe("psn");
  });
});

describe("dedupeSlugs", () => {
  it("disambiguates same-name games by title platform", () => {
    const ps5 = buildGameFile(title(), [trophy(1)]);
    const ps4 = buildGameFile(
      title({ npCommunicationId: "NPWR54321_00", trophyTitlePlatform: "PS4" }),
      [trophy(1)]
    );
    const [a, b] = dedupeSlugs([ps5, ps4]);
    expect(a.slug).toBe("psn-astro-bot-ps5");
    expect(b.slug).toBe("psn-astro-bot-ps4");
  });

  it("leaves unique slugs untouched", () => {
    const only = buildGameFile(title(), [trophy(1)]);
    expect(dedupeSlugs([only])[0].slug).toBe("psn-astro-bot");
  });
});
```

- [ ] **Step 4: Run tests to verify they fail**

Run: `cd sync && npm test`
Expected: FAIL — cannot find module `./serialize.js`.

- [ ] **Step 5: Write `sync/src/serialize.ts`**

```typescript
import type { TrophyTitle } from "psn-api";
import type { GameFile, Summary, TrophyOut } from "./types.js";

export function slugify(name: string): string {
  return name
    .normalize("NFKD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[™®©'']/g, "")
    .toLowerCase()
    .replace(/&/g, " and ")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
}

function orderTrophy(t: TrophyOut): TrophyOut {
  return {
    id: t.id,
    name: t.name,
    description: t.description,
    type: t.type,
    hidden: t.hidden,
    iconUrl: t.iconUrl,
    earned: t.earned,
    earnedAt: t.earnedAt,
    rarityPercent: t.rarityPercent,
  };
}

export function buildGameFile(title: TrophyTitle, trophies: TrophyOut[]): GameFile {
  return {
    platform: "psn",
    gameId: title.npCommunicationId,
    slug: `psn-${slugify(title.trophyTitleName)}`,
    name: title.trophyTitleName,
    titlePlatform: title.trophyTitlePlatform,
    progressPercent: title.progress,
    lastUpdated: title.lastUpdatedDateTime,
    trophies: [...trophies].sort((a, b) => a.id - b.id).map(orderTrophy),
  };
}

export function dedupeSlugs(games: GameFile[]): GameFile[] {
  const counts = new Map<string, number>();
  for (const g of games) counts.set(g.slug, (counts.get(g.slug) ?? 0) + 1);
  const withPlatform = games.map((g) =>
    (counts.get(g.slug) ?? 0) > 1 ? { ...g, slug: `${g.slug}-${slugify(g.titlePlatform)}` } : g
  );
  const counts2 = new Map<string, number>();
  for (const g of withPlatform) counts2.set(g.slug, (counts2.get(g.slug) ?? 0) + 1);
  return withPlatform.map((g) =>
    (counts2.get(g.slug) ?? 0) > 1 ? { ...g, slug: `${g.slug}-${g.gameId.toLowerCase()}` } : g
  );
}

export function serializeGame(game: GameFile): string {
  return JSON.stringify(game, null, 2) + "\n";
}

export function serializeSummary(summary: Summary): string {
  return JSON.stringify(summary, null, 2) + "\n";
}
```

- [ ] **Step 6: Run tests to verify they pass**

Run: `cd sync && npm test && npm run typecheck`
Expected: all tests PASS, typecheck clean.

- [ ] **Step 7: Commit**

```bash
git add sync
git commit -m "$(cat <<'EOF'
add sync scaffold with deterministic serialization

Co-Authored-By: Claude claude-fable-5 <noreply@anthropic.com>
EOF
)"
```

---

### Task 3: Summary builder

**Files:**
- Create: `sync/src/summary.ts`
- Test: `sync/src/summary.test.ts`

**Interfaces:**
- Consumes: `GameFile`, `Summary` types from `sync/src/types.ts`.
- Produces: `buildSummary(games: GameFile[]): Summary` — totals of earned trophies by type; `gameCount`; `averageCompletion` (mean of `progressPercent`, one decimal); `recentTrophies` (all earned trophies flattened, sorted `earnedAt` desc with `gameId` then `trophyName` tiebreaks, capped at 100); `games` rollups sorted `lastEarnedAt` desc, games with no earned trophies last, alphabetical within ties.

- [ ] **Step 1: Write the failing tests**

`sync/src/summary.test.ts`:

```typescript
import { describe, expect, it } from "vitest";
import { buildSummary } from "./summary.js";
import type { GameFile, TrophyOut } from "./types.js";

function trophy(id: number, overrides: Partial<TrophyOut> = {}): TrophyOut {
  return {
    id,
    name: `Trophy ${id}`,
    description: "",
    type: "bronze",
    hidden: false,
    iconUrl: null,
    earned: false,
    earnedAt: null,
    rarityPercent: null,
    ...overrides,
  };
}

function game(overrides: Partial<GameFile>): GameFile {
  return {
    platform: "psn",
    gameId: "NPWR00000_00",
    slug: "psn-game",
    name: "Game",
    titlePlatform: "PS5",
    progressPercent: 0,
    lastUpdated: "2026-08-01T00:00:00Z",
    trophies: [],
    ...overrides,
  };
}

const played = game({
  gameId: "NPWR11111_00",
  slug: "psn-alpha",
  name: "Alpha",
  progressPercent: 50,
  trophies: [
    trophy(1, { earned: true, earnedAt: "2026-08-10T10:00:00Z", type: "gold" }),
    trophy(2, { earned: true, earnedAt: "2026-08-20T10:00:00Z" }),
    trophy(3),
    trophy(4),
  ],
});

const older = game({
  gameId: "NPWR22222_00",
  slug: "psn-beta",
  name: "Beta",
  progressPercent: 30,
  trophies: [trophy(1, { earned: true, earnedAt: "2026-07-01T10:00:00Z", type: "platinum" }), trophy(2)],
});

const untouched = game({ gameId: "NPWR33333_00", slug: "psn-zed", name: "Zed", trophies: [trophy(1)] });

describe("buildSummary", () => {
  const summary = buildSummary([untouched, older, played]);

  it("counts earned trophies by type", () => {
    expect(summary.totals).toEqual({ bronze: 1, silver: 0, gold: 1, platinum: 1 });
  });

  it("computes game count and average completion", () => {
    expect(summary.gameCount).toBe(3);
    expect(summary.averageCompletion).toBe(26.7);
  });

  it("sorts recent trophies newest first and caps at 100", () => {
    expect(summary.recentTrophies.map((t) => t.earnedAt)).toEqual([
      "2026-08-20T10:00:00Z",
      "2026-08-10T10:00:00Z",
      "2026-07-01T10:00:00Z",
    ]);
    expect(summary.recentTrophies[0].gameName).toBe("Alpha");
    expect(summary.recentTrophies[0].platform).toBe("psn");
  });

  it("sorts game rollups by recency with unplayed games last", () => {
    expect(summary.games.map((g) => g.name)).toEqual(["Alpha", "Beta", "Zed"]);
    expect(summary.games[0].earnedCount).toBe(2);
    expect(summary.games[0].totalCount).toBe(4);
    expect(summary.games[2].lastEarnedAt).toBeNull();
  });
});

describe("buildSummary with no games", () => {
  it("returns zeroed summary", () => {
    const summary = buildSummary([]);
    expect(summary.gameCount).toBe(0);
    expect(summary.averageCompletion).toBe(0);
    expect(summary.recentTrophies).toEqual([]);
    expect(summary.games).toEqual([]);
  });
});
```

- [ ] **Step 2: Run tests to verify they fail**

Run: `cd sync && npm test`
Expected: FAIL — cannot find module `./summary.js`. (serialize tests still pass.)

- [ ] **Step 3: Write `sync/src/summary.ts`**

```typescript
import type { GameFile, RecentTrophy, Summary, SummaryGame } from "./types.js";

export function buildSummary(games: GameFile[]): Summary {
  const totals = { bronze: 0, silver: 0, gold: 0, platinum: 0 };
  const recent: RecentTrophy[] = [];
  const rollups: SummaryGame[] = [];

  for (const g of games) {
    let lastEarnedAt: string | null = null;
    let earnedCount = 0;
    for (const t of g.trophies) {
      if (!t.earned || !t.earnedAt) continue;
      earnedCount += 1;
      totals[t.type] += 1;
      if (lastEarnedAt === null || t.earnedAt > lastEarnedAt) lastEarnedAt = t.earnedAt;
      recent.push({
        platform: g.platform,
        gameName: g.name,
        gameId: g.gameId,
        slug: g.slug,
        trophyName: t.name,
        trophyType: t.type,
        iconUrl: t.iconUrl,
        earnedAt: t.earnedAt,
      });
    }
    rollups.push({
      name: g.name,
      gameId: g.gameId,
      slug: g.slug,
      platform: g.platform,
      titlePlatform: g.titlePlatform,
      progressPercent: g.progressPercent,
      earnedCount,
      totalCount: g.trophies.length,
      lastEarnedAt,
    });
  }

  recent.sort(
    (a, b) =>
      b.earnedAt.localeCompare(a.earnedAt) ||
      a.gameId.localeCompare(b.gameId) ||
      a.trophyName.localeCompare(b.trophyName)
  );

  rollups.sort((a, b) => {
    if (a.lastEarnedAt && b.lastEarnedAt) {
      return b.lastEarnedAt.localeCompare(a.lastEarnedAt) || a.name.localeCompare(b.name);
    }
    if (a.lastEarnedAt) return -1;
    if (b.lastEarnedAt) return 1;
    return a.name.localeCompare(b.name);
  });

  const gameCount = games.length;
  const averageCompletion =
    gameCount === 0
      ? 0
      : Math.round((games.reduce((sum, g) => sum + g.progressPercent, 0) / gameCount) * 10) / 10;

  return {
    totals,
    gameCount,
    averageCompletion,
    recentTrophies: recent.slice(0, 100),
    games: rollups,
  };
}
```

- [ ] **Step 4: Run tests to verify they pass**

Run: `cd sync && npm test && npm run typecheck`
Expected: all PASS.

- [ ] **Step 5: Commit**

```bash
git add sync/src/summary.ts sync/src/summary.test.ts
git commit -m "$(cat <<'EOF'
add summary builder with totals, recent trophies, and rollups

Co-Authored-By: Claude claude-fable-5 <noreply@anthropic.com>
EOF
)"
```

---

### Task 4: Auth, fetch/merge, orchestrator + live run

**Files:**
- Create: `sync/src/auth.ts`, `sync/src/fetch.ts`, `sync/src/index.ts`, `sync/.env` (gitignored, user-provided NPSSO)
- Test: `sync/src/fetch.test.ts`
- Output: `site/data/psn/*.json` (real data, committed)

**Interfaces:**
- Consumes: `buildGameFile`, `dedupeSlugs`, `serializeGame`, `serializeSummary` (Task 2); `buildSummary` (Task 3).
- Produces: `authenticate(npsso: string): Promise<AuthorizationPayload>`; `fetchAllTitles(auth): Promise<TrophyTitle[]>`; `mergeTrophies(defs: Trophy[], earned: Trophy[]): TrophyOut[]`; `fetchGameTrophies(auth, title): Promise<TrophyOut[]>`; runnable `npm run sync` writing `site/data/psn/`.

- [ ] **Step 1: Write the failing merge test**

`sync/src/fetch.test.ts`:

```typescript
import { describe, expect, it } from "vitest";
import type { Trophy } from "psn-api";
import { mergeTrophies } from "./fetch.js";

const defs: Trophy[] = [
  {
    trophyId: 1,
    trophyHidden: false,
    trophyType: "bronze",
    trophyName: "First Steps",
    trophyDetail: "Take a step",
    trophyIconUrl: "https://img.example/1.png",
    trophyEarnedRate: "80.0",
  },
  {
    trophyId: 2,
    trophyHidden: true,
    trophyType: "gold",
    trophyName: "Secret Ending",
    trophyDetail: "Find the secret",
    trophyIconUrl: "https://img.example/2.png",
    trophyEarnedRate: "5.0",
  },
];

const earned: Trophy[] = [
  {
    trophyId: 1,
    trophyHidden: false,
    trophyType: "bronze",
    earned: true,
    earnedDateTime: "2026-08-15T21:22:08Z",
    trophyEarnedRate: "81.5",
  },
  { trophyId: 2, trophyHidden: true, trophyType: "gold", earned: false, trophyEarnedRate: "5.2" },
];

describe("mergeTrophies", () => {
  it("joins definitions with earned status by trophyId", () => {
    const merged = mergeTrophies(defs, earned);
    expect(merged).toEqual([
      {
        id: 1,
        name: "First Steps",
        description: "Take a step",
        type: "bronze",
        hidden: false,
        iconUrl: "https://img.example/1.png",
        earned: true,
        earnedAt: "2026-08-15T21:22:08Z",
        rarityPercent: 81.5,
      },
      {
        id: 2,
        name: "Secret Ending",
        description: "Find the secret",
        type: "gold",
        hidden: true,
        iconUrl: "https://img.example/2.png",
        earned: false,
        earnedAt: null,
        rarityPercent: 5.2,
      },
    ]);
  });

  it("treats missing earned records as unearned", () => {
    const merged = mergeTrophies(defs, []);
    expect(merged[0].earned).toBe(false);
    expect(merged[0].earnedAt).toBeNull();
    expect(merged[0].rarityPercent).toBe(80);
  });
});
```

- [ ] **Step 2: Run tests to verify they fail**

Run: `cd sync && npm test`
Expected: FAIL — cannot find module `./fetch.js`.

- [ ] **Step 3: Write `sync/src/auth.ts` and `sync/src/fetch.ts`**

`sync/src/auth.ts`:

```typescript
import { exchangeAccessCodeForAuthTokens, exchangeNpssoForAccessCode } from "psn-api";
import type { AuthorizationPayload } from "psn-api";

export async function authenticate(npsso: string): Promise<AuthorizationPayload> {
  const accessCode = await exchangeNpssoForAccessCode(npsso);
  const tokens = await exchangeAccessCodeForAuthTokens(accessCode);
  return { accessToken: tokens.accessToken };
}
```

`sync/src/fetch.ts`:

```typescript
import { getTitleTrophies, getUserTitles, getUserTrophiesEarnedForTitle } from "psn-api";
import type { AuthorizationPayload, Trophy, TrophyTitle } from "psn-api";
import type { TrophyOut } from "./types.js";

export async function fetchAllTitles(auth: AuthorizationPayload): Promise<TrophyTitle[]> {
  const titles: TrophyTitle[] = [];
  let offset = 0;
  for (;;) {
    const page = await getUserTitles(auth, "me", { limit: 800, offset });
    titles.push(...page.trophyTitles);
    if (page.nextOffset == null) break;
    offset = page.nextOffset;
  }
  return titles;
}

export function mergeTrophies(defs: Trophy[], earned: Trophy[]): TrophyOut[] {
  const earnedById = new Map(earned.map((t) => [t.trophyId, t]));
  return defs.map((d) => {
    const e = earnedById.get(d.trophyId);
    const rate = e?.trophyEarnedRate ?? d.trophyEarnedRate;
    return {
      id: d.trophyId,
      name: d.trophyName ?? "",
      description: d.trophyDetail ?? "",
      type: d.trophyType,
      hidden: d.trophyHidden,
      iconUrl: d.trophyIconUrl ?? null,
      earned: e?.earned ?? false,
      earnedAt: e?.earnedDateTime ?? null,
      rarityPercent: rate != null ? Number.parseFloat(rate) : null,
    };
  });
}

export async function fetchGameTrophies(
  auth: AuthorizationPayload,
  title: TrophyTitle
): Promise<TrophyOut[]> {
  const options = { npServiceName: title.npServiceName };
  const defs = await getTitleTrophies(auth, title.npCommunicationId, "all", options);
  const earned = await getUserTrophiesEarnedForTitle(auth, "me", title.npCommunicationId, "all", options);
  return mergeTrophies(defs.trophies, earned.trophies);
}
```

- [ ] **Step 4: Run tests to verify they pass**

Run: `cd sync && npm test && npm run typecheck`
Expected: all PASS.

- [ ] **Step 5: Write `sync/src/index.ts`**

```typescript
import { mkdir, writeFile } from "node:fs/promises";
import { authenticate } from "./auth.js";
import { fetchAllTitles, fetchGameTrophies } from "./fetch.js";
import { buildGameFile, dedupeSlugs, serializeGame, serializeSummary } from "./serialize.js";
import { buildSummary } from "./summary.js";
import type { GameFile } from "./types.js";

const OUT_DIR = new URL("../../site/data/psn/", import.meta.url);

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

async function main(): Promise<void> {
  const npsso = process.env.NPSSO;
  if (!npsso) throw new Error("NPSSO environment variable is not set");

  const auth = await authenticate(npsso);
  const titles = await fetchAllTitles(auth);
  console.log(`Fetched ${titles.length} titles`);

  const games: GameFile[] = [];
  for (const title of titles) {
    const trophies = await fetchGameTrophies(auth, title);
    games.push(buildGameFile(title, trophies));
    await sleep(300);
  }

  const deduped = dedupeSlugs(games);
  await mkdir(OUT_DIR, { recursive: true });
  for (const game of deduped) {
    await writeFile(new URL(`${game.gameId}.json`, OUT_DIR), serializeGame(game));
  }
  await writeFile(new URL("summary.json", OUT_DIR), serializeSummary(buildSummary(deduped)));
  console.log(`Wrote ${deduped.length} game files and summary.json`);
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
```

- [ ] **Step 6: Live run against the real PSN API**

Requires `sync/.env` containing `NPSSO=<64-char token>` (user provides; see NPSSO instructions in the project README/issue — never commit or print it). If the user has not provided it yet, pause this task after committing the code (steps 1–5) and continue with Task 5; return for steps 6–8 when the token exists.

Run: `cd sync && npm run sync`
Expected: `Fetched N titles` then `Wrote N game files and summary.json`; `site/data/psn/` contains one JSON per game plus `summary.json`.

- [ ] **Step 7: Verify determinism**

Stage the first run's output, run sync again, and diff:

```bash
git add site/data
cd sync && npm run sync && cd ..
git diff --stat site/data
```

Expected: empty diff. (Exception: `rarityPercent` values occasionally tick as global rarity shifts — if the only diffs are rarity numbers, determinism is working as intended.)

- [ ] **Step 8: Commit code and data separately**

```bash
git add sync/src
git commit -m "$(cat <<'EOF'
add psn-api auth, fetch, and sync orchestrator

Co-Authored-By: Claude claude-fable-5 <noreply@anthropic.com>
EOF
)"
git add site/data
git commit -m "$(cat <<'EOF'
initial PSN trophy data sync

Co-Authored-By: Claude claude-fable-5 <noreply@anthropic.com>
EOF
)"
```

---

### Task 5: Hugo install + site scaffold (config, base layout, homepage, CSS)

**Files:**
- Create: `site/hugo.toml`, `site/layouts/baseof.html`, `site/layouts/home.html`, `site/content/_index.md`, `site/assets/css/main.css`

**Interfaces:**
- Consumes: nothing from other tasks (buildable with or without data).
- Produces: a building Hugo site with base HTML shell (`block "main"`), the full site stylesheet (all classes used by Tasks 6–8: `stats-strip`, `columns`, `game-card`, `trophy-row`, `badge`, `trophy-bronze/silver/gold/platinum`, `progress-bar`, `progress-fill`, `pagination`, `empty-state`, `platform-filter`, `unearned`, `x-cloak` handling), and asset pipeline references for `js/games.js` and `js/alpine.min.js` (created in Task 8 — `resources.Get` returns nil until then, which the template tolerates via `with`).

- [ ] **Step 1: Install Hugo and record the version**

```bash
brew install hugo
hugo version
```

Expected: version ≥ 0.126, extended. Record the exact version string — Task 10 pins `HUGO_VERSION` in Cloudflare Pages to it.

- [ ] **Step 2: Write `site/hugo.toml`**

```toml
baseURL = "https://jeffabliss.com/"
languageCode = "en-us"
title = "Jeff Bliss"
disableKinds = ["taxonomy", "term"]
```

- [ ] **Step 3: Write `site/layouts/baseof.html`**

```html
<!doctype html>
<html lang="en">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1">
  <title>{{ if .IsHome }}{{ site.Title }}{{ else }}{{ .Title }} · {{ site.Title }}{{ end }}</title>
  {{ with resources.Get "css/main.css" }}{{ with . | minify | fingerprint }}
  <link rel="stylesheet" href="{{ .RelPermalink }}">
  {{ end }}{{ end }}
  {{ with resources.Get "js/games.js" }}{{ with . | minify | fingerprint }}
  <script defer src="{{ .RelPermalink }}"></script>
  {{ end }}{{ end }}
  {{ with resources.Get "js/alpine.min.js" }}{{ with . | fingerprint }}
  <script defer src="{{ .RelPermalink }}"></script>
  {{ end }}{{ end }}
</head>
<body>
  <header class="site-header">
    <a class="site-name" href="/">Jeff Bliss</a>
    <nav><a href="/games/">Games</a></nav>
  </header>
  <main>
    {{ block "main" . }}{{ end }}
  </main>
</body>
</html>
```

- [ ] **Step 4: Write `site/layouts/home.html` and `site/content/_index.md`**

`site/layouts/home.html`:

```html
{{ define "main" }}
<section class="hero">
  <h1>Jeff Bliss</h1>
  <p>I track my gaming achievements here.</p>
  <a class="button" href="/games/">Browse my games</a>
</section>
{{ end }}
```

`site/content/_index.md`:

```markdown
---
title: Home
---
```

- [ ] **Step 5: Write `site/assets/css/main.css`**

```css
:root {
  --bg: #f7f7f5;
  --surface: #ffffff;
  --fg: #1a1d21;
  --muted: #5c6470;
  --border: #dcdfe4;
  --accent: #2f6fed;
  --accent-fg: #ffffff;
  --bronze: #a5673f;
  --silver: #7c8794;
  --gold: #c2921c;
  --platinum: #4aa3b8;
  --radius: 8px;
  --space-1: 0.25rem;
  --space-2: 0.5rem;
  --space-3: 1rem;
  --space-4: 1.5rem;
  --space-5: 2.5rem;
  --font-body: system-ui, -apple-system, "Segoe UI", sans-serif;
}

@media (prefers-color-scheme: dark) {
  :root {
    --bg: #14161a;
    --surface: #1e2126;
    --fg: #e8eaed;
    --muted: #9aa3af;
    --border: #32363d;
    --accent: #6b9aff;
    --accent-fg: #101318;
    --bronze: #c8895e;
    --silver: #9aa5b1;
    --gold: #d9ab3a;
    --platinum: #6fc3d8;
  }
}

* {
  box-sizing: border-box;
}

[x-cloak] {
  display: none !important;
}

body {
  margin: 0;
  background: var(--bg);
  color: var(--fg);
  font-family: var(--font-body);
  line-height: 1.5;
}

a {
  color: var(--accent);
}

img {
  max-width: 100%;
}

.site-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  max-width: 64rem;
  margin: 0 auto;
  padding: var(--space-3);
}

.site-name {
  color: var(--fg);
  font-weight: 700;
  text-decoration: none;
}

.site-header nav a {
  color: var(--muted);
  text-decoration: none;
}

.site-header nav a:hover {
  color: var(--fg);
}

main {
  max-width: 64rem;
  margin: 0 auto;
  padding: var(--space-3) var(--space-3) var(--space-5);
}

.hero {
  padding: var(--space-5) 0;
  text-align: center;
}

.button {
  display: inline-block;
  background: var(--accent);
  color: var(--accent-fg);
  padding: var(--space-2) var(--space-4);
  border-radius: var(--radius);
  text-decoration: none;
  font-weight: 600;
}

.games-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: var(--space-3);
  flex-wrap: wrap;
}

.platform-filter {
  display: flex;
  align-items: center;
  gap: var(--space-2);
  color: var(--muted);
}

.platform-filter select {
  background: var(--surface);
  color: var(--fg);
  border: 1px solid var(--border);
  border-radius: var(--radius);
  padding: var(--space-1) var(--space-2);
  font: inherit;
}

.stats-strip {
  display: flex;
  flex-wrap: wrap;
  gap: var(--space-2);
  list-style: none;
  margin: var(--space-3) 0;
  padding: 0;
}

.stats-strip li {
  background: var(--surface);
  border: 1px solid var(--border);
  border-radius: var(--radius);
  padding: var(--space-2) var(--space-3);
  color: var(--muted);
  font-size: 0.875rem;
}

.stat-value {
  display: block;
  color: var(--fg);
  font-size: 1.25rem;
  font-weight: 700;
}

.columns {
  display: grid;
  grid-template-columns: 3fr 2fr;
  gap: var(--space-4);
  align-items: start;
}

@media (max-width: 800px) {
  .columns {
    grid-template-columns: 1fr;
  }
}

.columns h2 {
  font-size: 1.1rem;
  margin: 0 0 var(--space-3);
}

.game-list ul,
.trophy-feed ul {
  list-style: none;
  margin: 0;
  padding: 0;
  display: grid;
  gap: var(--space-2);
}

.game-card a {
  display: grid;
  grid-template-columns: 1fr auto;
  gap: var(--space-1) var(--space-2);
  background: var(--surface);
  border: 1px solid var(--border);
  border-radius: var(--radius);
  padding: var(--space-3);
  color: var(--fg);
  text-decoration: none;
}

.game-card a:hover {
  border-color: var(--accent);
}

.game-name {
  font-weight: 600;
}

.trophy-count {
  color: var(--muted);
  font-size: 0.875rem;
}

.last-earned {
  color: var(--muted);
  font-size: 0.8rem;
  grid-column: 2;
  text-align: right;
}

.badge {
  align-self: start;
  justify-self: end;
  border: 1px solid var(--border);
  border-radius: 999px;
  padding: 0 var(--space-2);
  font-size: 0.75rem;
  color: var(--muted);
  text-transform: uppercase;
  letter-spacing: 0.04em;
}

.trophy-bronze {
  color: var(--bronze);
  border-color: var(--bronze);
}

.trophy-silver {
  color: var(--silver);
  border-color: var(--silver);
}

.trophy-gold {
  color: var(--gold);
  border-color: var(--gold);
}

.trophy-platinum {
  color: var(--platinum);
  border-color: var(--platinum);
}

.progress-bar {
  grid-column: 1 / -1;
  display: block;
  height: 6px;
  background: var(--border);
  border-radius: 999px;
  overflow: hidden;
}

.progress-fill {
  display: block;
  height: 100%;
  background: var(--accent);
}

.trophy-row {
  display: grid;
  grid-template-columns: auto 1fr auto;
  gap: var(--space-1) var(--space-3);
  align-items: center;
  background: var(--surface);
  border: 1px solid var(--border);
  border-radius: var(--radius);
  padding: var(--space-2) var(--space-3);
}

.trophy-icon {
  grid-row: span 2;
  width: 40px;
  height: 40px;
  border-radius: 4px;
}

.trophy-info {
  display: flex;
  flex-direction: column;
}

.trophy-name {
  font-weight: 600;
}

.trophy-desc,
.trophy-game,
.trophy-date,
.rarity,
.unearned-label {
  color: var(--muted);
  font-size: 0.85rem;
}

.trophy-row.unearned {
  opacity: 0.6;
}

.pagination {
  display: flex;
  align-items: center;
  justify-content: center;
  gap: var(--space-3);
  margin-top: var(--space-3);
}

.pagination button {
  background: var(--surface);
  color: var(--fg);
  border: 1px solid var(--border);
  border-radius: var(--radius);
  padding: var(--space-1) var(--space-3);
  font: inherit;
  cursor: pointer;
}

.pagination button:disabled {
  opacity: 0.4;
  cursor: default;
}

.empty-state {
  background: var(--surface);
  border: 1px dashed var(--border);
  border-radius: var(--radius);
  padding: var(--space-4);
  color: var(--muted);
  text-align: center;
}

.game-detail .game-meta {
  display: flex;
  align-items: center;
  gap: var(--space-2);
  color: var(--muted);
}

.trophy-list {
  list-style: none;
  margin: var(--space-4) 0 0;
  padding: 0;
  display: grid;
  gap: var(--space-2);
}
```

- [ ] **Step 6: Verify the build and homepage**

Run: `cd site && hugo`
Expected: builds with 0 errors.
Run: `grep -q "Browse my games" public/index.html && echo OK`
Expected: `OK`.

- [ ] **Step 7: Commit**

```bash
git add site
git commit -m "$(cat <<'EOF'
scaffold Hugo site with base layout, homepage, and stylesheet

Co-Authored-By: Claude claude-fable-5 <noreply@anthropic.com>
EOF
)"
```

---

### Task 6: Content adapter + game detail pages

**Files:**
- Create: `site/content/games/_index.md`, `site/content/games/_content.gotmpl`, `site/layouts/games/page.html`

**Interfaces:**
- Consumes: game JSON files in `site/data/psn/` (Task 4 schema: `slug`, `name`, `titlePlatform`, `progressPercent`, `trophies[]` with `id/name/description/type/hidden/iconUrl/earned/earnedAt/rarityPercent`).
- Produces: one page per game at `/games/{slug}/` with the full game object in `.Params.game`.

Note: if Task 4's live run has not happened yet (no NPSSO), create a temporary fixture `site/data/psn/NPWR99999_00.json` matching the Task 2 `GameFile` shape to verify, and delete it before committing real data.

- [ ] **Step 1: Write `site/content/games/_index.md`**

```markdown
---
title: Games
---
```

- [ ] **Step 2: Write `site/content/games/_content.gotmpl`**

```
{{ range $platform := slice "psn" "steam" "xbox" }}
  {{ range $id, $game := index $.Site.Data $platform | default dict }}
    {{ if ne $id "summary" }}
      {{ $.AddPage (dict
        "kind" "page"
        "path" $game.slug
        "title" $game.name
        "params" (dict "game" $game)
      ) }}
    {{ end }}
  {{ end }}
{{ end }}
```

- [ ] **Step 3: Write `site/layouts/games/page.html`**

```html
{{ define "main" }}
{{ $game := .Params.game }}
{{ $earned := 0 }}
{{ range $game.trophies }}{{ if .earned }}{{ $earned = add $earned 1 }}{{ end }}{{ end }}
<article class="game-detail">
  <p><a href="/games/">← All games</a></p>
  <h1>{{ $game.name }}</h1>
  <p class="game-meta">
    <span class="badge">{{ $game.titlePlatform }}</span>
    <span>{{ $earned }}/{{ len $game.trophies }} trophies · {{ $game.progressPercent }}% complete</span>
  </p>
  <ul class="trophy-list">
    {{ range $game.trophies }}
    <li class="trophy-row{{ if not .earned }} unearned{{ end }}">
      {{ with .iconUrl }}<img class="trophy-icon" src="{{ . }}" alt="" loading="lazy" width="40" height="40">{{ end }}
      <div class="trophy-info">
        {{ if and .hidden (not .earned) }}
        <span class="trophy-name">Hidden trophy</span>
        {{ else }}
        <span class="trophy-name">{{ .name }}</span>
        <span class="trophy-desc">{{ .description }}</span>
        {{ end }}
      </div>
      <div class="trophy-info">
        <span class="badge trophy-{{ .type }}">{{ .type }}</span>
        {{ with .rarityPercent }}<span class="rarity">{{ . }}% of players</span>{{ end }}
        {{ if .earned }}
        <time class="trophy-date">{{ time.Format "Jan 2, 2006" .earnedAt }}</time>
        {{ else }}
        <span class="unearned-label">Not earned</span>
        {{ end }}
      </div>
    </li>
    {{ end }}
  </ul>
</article>
{{ end }}
```

- [ ] **Step 4: Verify generated pages**

Run: `cd site && hugo && ls public/games/ | head`
Expected: one directory per game slug (e.g. `psn-astro-bot/`).
Run: `SLUG=$(ls public/games | grep '^psn-' | head -1) && grep -q "trophy-list" "public/games/$SLUG/index.html" && echo OK`
Expected: `OK`.
Also verify a hidden unearned trophy renders as `Hidden trophy` if one exists in the data: `grep -rl "Hidden trophy" public/games | head -3`.

- [ ] **Step 5: Commit**

```bash
git add site/content/games site/layouts/games
git commit -m "$(cat <<'EOF'
generate per-game trophy pages via content adapter

Co-Authored-By: Claude claude-fable-5 <noreply@anthropic.com>
EOF
)"
```

---

### Task 7: /games list page (server-rendered structure)

**Files:**
- Create: `site/layouts/games/section.html`

**Interfaces:**
- Consumes: `site/data/psn/summary.json` (Task 3 shape: `totals`, `gameCount`, `averageCompletion`, `games[]`, `recentTrophies[]`).
- Produces: `/games/` page with stats strip, game-card list (each card carries `data-platform` and `x-show="matches($el.dataset.platform)"`), a `#feed-data` JSON script tag with `recentTrophies`, and Alpine directives consumed by Task 8's `gamesPage` component (`x-data="gamesPage"`, `x-model="platform"`, `setPlatform`, `matches`, `pagedFeed`, `filteredFeed`, `page`, `pageCount`, `prev`, `next`, `formatDate`).

- [ ] **Step 1: Write `site/layouts/games/section.html`**

```html
{{ define "main" }}
{{ $summary := "" }}
{{ with site.Data.psn }}{{ $summary = index . "summary" }}{{ end }}
<div class="games-page" x-data="gamesPage">
  <div class="games-header">
    <h1>Games</h1>
    <label class="platform-filter">
      <span>Platform</span>
      <select x-model="platform" @change="setPlatform(platform)">
        <option value="all">All</option>
        <option value="psn">PlayStation</option>
        <option value="steam">Steam</option>
        <option value="xbox">Xbox</option>
      </select>
    </label>
  </div>
  {{ with $summary }}
  <ul class="stats-strip">
    <li><span class="stat-value">{{ .totals.platinum }}</span>Platinum</li>
    <li><span class="stat-value">{{ .totals.gold }}</span>Gold</li>
    <li><span class="stat-value">{{ .totals.silver }}</span>Silver</li>
    <li><span class="stat-value">{{ .totals.bronze }}</span>Bronze</li>
    <li><span class="stat-value">{{ .gameCount }}</span>Games</li>
    <li><span class="stat-value">{{ .averageCompletion }}%</span>Avg completion</li>
  </ul>
  <div class="columns">
    <section class="game-list">
      <h2>Library</h2>
      <div class="empty-state" x-show="platform === 'steam' || platform === 'xbox'" x-cloak>Coming soon</div>
      <ul>
        {{ range .games }}
        <li class="game-card" data-platform="{{ .platform }}" x-show="matches($el.dataset.platform)">
          <a href="/games/{{ .slug }}/">
            <span class="game-name">{{ .name }}</span>
            <span class="badge">{{ .titlePlatform }}</span>
            <span class="trophy-count">{{ .earnedCount }}/{{ .totalCount }} trophies</span>
            {{ with .lastEarnedAt }}<span class="last-earned">Last trophy {{ time.Format "Jan 2, 2006" . }}</span>{{ end }}
            <span class="progress-bar"><span class="progress-fill" style="width: {{ .progressPercent }}%"></span></span>
          </a>
        </li>
        {{ end }}
      </ul>
    </section>
    <section class="trophy-feed">
      <h2>Recent trophies</h2>
      <div class="empty-state" x-show="filteredFeed.length === 0" x-cloak>Coming soon</div>
      <ul>
        <template x-for="t in pagedFeed" :key="t.slug + t.trophyName + t.earnedAt">
          <li class="trophy-row">
            <template x-if="t.iconUrl">
              <img class="trophy-icon" :src="t.iconUrl" alt="" loading="lazy" width="40" height="40">
            </template>
            <div class="trophy-info">
              <span class="trophy-name" x-text="t.trophyName"></span>
              <a class="trophy-game" :href="`/games/${t.slug}/`" x-text="t.gameName"></a>
            </div>
            <div class="trophy-info">
              <span class="badge" :class="`trophy-${t.trophyType}`" x-text="t.trophyType"></span>
              <time class="trophy-date" x-text="formatDate(t.earnedAt)"></time>
            </div>
          </li>
        </template>
      </ul>
      <nav class="pagination" x-show="pageCount > 1" x-cloak>
        <button @click="prev" :disabled="page === 1">Previous</button>
        <span x-text="`${page} / ${pageCount}`"></span>
        <button @click="next" :disabled="page === pageCount">Next</button>
      </nav>
    </section>
  </div>
  {{ else }}
  <p class="empty-state">No trophy data yet.</p>
  {{ end }}
  <script type="application/json" id="feed-data">{{ with $summary }}{{ .recentTrophies | jsonify | safeJS }}{{ else }}[]{{ end }}</script>
</div>
{{ end }}
```

- [ ] **Step 2: Verify the build output**

Run: `cd site && hugo`
Expected: 0 errors.
Run: `grep -q "feed-data" public/games/index.html && grep -q "stats-strip" public/games/index.html && grep -qo "game-card" public/games/index.html && echo OK`
Expected: `OK`.
Run: `python3 -c "import json,re,sys; html=open('public/games/index.html').read(); m=re.search(r'<script type=\"application/json\" id=\"feed-data\">(.*?)</script>', html, re.S); json.loads(m.group(1)); print('feed JSON valid')"`
Expected: `feed JSON valid`.

- [ ] **Step 3: Commit**

```bash
git add site/layouts/games/section.html
git commit -m "$(cat <<'EOF'
add /games list page with stats strip and two-column layout

Co-Authored-By: Claude claude-fable-5 <noreply@anthropic.com>
EOF
)"
```

---

### Task 8: Alpine interactivity (vendor + platform filter + pagination)

**Files:**
- Create: `site/assets/js/alpine.min.js` (vendored), `site/assets/js/games.js`

**Interfaces:**
- Consumes: `#feed-data` JSON script tag and Alpine directives from Task 7's `section.html`; script include order from Task 5's `baseof.html` (`games.js` before `alpine.min.js`, both `defer`).
- Produces: the `gamesPage` Alpine component with `platform`, `page`, `feed`, `init`, `setPlatform(v)`, `matches(p)`, `filteredFeed`, `pageCount`, `pagedFeed`, `prev()`, `next()`, `formatDate(iso)`.

- [ ] **Step 1: Vendor Alpine.js**

```bash
curl -sL https://cdn.jsdelivr.net/npm/alpinejs@3/dist/cdn.min.js -o site/assets/js/alpine.min.js
head -c 200 site/assets/js/alpine.min.js
```

Expected: minified JS content (not an error page). Note the resolved version from `curl -sI https://cdn.jsdelivr.net/npm/alpinejs@3/dist/cdn.min.js | grep -i location` or the jsdelivr banner comment, and mention it in the commit message.

- [ ] **Step 2: Write `site/assets/js/games.js`**

```javascript
document.addEventListener("alpine:init", () => {
  Alpine.data("gamesPage", () => ({
    platform: "all",
    page: 1,
    perPage: 10,
    feed: [],
    init() {
      const param = new URLSearchParams(window.location.search).get("platform");
      if (["psn", "steam", "xbox"].includes(param)) this.platform = param;
      const el = document.getElementById("feed-data");
      if (el) this.feed = JSON.parse(el.textContent);
    },
    setPlatform(value) {
      this.page = 1;
      const url = new URL(window.location);
      if (value === "all") url.searchParams.delete("platform");
      else url.searchParams.set("platform", value);
      history.replaceState(null, "", url);
    },
    matches(p) {
      return this.platform === "all" || this.platform === p;
    },
    get filteredFeed() {
      return this.feed.filter((t) => this.matches(t.platform));
    },
    get pageCount() {
      return Math.max(1, Math.ceil(this.filteredFeed.length / this.perPage));
    },
    get pagedFeed() {
      const start = (this.page - 1) * this.perPage;
      return this.filteredFeed.slice(start, start + this.perPage);
    },
    prev() {
      if (this.page > 1) this.page -= 1;
    },
    next() {
      if (this.page < this.pageCount) this.page += 1;
    },
    formatDate(iso) {
      return new Date(iso).toLocaleDateString(undefined, {
        year: "numeric",
        month: "short",
        day: "numeric",
      });
    },
  }));
});
```

- [ ] **Step 3: Verify in the browser**

Start the dev server with the preview tools (create `.claude/launch.json` if absent):

```json
{
  "version": "0.0.1",
  "configurations": [
    {
      "name": "hugo",
      "runtimeExecutable": "hugo",
      "runtimeArgs": ["server", "--source", "site", "--port", "1313"],
      "port": 1313
    }
  ]
}
```

Then via preview tools on `http://localhost:1313/games/`:
1. `read_console_messages` — expect no errors.
2. `read_page` — expect game cards, feed rows (10 visible), pagination controls when > 10 trophies exist.
3. Select "Steam" in the platform dropdown (`form_input` on the select) — expect both columns to show "Coming soon" and the URL to contain `?platform=steam` (check via `javascript_tool`: `window.location.search`).
4. Navigate to `/games/?platform=xbox` directly — expect the dropdown preselected to Xbox and empty states shown.
5. Click "Next" in pagination — expect the feed rows to change (verify first trophy name differs via `read_page`).
6. Select "All" — expect cards and feed restored, `?platform` removed from URL.

- [ ] **Step 4: Commit**

```bash
git add site/assets/js .claude/launch.json
git commit -m "$(cat <<'EOF'
add Alpine platform filter and trophy feed pagination

Co-Authored-By: Claude claude-fable-5 <noreply@anthropic.com>
EOF
)"
```

---

### Task 9: GitHub Actions daily sync workflow

**Files:**
- Create: `.github/workflows/sync.yml`

**Interfaces:**
- Consumes: `sync/` package (Task 4), `NPSSO` repository secret (user-provided via `gh secret set NPSSO`).
- Produces: daily automated commits of `site/data/`; GitHub issue on failure.

- [ ] **Step 1: Write `.github/workflows/sync.yml`**

```yaml
name: Sync PSN trophies

on:
  schedule:
    - cron: '17 9 * * *'
  workflow_dispatch:

permissions:
  contents: write
  issues: write

jobs:
  sync:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: actions/setup-node@v4
        with:
          node-version: 24
          cache: npm
          cache-dependency-path: sync/package-lock.json
      - run: npm ci
        working-directory: sync
      - run: npm run sync
        working-directory: sync
        env:
          NPSSO: ${{ secrets.NPSSO }}
      - name: Commit and push data changes
        run: |
          git config user.name "github-actions[bot]"
          git config user.email "41898282+github-actions[bot]@users.noreply.github.com"
          git add site/data
          if git diff --staged --quiet; then
            echo "No trophy changes"
          else
            git commit -m "sync PSN trophy data"
            git push
          fi
      - name: Open failure issue
        if: failure()
        env:
          GH_TOKEN: ${{ github.token }}
        run: |
          open_count=$(gh issue list --state open --search "PSN sync failed in:title" --json number --jq length)
          if [ "$open_count" = "0" ]; then
            gh issue create \
              --title "PSN sync failed — NPSSO may be expired" \
              --body "The daily trophy sync failed. If the log shows an auth error, refresh the NPSSO: log in at https://www.playstation.com, open https://ca.account.sony.com/api/v1/ssocookie, copy the npsso value, then run 'gh secret set NPSSO' locally. Run: ${{ github.server_url }}/${{ github.repository }}/actions/runs/${{ github.run_id }}"
          fi
```

- [ ] **Step 2: Verify workflow syntax and secret presence**

Run: `gh secret list`
Expected: `NPSSO` listed. If missing, ask the user to run `gh secret set NPSSO` (pasting the token into the interactive prompt, not the shell history).

- [ ] **Step 3: Commit and push**

```bash
git add .github/workflows/sync.yml
git commit -m "$(cat <<'EOF'
add daily PSN sync workflow with failure alarm

Co-Authored-By: Claude claude-fable-5 <noreply@anthropic.com>
EOF
)"
git push
```

- [ ] **Step 4: Trigger a live run and verify**

Run: `gh workflow run "Sync PSN trophies" && sleep 10 && gh run list --workflow "Sync PSN trophies" --limit 1`
Then poll: `gh run watch $(gh run list --workflow "Sync PSN trophies" --limit 1 --json databaseId --jq '.[0].databaseId') --exit-status`
Expected: run succeeds; a data commit appears only if trophies changed since the local sync.

---

### Task 10: Cloudflare Pages deployment + custom domain

**Files:** none (dashboard configuration + verification)

**Interfaces:**
- Consumes: pushed repo with `site/` buildable by `hugo --minify`; Hugo version recorded in Task 5.
- Produces: live site at `https://jeffabliss.com`.

- [ ] **Step 1: User creates the Pages project (dashboard)**

Ask the user to do this in the Cloudflare dashboard (requires their login; agent cannot):
1. Workers & Pages → Create → Pages → Connect to Git → select `jeffbliss/jeffabliss.com`, production branch `master`.
2. Build settings: framework preset **Hugo**, build command `hugo --minify`, build output directory `public`, **root directory `site`**.
3. Environment variable: `HUGO_VERSION` = the exact version recorded in Task 5 Step 1 (e.g. `0.151.0`).
4. Save and deploy.

- [ ] **Step 2: Verify the pages.dev deployment**

Once the user reports the project exists, verify the preview URL they provide (or ask for it):

Run: `curl -sI https://<project>.pages.dev/games/ | head -3`
Expected: `HTTP/2 200`.
Open it with the browser preview tools and repeat Task 8 Step 3's checks 1–3 against the deployed URL.

- [ ] **Step 3: User attaches custom domains (dashboard)**

Ask the user to: Pages project → Custom domains → add `jeffabliss.com`, then add `www.jeffabliss.com`. Cloudflare creates the DNS records automatically (the zone is empty and already on Cloudflare nameservers).

- [ ] **Step 4: Verify production**

Run: `curl -sI https://jeffabliss.com/games/ | head -3 && curl -sI https://www.jeffabliss.com/ | head -3`
Expected: `HTTP/2 200` for the apex; `200` or a redirect to the apex for `www`.
Load `https://jeffabliss.com/games/?platform=psn` in the browser preview and confirm the filter preselects PlayStation and data renders.

- [ ] **Step 5: Final commit of any stragglers and wrap-up**

Run: `git status --short`
Expected: clean tree. If launch.json or docs changed, commit them. Report completion to the user with the live URL.
