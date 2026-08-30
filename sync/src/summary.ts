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
