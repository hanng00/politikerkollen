import { useQuery } from "@tanstack/react-query";

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
  };
}

interface FetchPoliticiansOptions {
  search?: string;
  party?: string;
  limit?: number;
}

async function fetchPoliticians(
  options: FetchPoliticiansOptions = {},
): Promise<PoliticianSummary[]> {
  const params = new URLSearchParams();
  if (options.search) params.set("search", options.search);
  if (options.party) params.set("party", options.party);
  if (options.limit) params.set("limit", options.limit.toString());

  const url = `${API_ENDPOINT}/politicians${params.toString() ? `?${params}` : ""}`;
  const res = await fetch(url);

  if (!res.ok) {
    throw new Error(`Failed to fetch politicians: ${res.status}`);
  }

  const json = await res.json();
  return json.data;
}

export function useFetchPoliticians(options: FetchPoliticiansOptions = {}) {
  return useQuery({
    queryKey: ["politicians", options],
    queryFn: () => fetchPoliticians(options),
  });
}
