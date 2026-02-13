import { useQuery } from "@tanstack/react-query";
import type { PoliticianWithStats } from "@/types";
import { getPoliticiansWithStats } from "@/mocks";

interface FetchPoliticiansOptions {
  partyId?: string;
  sortBy?: "name" | "rank" | "contradictions" | "trending";
  limit?: number;
}

async function fetchPoliticians(
  options: FetchPoliticiansOptions = {}
): Promise<PoliticianWithStats[]> {
  // Simulate network delay
  await new Promise((resolve) => setTimeout(resolve, 300));

  let politicians = getPoliticiansWithStats();

  // Filter by party
  if (options.partyId) {
    politicians = politicians.filter((p) => p.party.id === options.partyId);
  }

  // Sort
  switch (options.sortBy) {
    case "rank":
      politicians.sort((a, b) => a.stats.consistencyRank - b.stats.consistencyRank);
      break;
    case "contradictions":
      politicians.sort((a, b) => b.stats.contradictionCount - a.stats.contradictionCount);
      break;
    case "trending":
      politicians.sort((a, b) => {
        if (a.stats.isTrending && !b.stats.isTrending) return -1;
        if (!a.stats.isTrending && b.stats.isTrending) return 1;
        return b.stats.viewCount - a.stats.viewCount;
      });
      break;
    case "name":
    default:
      politicians.sort((a, b) => a.lastName.localeCompare(b.lastName));
  }

  // Limit
  if (options.limit) {
    politicians = politicians.slice(0, options.limit);
  }

  return politicians;
}

export function useFetchPoliticians(options: FetchPoliticiansOptions = {}) {
  return useQuery({
    queryKey: ["politicians", options],
    queryFn: () => fetchPoliticians(options),
  });
}
