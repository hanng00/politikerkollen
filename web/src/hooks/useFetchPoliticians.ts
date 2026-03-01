import { useQuery, useInfiniteQuery } from "@tanstack/react-query";

const API_ENDPOINT = process.env.NEXT_PUBLIC_API_ENDPOINT;

// API response types (matching backend)
export interface PoliticianSummary {
  id: string;
  firstName: string;
  lastName: string;
  name: string;
  party: string;
  constituency: string;
  status: string;
  imageUrl: string | null;
  stats: {
    totalVotes: number;
    totalSpeeches: number;
    totalAuthored: number;
    rebelVoteCount: number;
  };
  // Accountability metrics
  motionStats?: {
    total: number;
    passed: number;
    passRate: number;
  };
  topRebelTopic?: {
    topic: string;
    count: number;
  };
  accountabilityStats?: {
    interpellations: number;
    writtenQuestions: number;
    totalQuestions: number;
  };
  scrutinizedStats?: {
    interpellationsReceived: number;
    writtenQuestionsReceived: number;
    totalQuestionsReceived: number;
  };
}

interface PaginatedResponse {
  data: PoliticianSummary[];
  nextOffset: number | null;
  hasMore: boolean;
}

export type SortOption = "name" | "mostActive" | "mostVotes" | "mostSpeeches" | "mostRebel" | "mostEffective";

export interface FetchPoliticiansOptions {
  search?: string;
  party?: string;
  constituency?: string;
  limit?: number;
  sortBy?: SortOption;
  fromDate?: string;
  toDate?: string;
  /** Include politicians without party affiliation ("-") in rebel vote rankings. Default: false */
  includeIndependents?: boolean;
}

interface FetchPoliticiansPageOptions extends FetchPoliticiansOptions {
  offset?: number;
}

export async function fetchPoliticiansPage(
  options: FetchPoliticiansPageOptions = {},
): Promise<PaginatedResponse> {
  const params = new URLSearchParams();
  if (options.search) params.set("search", options.search);
  if (options.party) params.set("party", options.party);
  if (options.constituency) params.set("constituency", options.constituency);
  if (options.limit) params.set("limit", options.limit.toString());
  if (options.offset) params.set("offset", options.offset.toString());
  if (options.sortBy) params.set("sortBy", options.sortBy);
  if (options.fromDate) params.set("fromDate", options.fromDate);
  if (options.toDate) params.set("toDate", options.toDate);
  if (options.includeIndependents) params.set("includeIndependents", "true");

  const url = `${API_ENDPOINT}/politicians${params.toString() ? `?${params}` : ""}`;
  const res = await fetch(url);

  if (!res.ok) {
    throw new Error(`Failed to fetch politicians: ${res.status}`);
  }

  const json = await res.json();
  
  // Handle both old format ({ data: [...] }) and new format ({ data, hasMore, nextOffset })
  if ("hasMore" in json) {
    return json;
  }
  
  // Old format - infer pagination from response length
  const limit = options.limit ?? 30;
  const offset = options.offset ?? 0;
  const data = json.data as PoliticianSummary[];
  const hasMore = data.length >= limit;
  
  return {
    data,
    hasMore,
    nextOffset: hasMore ? offset + limit : null,
  };
}

export function useFetchPoliticians(options: FetchPoliticiansOptions = {}) {
  return useQuery({
    queryKey: ["politicians", options],
    queryFn: async () => {
      const result = await fetchPoliticiansPage(options);
      return result.data;
    },
  });
}

const DEFAULT_PAGE_SIZE = 30;

export function useInfiniteFetchPoliticians(options: FetchPoliticiansOptions = {}) {
  const limit = options.limit ?? DEFAULT_PAGE_SIZE;
  
  return useInfiniteQuery({
    queryKey: ["politicians-infinite", { ...options, limit }],
    queryFn: ({ pageParam = 0 }) =>
      fetchPoliticiansPage({ ...options, limit, offset: pageParam }),
    initialPageParam: 0,
    getNextPageParam: (lastPage) => lastPage.nextOffset,
  });
}
