import { useQuery } from "@tanstack/react-query";
import type { Contradiction } from "@/types";
import { getContradictionsByPolitician, getTrendingContradictions, getAllContradictions } from "@/mocks";

async function fetchContradictions(politicianId: string): Promise<Contradiction[]> {
  // Simulate network delay
  await new Promise((resolve) => setTimeout(resolve, 300));
  return getContradictionsByPolitician(politicianId);
}

async function fetchTrendingContradictions(): Promise<Contradiction[]> {
  await new Promise((resolve) => setTimeout(resolve, 300));
  return getTrendingContradictions();
}

interface FetchAllContradictionsOptions {
  topicId?: string;
  sortBy?: "recent" | "trending" | "views";
}

async function fetchAllContradictions(options?: FetchAllContradictionsOptions): Promise<Contradiction[]> {
  await new Promise((resolve) => setTimeout(resolve, 300));
  return getAllContradictions(options);
}

export function useFetchContradictions(politicianId: string) {
  return useQuery({
    queryKey: ["contradictions", politicianId],
    queryFn: () => fetchContradictions(politicianId),
    enabled: !!politicianId,
  });
}

export function useFetchTrendingContradictions() {
  return useQuery({
    queryKey: ["contradictions", "trending"],
    queryFn: fetchTrendingContradictions,
  });
}

export function useFetchAllContradictions(options?: FetchAllContradictionsOptions) {
  return useQuery({
    queryKey: ["contradictions", "all", options?.topicId ?? "all", options?.sortBy ?? "trending"],
    queryFn: () => fetchAllContradictions(options),
  });
}
