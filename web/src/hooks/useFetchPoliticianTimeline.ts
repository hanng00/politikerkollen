import { useInfiniteQuery } from "@tanstack/react-query";

const API_ENDPOINT = process.env.NEXT_PUBLIC_API_ENDPOINT;

// API response types (matching backend)
export interface TimelineItem {
  id: string;
  type: "vote" | "speech" | "authored";
  date: string;
  title: string | null;
  // Vote-specific
  voteValue?: string;
  votePunkt?: string;
  subjectText?: string;
  betankandeId?: string;
  betankandeTitel?: string;
  // Speech-specific
  speechText?: string;
  activityType?: string;
  // Authored-specific
  documentId?: string;
  documentType?: string;
  authorRole?: string;
}

interface TimelineResponse {
  data: TimelineItem[];
  pagination: {
    hasMore: boolean;
    nextCursor: string | null;
  };
}

interface FetchTimelineOptions {
  limit?: number;
  type?: "vote" | "speech" | "authored";
}

async function fetchTimeline(
  politicianId: string,
  cursor: string | null,
  options: FetchTimelineOptions = {},
): Promise<TimelineResponse> {
  const params = new URLSearchParams();
  if (cursor) params.set("cursor", cursor);
  if (options.limit) params.set("limit", options.limit.toString());
  if (options.type) params.set("type", options.type);

  const url = `${API_ENDPOINT}/politicians/${politicianId}/timeline${params.toString() ? `?${params}` : ""}`;
  const res = await fetch(url);

  if (!res.ok) {
    throw new Error(`Failed to fetch timeline: ${res.status}`);
  }

  return res.json();
}

export function useFetchPoliticianTimeline(
  politicianId: string,
  options: FetchTimelineOptions = {},
) {
  return useInfiniteQuery({
    queryKey: ["politician-timeline", politicianId, options],
    queryFn: ({ pageParam }) => fetchTimeline(politicianId, pageParam, options),
    initialPageParam: null as string | null,
    getNextPageParam: (lastPage) =>
      lastPage.pagination.hasMore ? lastPage.pagination.nextCursor : undefined,
    enabled: !!politicianId,
  });
}
