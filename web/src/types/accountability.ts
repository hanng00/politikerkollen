/**
 * Types for promise accountability (evidence-based scoring)
 * Matches the API response from mart_promise_score
 */

/** A single piece of evidence for a promise */
export interface PromiseEvidence {
  match_id: string;
  source_dok_id: string;
  source_dok_typ: "mot" | "prop";
  source_titel: string;
  source_summary: string | null;
  source_url: string | null;
  source_datum: string | null;
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

/** A promise with aggregated evidence and composite score */
export interface PromiseScore {
  promise_id: string;
  promise_party: string;
  promise_year: number;
  promise_text: string;
  category: string;
  source_type: 'valmanifest' | 'tidoavtalet';

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

export interface AccountabilityFilters {
  parties: string[];
  categories: string[];
}

export interface FetchPromiseScoresOptions {
  party?: string;
  category?: string;
  evidence_direction?: string;
  outcome?: "positive" | "negative" | "contradictory";
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
  implemented_count: number;
  partial_count: number;
  championed_count: number;
  supported_count: number;
  contradictory_count: number;
  opposed_count: number;
  unclear_count: number;
  positive_count: number;
  negative_count: number;
  avg_score: number;
}

/** Category-level fulfillment breakdown */
export interface CategoryFulfillment {
  category: string;
  total: number;
  implemented_count: number;
  partial_count: number;
  fulfillment_rate: number;
}

/** Full party scorecard with detailed breakdown */
export interface PartyScorecard {
  party: string;
  party_name: string;
  total_promises: number;
  
  // Counts by outcome
  implemented_count: number;
  partial_count: number;
  championed_count: number;
  supported_count: number;
  contradictory_count: number;
  opposed_count: number;
  unclear_count: number;
  
  // Derived metrics
  positive_count: number;
  fulfillment_rate: number;
  avg_score: number;
  
  // Category breakdown
  best_categories: CategoryFulfillment[];
  worst_categories: CategoryFulfillment[];
  
  // Source breakdown
  valmanifest_count: number;
  tidoavtalet_count: number;
}
