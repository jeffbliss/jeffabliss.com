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
