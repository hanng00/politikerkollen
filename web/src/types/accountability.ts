/**
 * Types for accountability cards (promise vs vote matching)
 * Matches the API response from mart_promise_accountability_cards
 */

/** A single motion/vote related to a promise */
export interface PromiseMotion {
  match_id: string;
  similarity_score: number;
  source_dok_id: string;
  source_dok_typ: "mot" | "prop";
  source_titel: string;
  source_parti: string | null;
  source_url: string | null;
  votering_id: string | null;
  bet_dok_id: string | null;
  punkt: number | null;
  punkt_rubrik: string | null;
  promise_party_vote: "Ja" | "Nej" | "Avstår" | null;
  ja_count: number | null;
  nej_count: number | null;
  riksdag_outcome: "Bifall" | "Avslag" | null;
  accountability_status: string;
}

/** A promise card with all related motions grouped */
export interface AccountabilityCard {
  // Promise info
  promise_id: string;
  document_id: string;
  promise_party: string;
  promise_year: number;
  promise_text: string;
  source_quote: string;
  category: string;

  // Aggregated motions
  motions: PromiseMotion[];
  motion_count: number;

  // Summary for sorting/filtering
  best_similarity_score: number;
  best_accountability_status: string;
  has_contradiction: boolean;
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
}

export interface AccountabilityCardsResponse {
  data: AccountabilityCard[];
  meta: {
    total: number;
    limit: number;
    offset: number;
  };
}
