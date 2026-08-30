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
