import { useQuery } from "@tanstack/react-query";
import type { PoliticianWithStats } from "@/types";
import { getPoliticianWithStats } from "@/mocks";

async function fetchPolitician(id: string): Promise<PoliticianWithStats | null> {
  // Simulate network delay
  await new Promise((resolve) => setTimeout(resolve, 300));
  return getPoliticianWithStats(id) ?? null;
}

export function useFetchPolitician(id: string) {
  return useQuery({
    queryKey: ["politician", id],
    queryFn: () => fetchPolitician(id),
    enabled: !!id,
  });
}
