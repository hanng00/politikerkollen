import { useMutation } from "@tanstack/react-query";

const API_ENDPOINT = process.env.NEXT_PUBLIC_API_ENDPOINT;

export interface PoliticianSearchResult {
  intressent_id: string;
  name: string;
  party: string;
  constituency: string | null;
  image_url: string | null;
  score: number;
  evidence: {
    motions_authored: number;
    votes_for: number;
    votes_against: number;
  };
  top_matches: Array<{
    dok_id: string;
    titel: string;
    similarity: number;
    action: "authored" | "voted_ja" | "voted_nej";
  }>;
}

export interface SearchPoliticiansResponse {
  query: string;
  results: PoliticianSearchResult[];
  metadata: {
    total_matches: number;
    search_time_ms: number;
  };
}

export interface SearchPoliticiansOptions {
  query: string;
  limit?: number;
  riksmote_year?: number;
}

export async function searchPoliticians(
  options: SearchPoliticiansOptions
): Promise<SearchPoliticiansResponse> {
  const response = await fetch(`${API_ENDPOINT}/search/politicians`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      query: options.query.trim(),
      limit: options.limit ?? 20,
      riksmote_year: options.riksmote_year ?? 2024,
    }),
  });

  if (!response.ok) {
    const errorData = await response.json().catch(() => ({}));
    throw new Error(
      errorData.error || `Sökningen misslyckades (${response.status})`
    );
  }

  return response.json();
}

export function useSearchPoliticians() {
  return useMutation({
    mutationFn: searchPoliticians,
  });
}
