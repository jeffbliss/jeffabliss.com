import type { TrophyTitle } from "psn-api";
import type { GameFile, Summary, TrophyOut } from "./types.js";

export function slugify(name: string): string {
  return name
    .replace(/[™®©'']/g, "")
    .normalize("NFKD")
    .replace(/[\u0300-\u036f]/g, "")
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
