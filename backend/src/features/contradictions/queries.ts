/**
 * Query promises from mart_promise_score and mart_promise_evidence
 * 
 * Legacy endpoints (/contradictions/*) redirect to new endpoints or return empty data
 * to maintain backward compatibility during migration.
 */

import { query } from '../../utils/motherduck';
import type { AccountabilityCard, GetContradictionsRequest, GetPromiseScoresRequest, PartyScore, PromiseScore } from './types';
import { DEFAULT_LIMIT } from './types';

const MART_SCHEMA = 'main_mart';

/**
 * @deprecated Use getPromiseScores instead.
 * Returns empty data for backward compatibility.
 */
export async function getContradictions(
  request: GetContradictionsRequest,
): Promise<{ data: AccountabilityCard[]; total: number }> {
  // Return empty data - frontend should migrate to /promises/scores
  return { data: [], total: 0 };
}

/**
 * @deprecated Use getPromiseScores filters instead.
 * Still works - uses new mart_promise_score.
 */
export async function getContradictionFilters(): Promise<{
  parties: string[];
  categories: string[];
}> {
  // Use the new mart_promise_score for filters
  const sql = `
    SELECT 
      DISTINCT promise_party as party
    FROM ${MART_SCHEMA}.mart_promise_score
    ORDER BY promise_party
  `;

  const categorySql = `
    SELECT 
      DISTINCT category
    FROM ${MART_SCHEMA}.mart_promise_score
    ORDER BY category
  `;

  const [partyResult, categoryResult] = await Promise.all([
    query<{ party: string }>(sql),
    query<{ category: string }>(categorySql),
  ]);

  return {
    parties: partyResult.data.map((r) => r.party),
    categories: categoryResult.data.map((r) => r.category),
  };
}

/**
 * @deprecated Use getPromiseScoreById instead.
 * Returns null for backward compatibility.
 */
export async function getPromiseById(promiseId: string): Promise<AccountabilityCard | null> {
  // Return null - frontend should migrate to /promises/scores/:id
  return null;
}

/**
 * @deprecated Use getPartyEvidenceScorecard instead.
 * Returns empty array for backward compatibility.
 */
export async function getPartyScorecard(): Promise<PartyScore[]> {
  // Return empty - frontend should migrate to /promises/scorecard
  return [];
}

/**
 * Get promise scores with evidence-based assessment (new API)
 */
export async function getPromiseScores(
  request: GetPromiseScoresRequest,
): Promise<{ data: PromiseScore[]; total: number }> {
  const { party, category, evidence_direction, outcome, limit = DEFAULT_LIMIT, offset = 0 } = request;

  const conditions: string[] = [];

  if (party) {
    conditions.push(`promise_party = '${party}'`);
  }

  if (category) {
    conditions.push(`category = '${category}'`);
  }

  if (evidence_direction) {
    conditions.push(`evidence_direction = '${evidence_direction}'`);
  }

  // Outcome filter - maps to assessment categories
  if (outcome === 'positive') {
    // Positive = implemented, partial, championed, or supported (acted in favor)
    conditions.push(`evidence_direction IN ('implemented', 'partial', 'championed', 'supported')`);
  } else if (outcome === 'negative') {
    // Negative = opposed (voted against)
    conditions.push(`evidence_direction = 'opposed'`);
  } else if (outcome === 'contradictory') {
    // Contradictory = contradictory behavior
    conditions.push(`evidence_direction = 'contradictory'`);
  }

  const whereClause = conditions.length > 0 ? `WHERE ${conditions.join(' AND ')}` : '';

  const countSql = `
    SELECT COUNT(*) as total
    FROM ${MART_SCHEMA}.mart_promise_score
    ${whereClause}
  `;

  const countResult = await query<{ total: number }>(countSql);
  const total = countResult.data[0]?.total ?? 0;

  const dataSql = `
    SELECT 
      promise_id,
      promise_party,
      promise_year,
      promise_text,
      category,
      composite_score,
      evidence_strength,
      evidence_direction,
      assessment_label,
      total_evidence_count,
      proposition_count,
      motion_bifall_count,
      motion_supported_count,
      motion_opposed_count,
      party_filed_count,
      adopted_count,
      rejected_count,
      top_evidence,
      has_strong_positive,
      has_contradiction
    FROM ${MART_SCHEMA}.mart_promise_score
    ${whereClause}
    ORDER BY 
      has_contradiction DESC,
      abs(composite_score) DESC,
      total_evidence_count DESC,
      promise_year DESC
    LIMIT ${limit}
    OFFSET ${offset}
  `;

  const dataResult = await query<PromiseScore>(dataSql);

  return {
    data: dataResult.data,
    total,
  };
}

/**
 * Get a single promise score by ID with all evidence
 */
export async function getPromiseScoreById(promiseId: string): Promise<PromiseScore | null> {
  const sql = `
    SELECT 
      promise_id,
      promise_party,
      promise_year,
      promise_text,
      category,
      composite_score,
      evidence_strength,
      evidence_direction,
      assessment_label,
      total_evidence_count,
      proposition_count,
      motion_bifall_count,
      motion_supported_count,
      motion_opposed_count,
      party_filed_count,
      adopted_count,
      rejected_count,
      top_evidence,
      has_strong_positive,
      has_contradiction
    FROM ${MART_SCHEMA}.mart_promise_score
    WHERE promise_id = '${promiseId}'
    LIMIT 1
  `;

  const result = await query<PromiseScore>(sql);
  return result.data[0] ?? null;
}

/**
 * Get party-level scorecard using new evidence-based scoring
 */
export async function getPartyEvidenceScorecard(category?: string): Promise<Array<{
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
}>> {
  const whereClause = category ? `WHERE category = '${category}'` : '';
  const sql = `
    SELECT
      promise_party as party,
      COUNT(*) as total_promises,
      COALESCE(SUM(CASE WHEN evidence_direction = 'implemented' THEN 1 ELSE 0 END), 0) as implemented_count,
      COALESCE(SUM(CASE WHEN evidence_direction = 'partial' THEN 1 ELSE 0 END), 0) as partial_count,
      COALESCE(SUM(CASE WHEN evidence_direction = 'championed' THEN 1 ELSE 0 END), 0) as championed_count,
      COALESCE(SUM(CASE WHEN evidence_direction = 'supported' THEN 1 ELSE 0 END), 0) as supported_count,
      COALESCE(SUM(CASE WHEN evidence_direction = 'contradictory' THEN 1 ELSE 0 END), 0) as contradictory_count,
      COALESCE(SUM(CASE WHEN evidence_direction = 'opposed' THEN 1 ELSE 0 END), 0) as opposed_count,
      COALESCE(SUM(CASE WHEN evidence_direction = 'unclear' THEN 1 ELSE 0 END), 0) as unclear_count,
      COALESCE(SUM(CASE WHEN evidence_direction IN ('implemented', 'partial', 'championed', 'supported') THEN 1 ELSE 0 END), 0) as positive_count,
      COALESCE(SUM(CASE WHEN evidence_direction = 'opposed' THEN 1 ELSE 0 END), 0) as negative_count,
      ROUND(AVG(composite_score), 3) as avg_score
    FROM ${MART_SCHEMA}.mart_promise_score
    ${whereClause}
    GROUP BY promise_party
    ORDER BY avg_score DESC
  `;

  const result = await query<{
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
  }>(sql);
  return result.data;
}
