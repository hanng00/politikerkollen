/**
 * Types for accountability cards (promise vs vote matching)
 * Matches the API response from mart_promise_accountability_cards
 */

/** A single piece of evidence for a promise (new evidence-based API) */
export interface PromiseEvidence {
  match_id: string;
  source_dok_id: string;
  source_dok_typ: "mot" | "prop";
  source_titel: string;
  source_summary: string | null;
  source_url: string | null;
  alignment: "supports" | "opposes" | "tangential" | null;
  alignment_rationale: string | null;
  signal_type: string;
  signal_weight: number;
  signal_description: string;
  effective_stance: string | null;
  bet_dok_id: string | null;
  punkt: number | null;
  punkt_rubrik: string | null;
  motion_outcome: string | null;
  similarity_score: number;
}

/** A promise with aggregated evidence and composite score (new evidence-based API) */
export interface PromiseScore {
  promise_id: string;
  promise_party: string;
  promise_year: number;
  promise_text: string;
  category: string;

  // Composite assessment
  composite_score: number;
  evidence_strength: "strong" | "moderate" | "weak" | "none";
  evidence_direction:
    | "implemented"
    | "partial"
    | "championed"
    | "supported"
    | "contradictory"
    | "opposed"
    | "unclear";
  assessment_label: string;

  // Evidence counts
  total_evidence_count: number;
  proposition_count: number;
  motion_bifall_count: number;
  motion_supported_count: number;
  motion_opposed_count: number;
  party_filed_count: number;
  adopted_count: number;
  rejected_count: number;

  // Top evidence items
  top_evidence: PromiseEvidence[];

  // Flags
  has_strong_positive: boolean;
  has_contradiction: boolean;
}

/** A single motion/vote related to a promise (legacy) */
export interface PromiseMotion {
  match_id: string;
  similarity_score: number;
  alignment: "supports" | "opposes" | "tangential" | null;
  alignment_rationale: string | null;
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

export interface PartyScore {
  party: string;
  total_promises: number;
  kept: number;
  broke: number;
  defended: number;
  contradicted: number;
  tangential: number;
  abstained: number;
  unknown: number;
  kept_pct: number;
  broke_pct: number;
}

export interface FetchPromiseScoresOptions {
  party?: string;
  category?: string;
  evidence_direction?: string;
  outcome?: 'positive' | 'negative' | 'contradictory';
  limit?: number;
  offset?: number;
}

export interface PromiseScoresResponse {
  data: PromiseScore[];
  meta: {
    total: number;
    limit: number;
    offset: number;
  };
}

export interface PartyEvidenceScore {
  party: string;
  total_promises: number;
  // New categories matching evidence_direction
  implemented_count: number;
  partial_count: number;
  championed_count: number;
  supported_count: number;
  contradictory_count: number;
  opposed_count: number;
  unclear_count: number;
  // Aggregated for display
  positive_count: number;  // implemented + partial + championed + supported
  negative_count: number;  // opposed
  avg_score: number;
}
