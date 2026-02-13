import { useQuery } from "@tanstack/react-query";
import type { Motion } from "@/types";
import { getMotionsByPolitician } from "@/mocks";

interface FetchMotionsOptions {
  topicId?: string;
  status?: Motion["status"];
  limit?: number;
}

async function fetchMotions(
  politicianId: string,
  options: FetchMotionsOptions = {}
): Promise<Motion[]> {
  // Simulate network delay
  await new Promise((resolve) => setTimeout(resolve, 300));

  let motions = getMotionsByPolitician(politicianId);

  // Filter by topic
  if (options.topicId) {
    motions = motions.filter((m) => m.topic.id === options.topicId);
  }

  // Filter by status
  if (options.status) {
    motions = motions.filter((m) => m.status === options.status);
  }

  // Sort by date (newest first)
  motions.sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());

  // Limit
  if (options.limit) {
    motions = motions.slice(0, options.limit);
  }

  return motions;
}

export function useFetchMotions(politicianId: string, options: FetchMotionsOptions = {}) {
  return useQuery({
    queryKey: ["motions", politicianId, options],
    queryFn: () => fetchMotions(politicianId, options),
    enabled: !!politicianId,
  });
}
