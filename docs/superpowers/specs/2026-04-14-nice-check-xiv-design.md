# Nice Check XIV — Design Spec

A silly FFXIV page at `/ffxiv69` where users look up their character and get scored on how close their stats are to the number 69 (and friends: 420, 6969, 69420). Output is a "Nice Score" out of 420 points with a breakdown per category.

## Architecture

### Hybrid: Worker Fetches + Normalizes, Client Scores

```
Browser (React)                  Cloudflare Worker                  Lodestone / XIVAPI v2
─────────────────               ──────────────────                 ─────────────────────
GET /api/character    ──────►   Scrape Lodestone HTML     ──────►  na.finalfantasyxiv.com
  ?name=X&server=Y              Parse with CSS selectors           /lodestone/character/...
                                Fetch XIVAPI v2 for totals ─────►  xivapi.com/api/v2/...
◄──────────────────             Return normalized JSON    ◄──────
Receive clean character obj
Run scoring algorithm
Display results
```

- **Cloudflare Worker** (`/worker` directory, same repo): fetches Lodestone HTML, parses it into a normalized character object, fetches reference data (minion/mount totals) from XIVAPI v2. Caches in Cloudflare KV (1hr TTL).
- **React frontend** (`src/pages/NiceCheckXIV.jsx`): receives clean JSON, runs scoring/tier logic, renders results with MUI components.
- **Fallback**: when Lodestone is unreachable, worker returns `{ "ok": false, "error": "lodestone_unavailable" }`. Frontend shows cached demo data for "Ashe Ville" on Ultros.

### Why this split

- Scoring tweaks ship instantly (frontend only, no worker redeploy)
- Worker handles API flakiness, caching, and CORS
- Normalized data is cacheable — repeat lookups for the same character are fast
- Clean data contract between worker and client

## Data Contract

### Worker Response (success)

```json
{
  "ok": true,
  "character": {
    "id": 28822595,
    "name": "Ashe Ville",
    "server": "Ultros",
    "datacenter": "Primal",
    "portrait": "https://...",
    "title": "Warrior of Light",
    "bio": "Just a chill adventurer...",
    "nameday": "3rd Sun of the 3rd Astral Moon",
    "guardianDeityId": 6,
    "guardianDeityName": "Nophica",
    "activeJob": {
      "name": "Sage",
      "level": 100
    },
    "jobs": [
      { "name": "Paladin", "abbrev": "PLD", "level": 90 },
      { "name": "Warrior", "abbrev": "WAR", "level": 69 }
    ],
    "minionCount": 312,
    "mountCount": 198,
    "achievementPoints": 6970,
    "gearStats": {
      "HP": 6969,
      "Strength": 450,
      "Dexterity": 420,
      "Vitality": 4831,
      "Intelligence": 390,
      "Mind": 5200,
      "CriticalHitRate": 2690,
      "Determination": 2069,
      "DirectHitRate": 1269,
      "Defense": 3200,
      "MagicDefense": 3200,
      "AttackPower": 450,
      "SkillSpeed": 400,
      "SpellSpeed": 400,
      "Tenacity": 400,
      "Piety": 400
    },
    "fc": {
      "name": "Nice Company",
      "tag": "NICE",
      "memberCount": 69
    }  // null if not in an FC
  },
  "totals": {
    "minions": 490,
    "mounts": 340
  }
}
```

### Worker Response (error)

```json
{ "ok": false, "error": "lodestone_unavailable" }
{ "ok": false, "error": "not_found" }
```

## Scoring System

### 13 Categories (420 max total)

| # | Category | Max | Scoring Rule |
|---|----------|-----|-------------|
| 1 | Lodestone ID | 50 | +25 per occurrence of "69" in numeric ID. Cap 2. |
| 2 | Jobs at Level 69 | 69 | +23 per job frozen at exactly 69. Cap 3. "FROZEN AT NICE" |
| 3 | Minion Collection % | 30 | 30 if within 1% of 69%. Linear falloff: `30 - (distance% * 1.5)`. Floor 0. |
| 4 | Mount Collection % | 30 | Same formula as minions. |
| 5 | Achievement Points | 35 | Distance to nearest nice number (69, 420, 690, 6969, 42069, 69420). 35 if exact, linear falloff over 500. |
| 6 | Active Job Level | 42 | 42 if currently on a level 69 job. Binary. |
| 7 | Name Nice-ometry | 20 | +7 if name (no spaces) is 6 chars, +7 if 9 chars, +6 if contains "69" or "nice" (case-insensitive). |
| 8 | Maxed Job Count | 20 | 20 if exactly 6 or 9 jobs at max level (100). 0 otherwise. |
| 9 | Average Job Level | 20 | 20 if avg across all leveled jobs rounds to 69. Linear falloff over 10 levels. |
| 10 | Gear Stat Sniffing | 40 | Scan all gear stats. +10 per stat that equals a nice number (69, 420, 690, 6969) or contains "69" as substring. Cap 4. |
| 11 | Bio Nice-ometry | 24 | +10 if bio is exactly 69 chars. +7 if contains "69"/"nice"/"420". +7 if bio length is 6 or 9. |
| 12 | FC Niceness | 25 | +10 if FC tag is "69"/"NICE". +8 if FC has 69 members. +7 if FC name contains "69"/"nice". (0 if not in an FC.) |
| 13 | Nameday & Deity | 15 | +8 if nameday has both 6 and 9. +4 for just one. +3 if guardian deity ID is 6 or 9. |
| | **TOTAL** | **420** | |

### Universal Bonus: Multiple of 69 Detector

Every numeric value on the character gets checked: if `value % 69` is within ±3, it's flagged. These are **not scored** — they appear as bonus flavor findings below the main scorecard.

Display format: "HP 6969 = 69 x 101 (exact!)" or "Vitality 4831 = 69 x 70 (±1)"

### Achievement Date Archaeology (Bonus, Not Scored)

When achievements are public (many players hide them), list any earned on June 9th (6/9) or at 4:20 AM/PM. Displayed as a fun "Nice Timestamps" section. Not scored because most players have achievements private.

### Tier System

Per-category tier based on percentage of that category's max:

| Tier | Range | Color | Effect |
|------|-------|-------|--------|
| LEGENDARY | 90-100% | Gold gradient (#ff6b00 → #ffaa00) | Glow |
| NICE | 60-89% | Purple/pink gradient (#bb86fc → #ff79c6) | Glow |
| CLOSE | 30-59% | Blue (#4fc3f7) | Subtle |
| MEH | 1-29% | Grey (#555) | None |
| SAD | 0% | Dark (#333) | Dimmed |

### Overall Score Tiers

| Score | Label | Tagline |
|-------|-------|---------|
| 350-420 | TRANSCENDENT NICE | You are the chosen one |
| 200-349 | CERTIFIED NICE | The community respects your commitment |
| 100-199 | KINDA NICE | You've got the spirit |
| 1-99 | NEEDS WORK | Your nice game is weak |
| 0 | CERTIFIED UN-NICE | Not a single 69 in sight. Shameful. |

## UI Design

### Theme

- Background: deep purple gradient (`#1a0a2e` → `#16082b` → `#1e0633`)
- Floating "69"s at ~4% opacity as background texture
- Accent colors: purple (#bb86fc), pink (#ff79c6), gold (#ffaa00)
- Cards: `rgba(255,255,255,0.04)` with purple border

### Page Structure

1. **Header**: "NICE CHECK XIV" in gradient text, subtitle
2. **Search bar**: Character name (TextField), Server (Select dropdown grouped by datacenter), "CHECK NICENESS" button
3. **Score ring**: Animated circular gauge with count-up animation, score/420, overall tier label
4. **Category cards**: 3-column grid (desktop), 1-column (mobile). Each card shows category name, score/max, tier badge, flavor text
5. **Nice Multiple Alerts**: Pink-tinted section listing bonus multiple-of-69 findings
6. **Achievement Timestamps**: Optional section if achievements are public
7. **Footer**: Disclaimer text ("not affiliated with Square Enix")

### States

- **Empty**: Just the search bar, maybe a tagline
- **Loading**: Skeleton cards or a "Consulting the Lodestone..." spinner
- **Results**: Full scorecard
- **Error (not found)**: "Character not found. Check spelling and server."
- **Error (Lodestone down)**: Switch to cached demo mode showing Ashe Ville's results with a banner: "Lodestone is sleeping. Here's a demo with Ashe Ville's data."

### Navigation

- Hidden route — no navbar link. Accessed directly via URL.
- Small back arrow to home in top-left corner.

### Components (MUI v7)

- `Box` for layout containers
- `Grid` with `size={{ xs: 12, md: 4 }}` for card grid
- `TextField` for character name input
- `Select` with `variant` attribute for server dropdown
- `Typography` for text
- `CircularProgress` or custom SVG for score ring
- `Card` / `CardContent` for category cards
- `Chip` for tier badges

## File Structure

```
jeffabliss.com/
├── worker/                         # Cloudflare Worker
│   ├── src/
│   │   ├── index.js                # Worker entry — route handler
│   │   ├── lodestone.js            # Lodestone HTML scraping + parsing
│   │   └── normalize.js            # Raw scraped data → clean character object
│   ├── wrangler.toml               # Cloudflare config (KV binding, routes)
│   └── package.json                # Worker dependencies
├── src/
│   ├── pages/
│   │   └── NiceCheckXIV.jsx        # Main page component
│   ├── components/
│   │   ├── NiceScoreRing.jsx       # Animated circular score gauge
│   │   ├── NiceCategoryCard.jsx    # Individual category result card
│   │   └── NiceMultipleAlerts.jsx  # Bonus findings section
│   ├── data/
│   │   ├── niceScoring.js          # Scoring algorithm + tier logic
│   │   ├── niceConstants.js        # Nice numbers, server list, totals
│   │   └── asheVilleDemo.js        # Cached demo data for fallback
│   └── prompts.js                  # Add NiceCheckXIV prompts
├── src/App.jsx                     # Add /ffxiv69 route
└── .gitignore                      # Add .superpowers/
```

## Worker Details

### Lodestone Scraping

The worker scrapes these Lodestone pages:
- `https://na.finalfantasyxiv.com/lodestone/character/?q={name}&worldname={server}` — character search
- `https://na.finalfantasyxiv.com/lodestone/character/{id}/` — character profile (jobs, gear stats, bio, nameday, deity, FC link)
- `https://na.finalfantasyxiv.com/lodestone/character/{id}/minion/` — minion list (count the entries)
- `https://na.finalfantasyxiv.com/lodestone/character/{id}/mount/` — mount list (count the entries)

CSS selectors from `xivapi/lodestone-css-selectors` repo guide the HTML parsing.

### Caching (Cloudflare KV)

- Key: `character:{server}:{name_lowercase}`
- Value: normalized character JSON
- TTL: 1 hour
- Bypass cache with `?fresh=true` query param

### CORS

Worker sets these headers:
- `Access-Control-Allow-Origin`: `https://jeffabliss.com` and `http://localhost:*`
- `Access-Control-Allow-Methods`: `GET, OPTIONS`

### Reference Data

XIVAPI v2 endpoints for totals (cached longer, changes rarely):
- Total minions in game
- Total mounts in game

Fallback: hardcoded totals in worker, updated periodically.

## Server List

The server Select dropdown groups all FFXIV servers by datacenter:

- **NA**: Aether (Adamantoise, Cactuar, Faerie, Gilgamesh, Jenova, Midgardsormr, Sargatanas, Siren), Crystal (Balmung, Brynhildr, Coeurl, Diabolos, Goblin, Malboro, Mateus, Zalera), Primal (Behemoth, Excalibur, Exodus, Famfrit, Hyperion, Lamia, Leviathan, Ultros), Dynamis (Halicarnassus, Maduin, Marilith, Seraph, Rafflesia, Golem)
- **EU**: Chaos, Light
- **JP**: Elemental, Gaia, Mana, Meteor
- **OCE**: Materia

Full server list stored in `niceConstants.js`.
