/**
 * Query contradictions from mart_promise_accountability_cards
 */

import { query } from '../../utils/motherduck';
import type { ContradictionCard, GetContradictionsRequest } from './types';
import { DEFAULT_LIMIT, DEFAULT_MIN_SIMILARITY } from './types';

const MART_SCHEMA = 'main_mart';

/**
 * Get contradiction cards - promises where party voted against related motions
 */
export async function getContradictions(
  request: GetContradictionsRequest
): Promise<{ data: ContradictionCard[]; total: number }> {
  const {
    party,
    category,
    limit = DEFAULT_LIMIT,
    offset = 0,
    min_similarity = DEFAULT_MIN_SIMILARITY,
  } = request;

  const conditions: string[] = [
    `similarity_score >= ${min_similarity}`,
    `votering_id IS NOT NULL`,
    `promise_party_vote IS NOT NULL`,
  ];

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

  // Get data with pagination, ordered by similarity (most relevant first)
  const dataSql = `
    SELECT 
      promise_id,
      promise_party,
      promise_year,
      promise_text,
      source_quote,
      category,
      match_id,
      similarity_score,
      source_dok_id,
      source_dok_typ,
      source_titel,
      source_parti,
      source_url,
      votering_id,
      bet_dok_id,
      punkt,
      punkt_rubrik,
      promise_party_vote,
      promise_party_vote_count,
      ja_count,
      nej_count,
      riksdag_outcome,
      accountability_status
    FROM ${MART_SCHEMA}.mart_promise_accountability_cards
    ${whereClause}
    ORDER BY similarity_score DESC, promise_year DESC
    LIMIT ${limit}
    OFFSET ${offset}
  `;

  const dataResult = await query<ContradictionCard>(dataSql);

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
    WHERE votering_id IS NOT NULL
    ORDER BY promise_party
  `;

  const categorySql = `
    SELECT 
      DISTINCT category
    FROM ${MART_SCHEMA}.mart_promise_accountability_cards
    WHERE votering_id IS NOT NULL
    ORDER BY category
  `;

  const [partyResult, categoryResult] = await Promise.all([
    query<{ party: string }>(sql),
    query<{ category: string }>(categorySql),
  ]);

  return {
    parties: partyResult.data.map(r => r.party),
    categories: categoryResult.data.map(r => r.category),
  };
}
