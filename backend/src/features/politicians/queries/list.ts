/**
 * Queries for listing politicians with search, filters, and sorting
 */

import { logSql } from '../../../utils/logger';
import { query } from '../../../utils/motherduck';
import {
  PersonColumns,
  Tables,
  TimelineColumns,
  and,
  buildQuery,
  buildTimelineStatsCTE,
  cte,
  eq,
  fuzzyMatch,
  gte,
  isNotNull,
  lte,
  politicianOrderBy,
  quote,
  type Condition,
} from '../../../utils/sql-builder';
import type { MartPerson } from '../types';

export interface ListPoliticiansOptions {
  search?: string;
  party?: string;
  constituency?: string;
  limit?: number;
  offset?: number;
  sortBy?: 'name' | 'mostActive' | 'mostVotes' | 'mostSpeeches' | 'mostRebel' | 'mostEffective';
  fromDate?: string;
  toDate?: string;
  includeIndependents?: boolean;
}

/**
 * List politicians with optional search and party filter
 * When date filters are provided, stats are aggregated from timeline table
 */
export async function listPoliticians(options: ListPoliticiansOptions = {}): Promise<MartPerson[]> {
  const { search, party, constituency, limit = 50, offset = 0, sortBy = 'mostEffective', fromDate, toDate } = options;
  console.log('[listPoliticians] Called with options:', JSON.stringify(options));

  if (fromDate || toDate) {
    return listPoliticiansWithDateFilter(options);
  }

  if (sortBy === 'mostEffective') {
    return listPoliticiansByEffectiveness(options);
  }

  const conditions: Condition[] = [];

  if (search?.trim()) {
    conditions.push(fuzzyMatch(PersonColumns.namn, search.trim()));
  }

  if (party) {
    conditions.push(eq(PersonColumns.parti, party));
  }

  if (constituency) {
    conditions.push(eq(PersonColumns.valkrets, constituency));
  }

  const sql = buildQuery({
    select: '*',
    from: Tables.person,
    where: and(...conditions),
    orderBy: politicianOrderBy(sortBy, search),
    limit,
    offset,
  });

  logSql('[listPoliticians] Executing SQL:', sql);
  const result = await query<MartPerson>(sql);
  console.log('[listPoliticians] Result count:', result.data.length);
  return result.data;
}

/**
 * List politicians sorted by motion effectiveness using Bayesian ranking
 */
async function listPoliticiansByEffectiveness(options: ListPoliticiansOptions): Promise<MartPerson[]> {
  const { search, party, constituency, limit = 50, offset = 0 } = options;

  const conditions: Condition[] = [];

  if (search?.trim()) {
    conditions.push(fuzzyMatch(PersonColumns.namn, search.trim(), 0.6, 'p'));
  }

  if (party) {
    conditions.push(eq(PersonColumns.parti, party, 'p'));
  }

  if (constituency) {
    conditions.push(eq(PersonColumns.valkrets, constituency, 'p'));
  }

  const sql = buildQuery({
    select: 'p.*',
    from: `${Tables.person} p`,
    joins: [`LEFT JOIN ${Tables.motionRank} mr ON p.intressent_id = mr.intressent_id`],
    where: and(...conditions),
    orderBy: search?.trim()
      ? politicianOrderBy('name', search, 'p')
      : `COALESCE(mr.ranking_score, 0) DESC,
         (COALESCE(p.total_votes, 0) + COALESCE(p.total_speeches, 0) + COALESCE(p.total_authored, 0)) DESC`,
    limit,
    offset,
  });

  logSql('[listPoliticiansByEffectiveness] Executing SQL:', sql);
  const result = await query<MartPerson>(sql);
  console.log('[listPoliticiansByEffectiveness] Result count:', result.data.length);
  return result.data;
}

/**
 * List politicians with date-filtered stats aggregated from timeline
 */
async function listPoliticiansWithDateFilter(options: ListPoliticiansOptions): Promise<MartPerson[]> {
  const {
    search,
    party,
    constituency,
    limit = 50,
    offset = 0,
    sortBy = 'mostEffective',
    fromDate,
    toDate,
  } = options;

  if (sortBy === 'mostEffective') {
    return listPoliticiansByEffectivenessWithDateFilter(options);
  }

  const timelineConditions: Condition[] = [];
  if (fromDate) {
    timelineConditions.push(gte(TimelineColumns.action_date, fromDate));
  }
  if (toDate) {
    timelineConditions.push(lte(TimelineColumns.action_date, toDate));
  }

  const personConditions: Condition[] = [];
  if (search?.trim()) {
    personConditions.push(fuzzyMatch(PersonColumns.namn, search.trim(), 0.6, 'p'));
  }
  if (party) {
    personConditions.push(eq(PersonColumns.parti, party, 'p'));
  }
  if (constituency) {
    personConditions.push(eq(PersonColumns.valkrets, constituency, 'p'));
  }

  const statsCTE = buildTimelineStatsCTE('filtered_stats', timelineConditions);

  const selectColumns = [
    'p.intressent_id',
    'p.tilltalsnamn',
    'p.efternamn',
    'p.namn',
    'p.sorteringsnamn',
    'p.parti',
    'p.valkrets',
    'p.status',
    'p.fodd_ar',
    'p.kon',
    'p.bild_url_80',
    'p.bild_url_192',
    'p.bild_url_max',
    'COALESCE(stats.total_actions, 0) as total_actions',
    'COALESCE(stats.total_votes, 0) as total_votes',
    'COALESCE(stats.total_speeches, 0) as total_speeches',
    'COALESCE(stats.total_authored, 0) as total_authored',
    'COALESCE(p.rebel_vote_count, 0) as rebel_vote_count',
    'stats.first_action_date',
    'stats.last_action_date',
  ].join(',\n  ');

  const effectiveSortBy = sortBy === 'mostRebel' ? 'mostActive' : sortBy;
  
  let orderByClause: string;
  if (search?.trim()) {
    orderByClause = politicianOrderBy(effectiveSortBy, search, 'p');
  } else {
    const tableAlias = effectiveSortBy === 'name' ? 'p' : 'stats';
    orderByClause = politicianOrderBy(effectiveSortBy, undefined, tableAlias);
  }

  const sql = buildQuery({
    ctes: [statsCTE],
    select: selectColumns,
    from: `${Tables.person} p`,
    joins: [
      'LEFT JOIN filtered_stats stats ON p.intressent_id = stats.intressent_id',
    ],
    where: and(...personConditions),
    orderBy: orderByClause,
    limit,
    offset,
  });

  logSql('[listPoliticiansWithDateFilter] Executing SQL:', sql);
  const result = await query<MartPerson>(sql);
  console.log('[listPoliticiansWithDateFilter] Result count:', result.data.length);
  return result.data;
}

/**
 * List politicians sorted by motion effectiveness within a date range
 */
async function listPoliticiansByEffectivenessWithDateFilter(options: ListPoliticiansOptions): Promise<MartPerson[]> {
  const {
    search,
    party,
    constituency,
    limit = 50,
    offset = 0,
    fromDate,
    toDate,
  } = options;

  const dateConditions: string[] = [];
  if (fromDate) {
    dateConditions.push(`t.action_date >= ${quote(fromDate)}`);
  }
  if (toDate) {
    dateConditions.push(`t.action_date <= ${quote(toDate)}`);
  }
  const dateFilter = dateConditions.length > 0 ? `AND ${dateConditions.join(' AND ')}` : '';

  const personConditions: Condition[] = [];
  if (search?.trim()) {
    personConditions.push(fuzzyMatch(PersonColumns.namn, search.trim(), 0.6, 'p'));
  }
  if (party) {
    personConditions.push(eq(PersonColumns.parti, party, 'p'));
  }
  if (constituency) {
    personConditions.push(eq(PersonColumns.valkrets, constituency, 'p'));
  }

  const motionsCTE = cte('date_filtered_motions', `
SELECT 
  t.intressent_id,
  t.authored_dok_id as mot_dok_id
FROM ${Tables.timeline} t
WHERE t.action_type = 'authored'
  AND t.authored_dok_typ IN ('mot', 'Motion')
  AND t.authored_dok_id IS NOT NULL
  ${dateFilter}
  `);

  const motionStatsCTE = cte('motion_stats', `
SELECT 
  dfm.intressent_id,
  COUNT(DISTINCT dfm.mot_dok_id) as total_motions,
  COUNT(DISTINCT dfm.mot_dok_id) FILTER (WHERE m.outcome_label = 'bifall') as passed_motions,
  COUNT(DISTINCT dfm.mot_dok_id) FILTER (WHERE m.outcome_label = 'avslag') as rejected_motions
FROM date_filtered_motions dfm
LEFT JOIN ${Tables.motionImpact} m ON m.mot_dok_id = dfm.mot_dok_id
GROUP BY dfm.intressent_id
  `);

  const rankedCTE = cte('ranked_stats', `
SELECT 
  ms.intressent_id,
  ms.total_motions,
  ms.passed_motions,
  ms.rejected_motions,
  (ms.passed_motions + ms.rejected_motions) as resolved_motions,
  CASE 
    WHEN (ms.passed_motions + ms.rejected_motions) > 0 
    THEN (ms.passed_motions + 0.05 * 20.0) / (ms.passed_motions + ms.rejected_motions + 20.0)
    ELSE 0
  END as ranking_score
FROM motion_stats ms
  `);

  const timelineConditions: Condition[] = [];
  if (fromDate) {
    timelineConditions.push(gte(TimelineColumns.action_date, fromDate));
  }
  if (toDate) {
    timelineConditions.push(lte(TimelineColumns.action_date, toDate));
  }
  const statsCTE = buildTimelineStatsCTE('filtered_stats', timelineConditions);

  const selectColumns = [
    'p.intressent_id',
    'p.tilltalsnamn',
    'p.efternamn',
    'p.namn',
    'p.sorteringsnamn',
    'p.parti',
    'p.valkrets',
    'p.status',
    'p.fodd_ar',
    'p.kon',
    'p.bild_url_80',
    'p.bild_url_192',
    'p.bild_url_max',
    'COALESCE(stats.total_actions, 0) as total_actions',
    'COALESCE(stats.total_votes, 0) as total_votes',
    'COALESCE(stats.total_speeches, 0) as total_speeches',
    'COALESCE(stats.total_authored, 0) as total_authored',
    'COALESCE(p.rebel_vote_count, 0) as rebel_vote_count',
    'stats.first_action_date',
    'stats.last_action_date',
  ].join(',\n  ');

  const orderByClause = search?.trim()
    ? politicianOrderBy('name', search, 'p')
    : `COALESCE(rs.ranking_score, 0) DESC,
       (COALESCE(stats.total_votes, 0) + COALESCE(stats.total_speeches, 0) + COALESCE(stats.total_authored, 0)) DESC`;

  const sql = buildQuery({
    ctes: [motionsCTE, motionStatsCTE, rankedCTE, statsCTE],
    select: selectColumns,
    from: `${Tables.person} p`,
    joins: [
      'LEFT JOIN ranked_stats rs ON p.intressent_id = rs.intressent_id',
      'LEFT JOIN filtered_stats stats ON p.intressent_id = stats.intressent_id',
    ],
    where: and(...personConditions),
    orderBy: orderByClause,
    limit,
    offset,
  });

  logSql('[listPoliticiansByEffectivenessWithDateFilter] Executing SQL:', sql);
  const result = await query<MartPerson>(sql);
  console.log('[listPoliticiansByEffectivenessWithDateFilter] Result count:', result.data.length);
  return result.data;
}

/**
 * Get unique constituencies for filter dropdown
 */
export async function getConstituencies(): Promise<string[]> {
  const sql = buildQuery({
    select: `DISTINCT ${PersonColumns.valkrets}`,
    from: Tables.person,
    where: isNotNull(PersonColumns.valkrets),
    orderBy: PersonColumns.valkrets,
  });

  const result = await query<{ valkrets: string }>(sql);
  return result.data.map((row) => row.valkrets);
}
