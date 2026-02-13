import { useQuery } from "@tanstack/react-query";
import type { Vote } from "@/types";
import { getVotesByPolitician, getRebelVotes } from "@/mocks";

interface FetchVotesOptions {
  topicId?: string;
  rebelOnly?: boolean;
  limit?: number;
}

async function fetchVotes(
  politicianId: string,
  options: FetchVotesOptions = {}
): Promise<Vote[]> {
  // Simulate network delay
  await new Promise((resolve) => setTimeout(resolve, 300));

  let votes = options.rebelOnly
    ? getRebelVotes(politicianId)
    : getVotesByPolitician(politicianId);

  // Filter by topic
  if (options.topicId) {
    votes = votes.filter((v) => v.topic.id === options.topicId);
  }

  // Sort by date (newest first)
  votes.sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());

  // Limit
  if (options.limit) {
    votes = votes.slice(0, options.limit);
  }

  return votes;
}

export function useFetchVotes(politicianId: string, options: FetchVotesOptions = {}) {
  return useQuery({
    queryKey: ["votes", politicianId, options],
    queryFn: () => fetchVotes(politicianId, options),
    enabled: !!politicianId,
  });
}
