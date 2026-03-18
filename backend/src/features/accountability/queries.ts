/**
 * Query promises from mart_promise_score and mart_promise_evidence
 */

import { query } from '../../utils/motherduck';
import type { GetPromiseScoresRequest, PromiseScore, PromiseEvidence } from './types';
import { DEFAULT_LIMIT } from './types';

/** Raw row from DB where top_evidence is a JSON string */
interface PromiseScoreRow extends Omit<PromiseScore, 'top_evidence'> {
  top_evidence: string;
}

/** Parse top_evidence JSON string into array */
function parsePromiseScore(row: PromiseScoreRow): PromiseScore {
  let topEvidence: PromiseEvidence[] = [];
  try {
    if (row.top_evidence && typeof row.top_evidence === 'string') {
      topEvidence = JSON.parse(row.top_evidence);
    } else if (Array.isArray(row.top_evidence)) {
      topEvidence = row.top_evidence;
    }
  } catch (e) {
    console.error('Failed to parse top_evidence:', e);
  }
  return {
    ...row,
    top_evidence: topEvidence,
  };
}

const MART_SCHEMA = 'main_mart';

/**
 * Get available filter options for promises
 */
export async function getPromiseFilters(): Promise<{
  parties: string[];
  categories: string[];
}> {
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
 * Get promise scores with evidence-based assessment
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

  if (outcome === 'positive') {
    conditions.push(`evidence_direction IN ('implemented', 'partial', 'championed', 'supported')`);
  } else if (outcome === 'negative') {
    conditions.push(`evidence_direction = 'opposed'`);
  } else if (outcome === 'contradictory') {
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

  const dataResult = await query<PromiseScoreRow>(dataSql);

  return {
    data: dataResult.data.map(parsePromiseScore),
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

  const result = await query<PromiseScoreRow>(sql);
  const row = result.data[0];
  return row ? parsePromiseScore(row) : null;
}

/**
 * Get party-level scorecard using evidence-based scoring
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
