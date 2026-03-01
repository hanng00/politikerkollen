import { useInfiniteQuery } from "@tanstack/react-query";

const API_ENDPOINT = process.env.NEXT_PUBLIC_API_ENDPOINT;

// API response types (matching backend)
export interface DocumentStakeholder {
  intressentId: string;
  name: string;
  party: string | null;
  role: "undertecknare" | "stalldtill" | "besvaradav" | "fragestallare";
}

export interface MotionImpactScore {
  score: number;
  isProvisional: boolean;
  organ: string | null;
  breakdown: {
    outcome:     { score: number | null; label: string | null; weight: number };
    voteMargin:  { score: number | null; ja: number | null; nej: number | null; weight: number };
    crossParty:  { score: number; parties: number; weight: number };
    signatories: { score: number; count: number; weight: number };
    topic:       { score: number; organ: string | null; weight: number };
  };
}

export interface TimelineItem {
  id: string;
  type: "vote" | "speech" | "authored";
  date: string;
  title: string | null;
  // Topic/committee info
  committee?: string;
  topic?: string;
  // Vote-specific
  voteValue?: string;
  votePunkt?: string;
  subjectText?: string;
  betankandeId?: string;
  betankandeTitel?: string;
  decisionType?: string; // röstning, acklamation
  winner?: string; // utskottet, reservation X, motförslaget
  // Speech-specific
  speechText?: string;
  activityType?: string;
  speechNumber?: number;
  isReply?: boolean;
  speechSubTitle?: string;
  protocolUrl?: string;
  debateType?: string;
  debateDocumentId?: string;
  // Authored-specific
  documentId?: string;
  documentType?: string;
  authorRole?: string;
  stakeholders?: DocumentStakeholder[];
  // Impact score — only present for authored motioner with resolved outcomes
  impactScore?: MotionImpactScore;
}

// Grouped timeline types for UI
export interface VoteGroup {
  type: "vote-group";
  betankandeId: string;
  betankandeTitel: string | null;
  topic: string | null;
  date: string; // Date of first vote in group
  votes: TimelineItem[];
  summary: {
    ja: number;
    nej: number;
    avstar: number;
    franvarande: number;
  };
}

export type GroupedTimelineItem = TimelineItem | VoteGroup;

/**
 * Groups consecutive votes by betänkande for cleaner timeline display
 */
export function groupTimelineItems(items: TimelineItem[]): GroupedTimelineItem[] {
  const result: GroupedTimelineItem[] = [];
  let currentVoteGroup: VoteGroup | null = null;

  for (const item of items) {
    if (item.type === "vote" && item.betankandeId) {
      // Check if we should add to existing group or start new one
      if (currentVoteGroup && currentVoteGroup.betankandeId === item.betankandeId) {
        // Add to existing group
        currentVoteGroup.votes.push(item);
        updateVoteSummary(currentVoteGroup.summary, item.voteValue);
      } else {
        // Flush previous group if exists
        if (currentVoteGroup) {
          result.push(currentVoteGroup);
        }
        // Start new group
        currentVoteGroup = {
          type: "vote-group",
          betankandeId: item.betankandeId,
          betankandeTitel: item.betankandeTitel ?? null,
          topic: item.topic ?? null,
          date: item.date,
          votes: [item],
          summary: { ja: 0, nej: 0, avstar: 0, franvarande: 0 },
        };
        updateVoteSummary(currentVoteGroup.summary, item.voteValue);
      }
    } else {
      // Non-vote item or vote without betänkande - flush any pending group
      if (currentVoteGroup) {
        result.push(currentVoteGroup);
        currentVoteGroup = null;
      }
      result.push(item);
    }
  }

  // Don't forget the last group
  if (currentVoteGroup) {
    result.push(currentVoteGroup);
  }

  return result;
}

function updateVoteSummary(
  summary: VoteGroup["summary"],
  voteValue: string | undefined
) {
  switch (voteValue) {
    case "Ja":
      summary.ja++;
      break;
    case "Nej":
      summary.nej++;
      break;
    case "Avstår":
      summary.avstar++;
      break;
    case "Frånvarande":
      summary.franvarande++;
      break;
  }
}

interface TimelineResponse {
  data: TimelineItem[];
  pagination: {
    hasMore: boolean;
    nextCursor: string | null;
  };
}

export type ActivityType = "vote" | "speech" | "authored";

interface FetchTimelineOptions {
  limit?: number;
  types?: ActivityType[];
}

async function fetchTimeline(
  politicianId: string,
  cursor: string | null,
  options: FetchTimelineOptions = {},
): Promise<TimelineResponse> {
  const params = new URLSearchParams();
  if (cursor) params.set("cursor", cursor);
  if (options.limit) params.set("limit", options.limit.toString());
  if (options.types && options.types.length > 0) {
    params.set("types", options.types.join(","));
  }

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
