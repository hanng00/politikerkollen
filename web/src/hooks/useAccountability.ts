import { useQuery, useInfiniteQuery } from "@tanstack/react-query";
import type {
  AccountabilityFilters,
  PromiseScore,
  PromiseEvidence,
  PromiseScoresResponse,
  FetchPromiseScoresOptions,
  PartyEvidenceScore,
  PartyScorecard,
} from "@/types";

const API_ENDPOINT = process.env.NEXT_PUBLIC_API_ENDPOINT;

function normalizeEvidence(raw: Record<string, unknown>): PromiseEvidence {
  return {
    ...raw,
    signal_weight: Number(raw.signal_weight) || 0,
    similarity_score: Number(raw.similarity_score) || 0,
    punkt: raw.punkt != null ? Number(raw.punkt) : null,
  } as PromiseEvidence;
}

function normalizePromiseScore(raw: Record<string, unknown>): PromiseScore {
  const topEvidence = Array.isArray(raw.top_evidence) 
    ? raw.top_evidence.map((e: Record<string, unknown>) => normalizeEvidence(e))
    : [];
  
  return {
    ...raw,
    proposition_count: Number(raw.proposition_count) || 0,
    motion_bifall_count: Number(raw.motion_bifall_count) || 0,
    motion_supported_count: Number(raw.motion_supported_count) || 0,
    motion_opposed_count: Number(raw.motion_opposed_count) || 0,
    party_filed_count: Number(raw.party_filed_count) || 0,
    total_evidence_count: Number(raw.total_evidence_count) || 0,
    composite_score: Number(raw.composite_score) || 0,
    top_evidence: topEvidence,
  } as PromiseScore;
}

async function fetchAccountabilityFilters(): Promise<AccountabilityFilters> {
  const res = await fetch(`${API_ENDPOINT}/contradictions/filters`);

  if (!res.ok) {
    throw new Error(`Failed to fetch filters: ${res.status}`);
  }

  return res.json();
}

export function useAccountabilityFilters() {
  return useQuery({
    queryKey: ["accountability", "filters"],
    queryFn: fetchAccountabilityFilters,
    staleTime: 5 * 60 * 1000,
  });
}

async function fetchPromiseScores(
  options: FetchPromiseScoresOptions = {}
): Promise<PromiseScoresResponse> {
  const params = new URLSearchParams();
  if (options.party) params.set("party", options.party);
  if (options.category) params.set("category", options.category);
  if (options.evidence_direction) params.set("evidence_direction", options.evidence_direction);
  if (options.outcome) params.set("outcome", options.outcome);
  if (options.limit) params.set("limit", options.limit.toString());
  if (options.offset) params.set("offset", options.offset.toString());

  const url = `${API_ENDPOINT}/promises/scores${params.toString() ? `?${params}` : ""}`;
  const res = await fetch(url);

  if (!res.ok) {
    throw new Error(`Failed to fetch promise scores: ${res.status}`);
  }

  const json = await res.json();
  return {
    ...json,
    data: json.data.map(normalizePromiseScore),
  };
}

async function fetchPromiseScoreById(id: string): Promise<PromiseScore> {
  const res = await fetch(`${API_ENDPOINT}/promises/scores/${id}`);

  if (!res.ok) {
    if (res.status === 404) {
      throw new Error("Löftet hittades inte");
    }
    throw new Error(`Failed to fetch promise score: ${res.status}`);
  }

  const json = await res.json();
  return normalizePromiseScore(json.data);
}

async function fetchPartyEvidenceScorecard(category?: string): Promise<PartyEvidenceScore[]> {
  const params = new URLSearchParams();
  if (category) params.set("category", category);
  const url = `${API_ENDPOINT}/parties/scorecard${params.toString() ? `?${params}` : ""}`;
  const res = await fetch(url);

  if (!res.ok) {
    throw new Error(`Failed to fetch evidence scorecard: ${res.status}`);
  }

  const json = await res.json();
  return json.data;
}

export function usePromiseScores(options: FetchPromiseScoresOptions = {}) {
  return useQuery({
    queryKey: ["promises", "scores", options],
    queryFn: () => fetchPromiseScores(options),
  });
}

export function useInfinitePromiseScores(options: Omit<FetchPromiseScoresOptions, "offset"> = {}) {
  const limit = options.limit ?? 12;
  return useInfiniteQuery({
    queryKey: ["promises", "scores", "infinite", options],
    queryFn: ({ pageParam = 0 }) => fetchPromiseScores({ ...options, limit, offset: pageParam }),
    initialPageParam: 0,
    getNextPageParam: (lastPage) => {
      const nextOffset = lastPage.meta.offset + lastPage.meta.limit;
      return nextOffset < lastPage.meta.total ? nextOffset : undefined;
    },
  });
}

export function usePromiseScore(id: string) {
  return useQuery({
    queryKey: ["promises", "score", id],
    queryFn: () => fetchPromiseScoreById(id),
    enabled: !!id,
  });
}

export function useAdjacentPromises(
  currentId: string,
  options: { party?: string; category?: string } = {}
) {
  const { data, isLoading } = usePromiseScores({
    party: options.party,
    category: options.category,
    limit: 200,
  });

  if (!data || isLoading) {
    return { prev: null, next: null, isLoading };
  }

  const promises = data.data;
  const currentIndex = promises.findIndex((p) => p.promise_id === currentId);

  if (currentIndex === -1) {
    return { prev: null, next: null, isLoading: false };
  }

  const prev = currentIndex > 0 ? promises[currentIndex - 1] : null;
  const next =
    currentIndex < promises.length - 1 ? promises[currentIndex + 1] : null;

  return { prev, next, isLoading: false };
}

export function usePartyEvidenceScorecard(category?: string) {
  return useQuery({
    queryKey: ["parties", "scorecard", category],
    queryFn: () => fetchPartyEvidenceScorecard(category),
    staleTime: 5 * 60 * 1000,
  });
}

async function fetchPartyScorecardById(partyId: string): Promise<PartyScorecard> {
  const res = await fetch(`${API_ENDPOINT}/parties/scorecard/${partyId}`);

  if (!res.ok) {
    if (res.status === 404) {
      throw new Error("Partiet hittades inte");
    }
    throw new Error(`Failed to fetch party scorecard: ${res.status}`);
  }

  const json = await res.json();
  return json.data;
}

export function usePartyScorecardById(partyId: string) {
  return useQuery({
    queryKey: ["parties", "scorecard", partyId],
    queryFn: () => fetchPartyScorecardById(partyId),
    enabled: !!partyId,
    staleTime: 5 * 60 * 1000,
  });
}
