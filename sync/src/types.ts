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
