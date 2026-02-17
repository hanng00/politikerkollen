/**
 * Repository for politician queries against MotherDuck mart tables
 */

import { escapeString, query } from '../../utils/motherduck';
import type { MartPerson, MartPersonTimeline } from './types';

const SCHEMA = 'main_mart';

export interface ListPoliticiansOptions {
  search?: string;
  party?: string;
  limit?: number;
}

export interface GetTimelineOptions {
  limit?: number;
  cursor?: string; // ISO date string for pagination
  actionTypes?: Array<'vote' | 'speech' | 'authored'>;
}

/**
 * List politicians with optional search and party filter
 */
export async function listPoliticians(options: ListPoliticiansOptions = {}): Promise<MartPerson[]> {
  const { search, party, limit = 50 } = options;
  console.log('[listPoliticians] Called with options:', JSON.stringify(options));

  const conditions: string[] = [];

  // Fuzzy search on name
  if (search && search.trim()) {
    const escaped = escapeString(search.trim());
    conditions.push(`jaro_winkler_similarity('${escaped}', namn) > 0.6`);
  }

  // Party filter
  if (party) {
    conditions.push(`parti = '${escapeString(party)}'`);
  }

  const whereClause = conditions.length > 0 ? `WHERE ${conditions.join(' AND ')}` : '';

  // Order by similarity if searching, otherwise by name
  const orderClause = search?.trim()
    ? `ORDER BY jaro_winkler_similarity('${escapeString(search.trim())}', namn) DESC`
    : `ORDER BY sorteringsnamn ASC`;

  const sql = `
    SELECT *
    FROM ${SCHEMA}.mart_person
    ${whereClause}
    ${orderClause}
    LIMIT ${limit}
  `;

  console.log('[listPoliticians] Executing SQL:', sql.trim());
  const result = await query<MartPerson>(sql);
  console.log('[listPoliticians] Result count:', result.data.length);
  return result.data;
}

/**
 * Get a single politician by ID
 */
export async function getPolitician(intressentId: string): Promise<MartPerson | null> {
  console.log('[getPolitician] Called with intressentId:', intressentId);
  const sql = `
    SELECT *
    FROM ${SCHEMA}.mart_person
    WHERE intressent_id = '${escapeString(intressentId)}'
    LIMIT 1
  `;

  console.log('[getPolitician] Executing SQL:', sql.trim());
  const result = await query<MartPerson>(sql);
  console.log('[getPolitician] Result:', result.data[0] ? 'Found' : 'Not found');
  return result.data[0] ?? null;
}

/**
 * Get timeline for a politician with cursor-based pagination
 */
export async function getTimeline(
  intressentId: string,
  options: GetTimelineOptions = {},
): Promise<{ items: MartPersonTimeline[]; hasMore: boolean }> {
  const { limit = 20, cursor, actionTypes } = options;
  console.log('[getTimeline] Called with intressentId:', intressentId, 'options:', JSON.stringify(options));

  const conditions: string[] = [`intressent_id = '${escapeString(intressentId)}'`];

  // Cursor-based pagination (action_date)
  if (cursor) {
    conditions.push(`action_date < '${escapeString(cursor)}'`);
  }

  // Filter by action types (supports multiple)
  if (actionTypes && actionTypes.length > 0) {
    const typeList = actionTypes.map(t => `'${escapeString(t)}'`).join(', ');
    conditions.push(`action_type IN (${typeList})`);
  }

  const whereClause = `WHERE ${conditions.join(' AND ')}`;

  // Fetch one extra to check if there are more
  const sql = `
    SELECT *
    FROM ${SCHEMA}.mart_person_timeline
    ${whereClause}
    ORDER BY action_date DESC
    LIMIT ${limit + 1}
  `;

  console.log('[getTimeline] Executing SQL:', sql.trim());
  const result = await query<MartPersonTimeline>(sql);

  const hasMore = result.data.length > limit;
  const items = hasMore ? result.data.slice(0, limit) : result.data;

  console.log('[getTimeline] Result count:', items.length, 'hasMore:', hasMore);
  return { items, hasMore };
}
