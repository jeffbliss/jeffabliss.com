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
