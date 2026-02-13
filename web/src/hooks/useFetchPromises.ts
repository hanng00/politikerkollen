import { useQuery } from "@tanstack/react-query";
import type { Promise as PoliticianPromise } from "@/types";
import { getPromisesByPolitician, getPromiseStats } from "@/mocks";

interface FetchPromisesOptions {
  status?: PoliticianPromise["status"];
  topicId?: string;
}

async function fetchPromises(
  politicianId: string,
  options: FetchPromisesOptions = {}
): Promise<PoliticianPromise[]> {
  // Simulate network delay
  await new Promise((resolve) => setTimeout(resolve, 300));

  let promises = getPromisesByPolitician(politicianId);

  // Filter by status
  if (options.status) {
    promises = promises.filter((p) => p.status === options.status);
  }

  // Filter by topic
  if (options.topicId) {
    promises = promises.filter((p) => p.topic.id === options.topicId);
  }

  // Sort by date (newest first)
  promises.sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());

  return promises;
}

interface PromiseStats {
  total: number;
  kept: number;
  broken: number;
  inProgress: number;
  stalled: number;
  notStarted: number;
}

async function fetchPromiseStats(politicianId: string): Promise<PromiseStats> {
  await new Promise((resolve) => setTimeout(resolve, 200));
  return getPromiseStats(politicianId);
}

export function useFetchPromises(politicianId: string, options: FetchPromisesOptions = {}) {
  return useQuery({
    queryKey: ["promises", politicianId, options],
    queryFn: () => fetchPromises(politicianId, options),
    enabled: !!politicianId,
  });
}

export function useFetchPromiseStats(politicianId: string) {
  return useQuery({
    queryKey: ["promises", politicianId, "stats"],
    queryFn: () => fetchPromiseStats(politicianId),
    enabled: !!politicianId,
  });
}
