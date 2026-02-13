import type { Party } from "./party";

export interface Politician {
  id: string;
  firstName: string;
  lastName: string;
  imageUrl?: string;
  party: Party;
  role: string;
  constituency: string;
  electedSince: number;
  isActive: boolean;
}

export interface PoliticianStats {
  consistencyRank: number;
  totalRanked: number;
  consistencyPercentile: number;
  partyLoyaltyPercent: number;
  contradictionCount: number;
  totalVotes: number;
  totalMotions: number;
  totalSpeeches: number;
  viewCount: number;
  shareCount: number;
  isTrending: boolean;
}

export interface PoliticianWithStats extends Politician {
  stats: PoliticianStats;
}
