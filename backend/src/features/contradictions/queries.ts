/**
 * Query contradictions from mart_promise_accountability_cards
 */

import { query } from '../../utils/motherduck';
import type { AccountabilityCard, GetContradictionsRequest } from './types';
import { DEFAULT_LIMIT } from './types';

const MART_SCHEMA = 'main_mart';

/**
 * Get accountability cards - promises grouped with their related motions and votes
 */
export async function getContradictions(
  request: GetContradictionsRequest,
): Promise<{ data: AccountabilityCard[]; total: number }> {
  const { party, category, limit = DEFAULT_LIMIT, offset = 0 } = request;

  const conditions: string[] = [];

  if (party) {
    conditions.push(`promise_party = '${party}'`);
  }

  if (category) {
    conditions.push(`category = '${category}'`);
  }

  const whereClause = conditions.length > 0 ? `WHERE ${conditions.join(' AND ')}` : '';

  // Get total count
  const countSql = `
    SELECT COUNT(*) as total
    FROM ${MART_SCHEMA}.mart_promise_accountability_cards
    ${whereClause}
  `;

  const countResult = await query<{ total: number }>(countSql);
  const total = countResult.data[0]?.total ?? 0;

  // Get data with pagination, ordered by contradiction status then similarity
  const dataSql = `
    SELECT 
      promise_id,
      document_id,
      promise_party,
      promise_year,
      promise_text,
      source_quote,
      category,
      motions,
      motion_count,
      best_similarity_score,
      best_accountability_status,
      has_contradiction
    FROM ${MART_SCHEMA}.mart_promise_accountability_cards
    ${whereClause}
    ORDER BY 
      has_contradiction DESC,
      best_similarity_score DESC, 
      promise_year DESC
    LIMIT ${limit}
    OFFSET ${offset}
  `;

  const dataResult = await query<AccountabilityCard>(dataSql);

  return {
    data: dataResult.data,
    total,
  };
}

/**
 * Get available filter options
 */
export async function getContradictionFilters(): Promise<{
  parties: string[];
  categories: string[];
}> {
  const sql = `
    SELECT 
      DISTINCT promise_party as party
    FROM ${MART_SCHEMA}.mart_promise_accountability_cards
    ORDER BY promise_party
  `;

  const categorySql = `
    SELECT 
      DISTINCT category
    FROM ${MART_SCHEMA}.mart_promise_accountability_cards
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
 * Get a single promise by ID with all related motions
 */
export async function getPromiseById(promiseId: string): Promise<AccountabilityCard | null> {
  const sql = `
    SELECT 
      promise_id,
      document_id,
      promise_party,
      promise_year,
      promise_text,
      source_quote,
      category,
      motions,
      motion_count,
      best_similarity_score,
      best_accountability_status,
      has_contradiction
    FROM ${MART_SCHEMA}.mart_promise_accountability_cards
    WHERE promise_id = '${promiseId}'
    LIMIT 1
  `;

  const result = await query<AccountabilityCard>(sql);
  return result.data[0] ?? null;
}
