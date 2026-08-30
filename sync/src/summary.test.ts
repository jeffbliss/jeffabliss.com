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
