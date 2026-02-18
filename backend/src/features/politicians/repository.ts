/**
 * Repository for politician queries against MotherDuck mart tables
 * Uses the SQL builder for type-safe, composable queries
 */

import { query } from '../../utils/motherduck';
import {
  Tables,
  PersonColumns,
  TimelineColumns,
  buildQuery,
  buildTimelineStatsCTE,
  politicianOrderBy,
  cte,
  and,
  eq,
  gte,
  lte,
  lt,
  inList,
  isNotNull,
  neq,
  fuzzyMatch,
  col,
  quote,
  type Condition,
} from '../../utils/sql-builder';
import type { MartPerson, MartPersonTimeline, VoteBreakdown } from './types';

export interface ListPoliticiansOptions {
  search?: string;
  party?: string;
  limit?: number;
  offset?: number;
  sortBy?: 'name' | 'mostActive' | 'mostVotes' | 'mostSpeeches';
  fromDate?: string;
  toDate?: string;
}

export interface GetTimelineOptions {
  limit?: number;
  cursor?: string;
  actionTypes?: Array<'vote' | 'speech' | 'authored'>;
}

/**
 * List politicians with optional search and party filter
 * When date filters are provided, stats are aggregated from timeline table
 */
export async function listPoliticians(options: ListPoliticiansOptions = {}): Promise<MartPerson[]> {
  const { search, party, limit = 50, offset = 0, sortBy = 'name', fromDate, toDate } = options;
  console.log('[listPoliticians] Called with options:', JSON.stringify(options));

  // If date filters are provided, we need to aggregate stats from timeline
  if (fromDate || toDate) {
    return listPoliticiansWithDateFilter(options);
  }

  // Build conditions
  const conditions: Condition[] = [];
  
  if (search?.trim()) {
    conditions.push(fuzzyMatch(PersonColumns.namn, search.trim()));
  }
  
  if (party) {
    conditions.push(eq(PersonColumns.parti, party));
  }

  const sql = buildQuery({
    select: '*',
    from: Tables.person,
    where: and(...conditions),
    orderBy: politicianOrderBy(sortBy, search),
    limit,
    offset,
  });

  console.log('[listPoliticians] Executing SQL:', sql);
  const result = await query<MartPerson>(sql);
  console.log('[listPoliticians] Result count:', result.data.length);
  return result.data;
}

/**
 * List politicians with date-filtered stats aggregated from timeline
 */
async function listPoliticiansWithDateFilter(options: ListPoliticiansOptions): Promise<MartPerson[]> {
  const { search, party, limit = 50, offset = 0, sortBy = 'name', fromDate, toDate } = options;
  
  // Build timeline date conditions
  const timelineConditions: Condition[] = [];
  if (fromDate) {
    timelineConditions.push(gte(TimelineColumns.action_date, fromDate));
  }
  if (toDate) {
    timelineConditions.push(lte(TimelineColumns.action_date, toDate));
  }

  // Build person conditions
  const personConditions: Condition[] = [];
  if (search?.trim()) {
    personConditions.push(fuzzyMatch(PersonColumns.namn, search.trim(), 0.6, 'p'));
  }
  if (party) {
    personConditions.push(eq(PersonColumns.parti, party, 'p'));
  }

  // Build the stats CTE
  const statsCTE = buildTimelineStatsCTE('filtered_stats', timelineConditions);

  // Build select columns - explicitly list to control output
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
    'stats.first_action_date',
    'stats.last_action_date',
  ].join(',\n  ');

  // Determine ORDER BY - search always uses person table alias 'p' for namn column
  // Activity sorting uses 'stats' alias for aggregated columns
  let orderByClause: string;
  if (search?.trim()) {
    // Search term present: sort by name similarity (always uses person table)
    orderByClause = politicianOrderBy(sortBy, search, 'p');
  } else {
    // No search: use appropriate alias based on sort type
    orderByClause = politicianOrderBy(sortBy, undefined, sortBy === 'name' ? 'p' : 'stats');
  }

  const sql = buildQuery({
    ctes: [statsCTE],
    select: selectColumns,
    from: `${Tables.person} p`,
    joins: ['LEFT JOIN filtered_stats stats ON p.intressent_id = stats.intressent_id'],
    where: and(...personConditions),
    orderBy: orderByClause,
    limit,
    offset,
  });

  console.log('[listPoliticiansWithDateFilter] Executing SQL:', sql);
  const result = await query<MartPerson>(sql);
  console.log('[listPoliticiansWithDateFilter] Result count:', result.data.length);
  return result.data;
}

/**
 * Get a single politician by ID
 */
export async function getPolitician(intressentId: string): Promise<MartPerson | null> {
  console.log('[getPolitician] Called with intressentId:', intressentId);
  
  const sql = buildQuery({
    select: '*',
    from: Tables.person,
    where: eq(PersonColumns.intressent_id, intressentId),
    limit: 1,
  });

  console.log('[getPolitician] Executing SQL:', sql);
  const result = await query<MartPerson>(sql);
  console.log('[getPolitician] Result:', result.data[0] ? 'Found' : 'Not found');
  return result.data[0] ?? null;
}

/**
 * Get vote breakdown (Ja/Nej/Avstår/Frånvarande) for a politician
 */
export async function getVoteBreakdown(intressentId: string): Promise<VoteBreakdown> {
  console.log('[getVoteBreakdown] Called with intressentId:', intressentId);
  
  const sql = buildQuery({
    select: `
      COUNT(*) FILTER (WHERE ${TimelineColumns.vote_value} = 'Ja') as ja,
      COUNT(*) FILTER (WHERE ${TimelineColumns.vote_value} = 'Nej') as nej,
      COUNT(*) FILTER (WHERE ${TimelineColumns.vote_value} = 'Avstår') as avstar,
      COUNT(*) FILTER (WHERE ${TimelineColumns.vote_value} = 'Frånvarande') as franvarande
    `.trim(),
    from: Tables.timeline,
    where: and(
      eq(TimelineColumns.intressent_id, intressentId),
      eq(TimelineColumns.action_type, 'vote'),
    ),
  });

  console.log('[getVoteBreakdown] Executing SQL:', sql);
  const result = await query<VoteBreakdown>(sql);
  const row = result.data[0];
  
  return {
    ja: Number(row?.ja ?? 0),
    nej: Number(row?.nej ?? 0),
    avstar: Number(row?.avstar ?? 0),
    franvarande: Number(row?.franvarande ?? 0),
  };
}

export interface PartyLoyalty {
  totalVotes: number;
  votesWithParty: number;
  votesAgainstParty: number;
  loyaltyPercentage: number;
}

export interface TopicActivity {
  topic: string;
  committee: string;
  voteCount: number;
  speechCount: number;
  totalCount: number;
}

export interface RebelVote {
  voteringId: string;
  date: string;
  personVote: string;
  partyMajorityVote: string;
  betankandeId: string | null;
  betankandeTitel: string | null;
  subjectTitle: string | null;
  topic: string | null;
}

/**
 * Calculate party loyalty score for a politician.
 * Compares their votes against the party majority for each votering_id.
 */
export async function getPartyLoyalty(intressentId: string, party: string): Promise<PartyLoyalty> {
  console.log('[getPartyLoyalty] Called with intressentId:', intressentId, 'party:', party);
  
  // This query uses multiple CTEs to:
  // 1. Get the person's votes
  // 2. Calculate party majority for each vote
  // 3. Compare person's vote to party majority
  
  const personVotesCTE = cte('person_votes', `
SELECT 
  ${TimelineColumns.action_id} as votering_id,
  ${TimelineColumns.vote_value}
FROM ${Tables.timeline}
WHERE ${TimelineColumns.intressent_id} = ${quote(intressentId)}
  AND ${TimelineColumns.action_type} = 'vote'
  AND ${TimelineColumns.vote_value} IN ('Ja', 'Nej', 'Avstår')
  `);

  const partyMajorityCTE = cte('party_majority', `
SELECT 
  ${TimelineColumns.action_id} as votering_id,
  ${TimelineColumns.vote_value},
  COUNT(*) as vote_count
FROM ${Tables.timeline}
WHERE ${TimelineColumns.parti} = ${quote(party)}
  AND ${TimelineColumns.action_type} = 'vote'
  AND ${TimelineColumns.vote_value} IN ('Ja', 'Nej', 'Avstår')
GROUP BY ${TimelineColumns.action_id}, ${TimelineColumns.vote_value}
  `);

  const partyMajorityVoteCTE = cte('party_majority_vote', `
SELECT 
  votering_id,
  vote_value as majority_vote
FROM party_majority
WHERE (votering_id, vote_count) IN (
  SELECT votering_id, MAX(vote_count)
  FROM party_majority
  GROUP BY votering_id
)
  `);

  const comparisonCTE = cte('comparison', `
SELECT 
  pv.votering_id,
  pv.vote_value as person_vote,
  pm.majority_vote,
  CASE WHEN pv.vote_value = pm.majority_vote THEN 1 ELSE 0 END as with_party
FROM person_votes pv
INNER JOIN party_majority_vote pm ON pv.votering_id = pm.votering_id
  `);

  const sql = buildQuery({
    ctes: [personVotesCTE, partyMajorityCTE, partyMajorityVoteCTE, comparisonCTE],
    select: `
      COUNT(*) as total_votes,
      SUM(with_party) as votes_with_party,
      COUNT(*) - SUM(with_party) as votes_against_party
    `.trim(),
    from: 'comparison',
  });

  console.log('[getPartyLoyalty] Executing SQL:', sql);
  const result = await query<{ total_votes: number; votes_with_party: number; votes_against_party: number }>(sql);
  const row = result.data[0];
  
  const totalVotes = Number(row?.total_votes ?? 0);
  const votesWithParty = Number(row?.votes_with_party ?? 0);
  const votesAgainstParty = Number(row?.votes_against_party ?? 0);
  const loyaltyPercentage = totalVotes > 0 ? Math.round((votesWithParty / totalVotes) * 100) : 0;

  return {
    totalVotes,
    votesWithParty,
    votesAgainstParty,
    loyaltyPercentage,
  };
}

/**
 * Get top topics (committees) a politician is most active in
 */
export async function getTopTopics(intressentId: string, limit: number = 5): Promise<TopicActivity[]> {
  console.log('[getTopTopics] Called with intressentId:', intressentId);
  
  const sql = buildQuery({
    select: `
      ${TimelineColumns.betankande_organ} as committee,
      COUNT(*) FILTER (WHERE ${TimelineColumns.action_type} = 'vote') as vote_count,
      COUNT(*) FILTER (WHERE ${TimelineColumns.action_type} = 'speech') as speech_count,
      COUNT(*) as total_count
    `.trim(),
    from: Tables.timeline,
    where: and(
      eq(TimelineColumns.intressent_id, intressentId),
      isNotNull(TimelineColumns.betankande_organ),
      neq(TimelineColumns.betankande_organ, ''),
    ),
    groupBy: TimelineColumns.betankande_organ,
    orderBy: 'total_count DESC',
    limit,
  });

  console.log('[getTopTopics] Executing SQL:', sql);
  const result = await query<{ committee: string; vote_count: number; speech_count: number; total_count: number }>(sql);
  
  return result.data.map(row => ({
    committee: row.committee,
    topic: COMMITTEE_TO_TOPIC[row.committee] ?? row.committee,
    voteCount: Number(row.vote_count),
    speechCount: Number(row.speech_count),
    totalCount: Number(row.total_count),
  }));
}

const COMMITTEE_TO_TOPIC: Record<string, string> = {
  AU: 'Arbetsmarknad',
  CU: 'Civilrätt',
  FiU: 'Finans',
  FöU: 'Försvar',
  JuU: 'Justitie',
  KU: 'Konstitution',
  KrU: 'Kultur',
  MJU: 'Miljö & Jordbruk',
  NU: 'Näringsliv',
  SkU: 'Skatter',
  SfU: 'Socialförsäkring',
  SoU: 'Socialutskottet',
  TU: 'Trafik',
  UbU: 'Utbildning',
  UU: 'Utrikes',
  UFöU: 'Sammansatt utrikes/försvar',
};

/**
 * Get recent votes where the politician voted against their party majority
 */
export async function getRebelVotes(intressentId: string, party: string, limit: number = 10): Promise<RebelVote[]> {
  console.log('[getRebelVotes] Called with intressentId:', intressentId, 'party:', party);
  
  const personVotesCTE = cte('person_votes', `
SELECT 
  ${TimelineColumns.action_id} as votering_id,
  ${TimelineColumns.action_date},
  ${TimelineColumns.vote_value},
  ${TimelineColumns.betankande_dok_id},
  ${TimelineColumns.betankande_titel},
  ${TimelineColumns.subject_title},
  ${TimelineColumns.betankande_organ}
FROM ${Tables.timeline}
WHERE ${TimelineColumns.intressent_id} = ${quote(intressentId)}
  AND ${TimelineColumns.action_type} = 'vote'
  AND ${TimelineColumns.vote_value} IN ('Ja', 'Nej', 'Avstår')
  `);

  const partyMajorityCTE = cte('party_majority', `
SELECT 
  ${TimelineColumns.action_id} as votering_id,
  ${TimelineColumns.vote_value},
  COUNT(*) as vote_count
FROM ${Tables.timeline}
WHERE ${TimelineColumns.parti} = ${quote(party)}
  AND ${TimelineColumns.action_type} = 'vote'
  AND ${TimelineColumns.vote_value} IN ('Ja', 'Nej', 'Avstår')
GROUP BY ${TimelineColumns.action_id}, ${TimelineColumns.vote_value}
  `);

  const partyMajorityVoteCTE = cte('party_majority_vote', `
SELECT 
  votering_id,
  vote_value as majority_vote
FROM party_majority
WHERE (votering_id, vote_count) IN (
  SELECT votering_id, MAX(vote_count)
  FROM party_majority
  GROUP BY votering_id
)
  `);

  const sql = buildQuery({
    ctes: [personVotesCTE, partyMajorityCTE, partyMajorityVoteCTE],
    select: `
      pv.votering_id,
      pv.action_date as date,
      pv.vote_value as person_vote,
      pm.majority_vote as party_majority_vote,
      pv.betankande_dok_id,
      pv.betankande_titel,
      pv.subject_title,
      pv.betankande_organ
    `.trim(),
    from: 'person_votes pv',
    joins: ['INNER JOIN party_majority_vote pm ON pv.votering_id = pm.votering_id'],
    where: { sql: 'pv.vote_value != pm.majority_vote' },
    orderBy: 'pv.action_date DESC',
    limit,
  });

  console.log('[getRebelVotes] Executing SQL:', sql);
  const result = await query<{
    votering_id: string;
    date: string;
    person_vote: string;
    party_majority_vote: string;
    betankande_dok_id: string | null;
    betankande_titel: string | null;
    subject_title: string | null;
    betankande_organ: string | null;
  }>(sql);
  
  return result.data.map(row => ({
    voteringId: row.votering_id,
    date: row.date,
    personVote: row.person_vote,
    partyMajorityVote: row.party_majority_vote,
    betankandeId: row.betankande_dok_id,
    betankandeTitel: row.betankande_titel,
    subjectTitle: row.subject_title,
    topic: row.betankande_organ ? (COMMITTEE_TO_TOPIC[row.betankande_organ] ?? row.betankande_organ) : null,
  }));
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

  const conditions: Condition[] = [eq(TimelineColumns.intressent_id, intressentId)];

  // Cursor-based pagination (action_date)
  if (cursor) {
    conditions.push(lt(TimelineColumns.action_date, cursor));
  }

  // Filter by action types (supports multiple)
  if (actionTypes && actionTypes.length > 0) {
    conditions.push(inList(TimelineColumns.action_type, actionTypes));
  }

  // Fetch one extra to check if there are more
  const sql = buildQuery({
    select: '*',
    from: Tables.timeline,
    where: and(...conditions),
    orderBy: `${TimelineColumns.action_date} DESC`,
    limit: limit + 1,
  });

  console.log('[getTimeline] Executing SQL:', sql);
  const result = await query<MartPersonTimeline>(sql);

  const hasMore = result.data.length > limit;
  const items = hasMore ? result.data.slice(0, limit) : result.data;

  console.log('[getTimeline] Result count:', items.length, 'hasMore:', hasMore);
  return { items, hasMore };
}
