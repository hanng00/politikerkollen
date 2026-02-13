import { useQuery } from "@tanstack/react-query";
import type { Topic, TopicStats } from "@/types";
import { topics, getContradictionsByPolitician, getVotesByPolitician } from "@/mocks";

async function fetchTopics(): Promise<Topic[]> {
  // Simulate network delay
  await new Promise((resolve) => setTimeout(resolve, 200));
  return topics;
}

async function fetchTopicStats(politicianId: string): Promise<TopicStats[]> {
  await new Promise((resolve) => setTimeout(resolve, 300));

  const votes = getVotesByPolitician(politicianId);
  const contradictions = getContradictionsByPolitician(politicianId);

  // Calculate stats per topic
  const statsMap = new Map<string, { actionCount: number; consistent: number; total: number }>();

  // Count votes per topic
  for (const vote of votes) {
    const existing = statsMap.get(vote.topic.id) ?? { actionCount: 0, consistent: 0, total: 0 };
    existing.actionCount++;
    existing.total++;
    if (vote.followedParty) existing.consistent++;
    statsMap.set(vote.topic.id, existing);
  }

  // Count contradictions per topic (reduce consistency)
  for (const contradiction of contradictions) {
    const existing = statsMap.get(contradiction.topic.id) ?? { actionCount: 0, consistent: 0, total: 0 };
    existing.total++;
    // Contradictions don't add to consistent count
    statsMap.set(contradiction.topic.id, existing);
  }

  // Convert to array with full topic info
  const result: TopicStats[] = [];
  for (const [topicId, stats] of statsMap.entries()) {
    const topic = topics.find((t) => t.id === topicId);
    if (topic) {
      result.push({
        topic,
        actionCount: stats.actionCount,
        consistencyScore: stats.total > 0 ? Math.round((stats.consistent / stats.total) * 100) : 100,
      });
    }
  }

  // Sort by action count
  result.sort((a, b) => b.actionCount - a.actionCount);

  return result;
}

export function useFetchTopics() {
  return useQuery({
    queryKey: ["topics"],
    queryFn: fetchTopics,
  });
}

export function useFetchTopicStats(politicianId: string) {
  return useQuery({
    queryKey: ["topics", "stats", politicianId],
    queryFn: () => fetchTopicStats(politicianId),
    enabled: !!politicianId,
  });
}
