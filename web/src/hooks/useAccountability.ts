import { useQuery } from "@tanstack/react-query";
import type {
  AccountabilityCard,
  AccountabilityFilters,
  AccountabilityCardsResponse,
  FetchAccountabilityCardsOptions,
} from "@/types";

const API_ENDPOINT = process.env.NEXT_PUBLIC_API_ENDPOINT;

async function fetchAccountabilityCards(
  options: FetchAccountabilityCardsOptions = {}
): Promise<AccountabilityCardsResponse> {
  const params = new URLSearchParams();
  if (options.party) params.set("party", options.party);
  if (options.category) params.set("category", options.category);
  if (options.limit) params.set("limit", options.limit.toString());
  if (options.offset) params.set("offset", options.offset.toString());

  const url = `${API_ENDPOINT}/contradictions${params.toString() ? `?${params}` : ""}`;
  const res = await fetch(url);

  if (!res.ok) {
    throw new Error(`Failed to fetch accountability cards: ${res.status}`);
  }

  return res.json();
}

async function fetchAccountabilityFilters(): Promise<AccountabilityFilters> {
  const res = await fetch(`${API_ENDPOINT}/contradictions/filters`);

  if (!res.ok) {
    throw new Error(`Failed to fetch filters: ${res.status}`);
  }

  return res.json();
}

async function fetchPromiseById(id: string): Promise<AccountabilityCard> {
  const res = await fetch(`${API_ENDPOINT}/contradictions/${id}`);

  if (!res.ok) {
    if (res.status === 404) {
      throw new Error("Löftet hittades inte");
    }
    throw new Error(`Failed to fetch promise: ${res.status}`);
  }

  const json = await res.json();
  return json.data;
}

export function useAccountabilityCards(options: FetchAccountabilityCardsOptions = {}) {
  return useQuery({
    queryKey: ["accountability", "cards", options],
    queryFn: () => fetchAccountabilityCards(options),
  });
}

export function useAccountabilityFilters() {
  return useQuery({
    queryKey: ["accountability", "filters"],
    queryFn: fetchAccountabilityFilters,
    staleTime: 5 * 60 * 1000, // Filters rarely change
  });
}

export function usePromise(id: string) {
  return useQuery({
    queryKey: ["accountability", "promise", id],
    queryFn: () => fetchPromiseById(id),
    enabled: !!id,
  });
}
