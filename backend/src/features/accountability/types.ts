/**
 * Types for the promise accountability API
 */

/** A single piece of evidence for a promise */
export interface PromiseEvidence {
  match_id: string;
  source_dok_id: string;
  source_dok_typ: 'mot' | 'prop';
  source_titel: string;
  source_url: string | null;
  alignment: 'supports' | 'opposes' | 'tangential' | null;
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
  
  // Composite assessment
  composite_score: number;
  evidence_strength: 'strong' | 'moderate' | 'weak' | 'none';
  evidence_direction: 'implemented' | 'partial' | 'championed' | 'supported' | 'contradictory' | 'opposed' | 'unclear';
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

export interface GetPromiseScoresRequest {
  party?: string;
  category?: string;
  evidence_direction?: string;
  outcome?: 'positive' | 'negative' | 'contradictory';
  limit?: number;
  offset?: number;
}

export interface GetPromiseScoresResponse {
  data: PromiseScore[];
  meta: {
    total: number;
    limit: number;
    offset: number;
  };
}

export const DEFAULT_LIMIT = 20;
