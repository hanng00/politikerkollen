import { useQuery } from "@tanstack/react-query";
import type { Speech } from "@/types";
import { getSpeechesByPolitician, getHighlightedSpeeches } from "@/mocks";

interface FetchSpeechesOptions {
  topicId?: string;
  highlightedOnly?: boolean;
  limit?: number;
}

async function fetchSpeeches(
  politicianId: string,
  options: FetchSpeechesOptions = {}
): Promise<Speech[]> {
  // Simulate network delay
  await new Promise((resolve) => setTimeout(resolve, 300));

  let speeches = options.highlightedOnly
    ? getHighlightedSpeeches(politicianId)
    : getSpeechesByPolitician(politicianId);

  // Filter by topic
  if (options.topicId) {
    speeches = speeches.filter((s) => s.topic.id === options.topicId);
  }

  // Sort by date (newest first)
  speeches.sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());

  // Limit
  if (options.limit) {
    speeches = speeches.slice(0, options.limit);
  }

  return speeches;
}

export function useFetchSpeeches(politicianId: string, options: FetchSpeechesOptions = {}) {
  return useQuery({
    queryKey: ["speeches", politicianId, options],
    queryFn: () => fetchSpeeches(politicianId, options),
    enabled: !!politicianId,
  });
}
