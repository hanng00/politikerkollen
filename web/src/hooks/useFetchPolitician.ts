import { useQuery } from "@tanstack/react-query";

const API_ENDPOINT = process.env.NEXT_PUBLIC_API_ENDPOINT;

// API response type (matching backend)
export interface PoliticianDetail {
  id: string;
  firstName: string;
  lastName: string;
  name: string;
  party: string;
  constituency: string;
  status: string;
  imageUrl: string | null;
  birthYear: number | null;
  gender: string | null;
  firstActionDate: string | null;
  lastActionDate: string | null;
  stats: {
    totalVotes: number;
    totalSpeeches: number;
    totalAuthored: number;
  };
}

async function fetchPolitician(id: string): Promise<PoliticianDetail | null> {
  const res = await fetch(`${API_ENDPOINT}/politicians/${id}`);

  if (res.status === 404) {
    return null;
  }

  if (!res.ok) {
    throw new Error(`Failed to fetch politician: ${res.status}`);
  }

  const json = await res.json();
  return json.data;
}

export function useFetchPolitician(id: string) {
  return useQuery({
    queryKey: ["politician", id],
    queryFn: () => fetchPolitician(id),
    enabled: !!id,
  });
}
