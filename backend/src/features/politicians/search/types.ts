/**
 * Types for the semantic politician search API
 */

export interface SearchPoliticiansRequest {
  query: string;
  limit?: number;
  riksmote_year?: number;
}

export interface SourceMatch {
  dok_id: string;
  titel: string;
  dok_typ: 'mot' | 'prop';
  similarity: number;
  parti: string | null;
  intressent_ids: string[] | null;
}

export interface PoliticianAction {
  intressent_id: string;
  dok_id: string;
  action: 'authored' | 'voted_ja' | 'voted_nej';
  similarity: number;
  weight: number;
}

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
    action: 'authored' | 'voted_ja' | 'voted_nej';
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

export const SCORING_WEIGHTS = {
  authored: 10,
  voted_ja: 3,
  voted_nej: -3,
} as const;

export const DEFAULT_SIMILARITY_THRESHOLD = 0.7;
export const DEFAULT_LIMIT = 20;
export const DEFAULT_RIKSMOTE_YEAR = 2024;
