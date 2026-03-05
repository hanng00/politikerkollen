/**
 * Types for accountability cards (promise vs vote matching)
 * Matches the API response from mart_promise_accountability_cards
 */

export interface AccountabilityCard {
  // Promise info
  promise_id: string;
  promise_party: string;
  promise_year: number;
  promise_text: string;
  source_quote: string;
  category: string;

  // Match info
  match_id: string;
  similarity_score: number;

  // Source document info
  source_dok_id: string;
  source_dok_typ: "mot" | "prop";
  source_titel: string;
  source_parti: string | null;
  source_url: string | null;

  // Vote info
  votering_id: string | null;
  bet_dok_id: string | null;
  punkt: number | null;
  punkt_rubrik: string | null;

  // Party vote
  promise_party_vote: "Ja" | "Nej" | "Avstår" | null;
  promise_party_vote_count: number | null;

  // Overall outcome
  ja_count: number | null;
  nej_count: number | null;
  riksdag_outcome: "Bifall" | "Avslag" | null;

  // Accountability
  accountability_status: string;
}

export interface AccountabilityFilters {
  parties: string[];
  categories: string[];
}

export interface FetchAccountabilityCardsOptions {
  party?: string;
  category?: string;
  limit?: number;
  offset?: number;
  min_similarity?: number;
}

export interface AccountabilityCardsResponse {
  data: AccountabilityCard[];
  meta: {
    total: number;
    limit: number;
    offset: number;
  };
}
