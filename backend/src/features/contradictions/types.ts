/**
 * Types for the contradictions API
 */

export interface ContradictionCard {
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
  source_dok_typ: 'mot' | 'prop';
  source_titel: string;
  source_parti: string | null;
  source_url: string | null;

  // Vote info
  votering_id: string | null;
  bet_dok_id: string | null;
  punkt: number | null;
  punkt_rubrik: string | null;

  // Party vote
  promise_party_vote: 'Ja' | 'Nej' | 'Avstår' | null;
  promise_party_vote_count: number | null;

  // Overall outcome
  ja_count: number | null;
  nej_count: number | null;
  riksdag_outcome: 'Bifall' | 'Avslag' | null;

  // Accountability
  accountability_status: string;
}

export interface GetContradictionsRequest {
  party?: string;
  category?: string;
  limit?: number;
  offset?: number;
  min_similarity?: number;
}

export interface GetContradictionsResponse {
  data: ContradictionCard[];
  meta: {
    total: number;
    limit: number;
    offset: number;
  };
}

export const DEFAULT_LIMIT = 20;
export const DEFAULT_MIN_SIMILARITY = 0.75;
