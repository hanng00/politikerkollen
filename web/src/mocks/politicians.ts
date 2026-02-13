import type { Politician, PoliticianStats, PoliticianWithStats } from "@/types";
import { parties } from "./parties";

export const politicians: Politician[] = [
  {
    id: "anna-andersson",
    firstName: "Anna",
    lastName: "Andersson",
    party: parties[0], // S
    role: "Riksdagsledamot",
    constituency: "Stockholms län",
    electedSince: 2018,
    isActive: true,
  },
  {
    id: "erik-eriksson",
    firstName: "Erik",
    lastName: "Eriksson",
    party: parties[0], // S
    role: "Riksdagsledamot",
    constituency: "Västra Götalands län",
    electedSince: 2014,
    isActive: true,
  },
  {
    id: "maria-svensson",
    firstName: "Maria",
    lastName: "Svensson",
    party: parties[1], // M
    role: "Riksdagsledamot",
    constituency: "Skåne läns södra",
    electedSince: 2018,
    isActive: true,
  },
  {
    id: "johan-lindberg",
    firstName: "Johan",
    lastName: "Lindberg",
    party: parties[2], // SD
    role: "Riksdagsledamot",
    constituency: "Östergötlands län",
    electedSince: 2022,
    isActive: true,
  },
  {
    id: "lisa-berg",
    firstName: "Lisa",
    lastName: "Berg",
    party: parties[3], // C
    role: "Riksdagsledamot",
    constituency: "Uppsala län",
    electedSince: 2018,
    isActive: true,
  },
  {
    id: "karl-nilsson",
    firstName: "Karl",
    lastName: "Nilsson",
    party: parties[4], // V
    role: "Riksdagsledamot",
    constituency: "Göteborgs kommun",
    electedSince: 2014,
    isActive: true,
  },
];

export const politicianStats: Record<string, PoliticianStats> = {
  "anna-andersson": {
    consistencyRank: 287,
    totalRanked: 349,
    consistencyPercentile: 18,
    partyLoyaltyPercent: 78,
    contradictionCount: 3,
    totalVotes: 525,
    totalMotions: 12,
    totalSpeeches: 45,
    viewCount: 12847,
    shareCount: 342,
    isTrending: true,
  },
  "erik-eriksson": {
    consistencyRank: 156,
    totalRanked: 349,
    consistencyPercentile: 55,
    partyLoyaltyPercent: 92,
    contradictionCount: 1,
    totalVotes: 892,
    totalMotions: 24,
    totalSpeeches: 78,
    viewCount: 4521,
    shareCount: 89,
    isTrending: false,
  },
  "maria-svensson": {
    consistencyRank: 45,
    totalRanked: 349,
    consistencyPercentile: 87,
    partyLoyaltyPercent: 95,
    contradictionCount: 0,
    totalVotes: 612,
    totalMotions: 18,
    totalSpeeches: 52,
    viewCount: 3241,
    shareCount: 56,
    isTrending: false,
  },
  "johan-lindberg": {
    consistencyRank: 312,
    totalRanked: 349,
    consistencyPercentile: 11,
    partyLoyaltyPercent: 65,
    contradictionCount: 5,
    totalVotes: 234,
    totalMotions: 8,
    totalSpeeches: 23,
    viewCount: 18923,
    shareCount: 892,
    isTrending: true,
  },
  "lisa-berg": {
    consistencyRank: 89,
    totalRanked: 349,
    consistencyPercentile: 74,
    partyLoyaltyPercent: 88,
    contradictionCount: 1,
    totalVotes: 567,
    totalMotions: 31,
    totalSpeeches: 67,
    viewCount: 2134,
    shareCount: 34,
    isTrending: false,
  },
  "karl-nilsson": {
    consistencyRank: 23,
    totalRanked: 349,
    consistencyPercentile: 93,
    partyLoyaltyPercent: 98,
    contradictionCount: 0,
    totalVotes: 845,
    totalMotions: 42,
    totalSpeeches: 112,
    viewCount: 5678,
    shareCount: 123,
    isTrending: false,
  },
};

export const getPoliticianById = (id: string): Politician | undefined =>
  politicians.find((p) => p.id === id);

export const getPoliticianWithStats = (id: string): PoliticianWithStats | undefined => {
  const politician = getPoliticianById(id);
  const stats = politicianStats[id];
  if (!politician || !stats) return undefined;
  return { ...politician, stats };
};

export const getPoliticiansWithStats = (): PoliticianWithStats[] =>
  politicians
    .map((p) => {
      const stats = politicianStats[p.id];
      return stats ? { ...p, stats } : undefined;
    })
    .filter((p): p is PoliticianWithStats => p !== undefined);
