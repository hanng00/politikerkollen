/**
 * Repository for politician queries against MotherDuck mart tables
 * Uses the SQL builder for type-safe, composable queries
 */

import { query } from '../../utils/motherduck';
import {
  MotionImpactColumns,
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
  inList,
  isNotNull,
  lt,
  lte,
  neq,
  or,
  politicianOrderBy,
  quote,
  type Condition,
} from '../../utils/sql-builder';
import type { AccountabilityStats, MartMotionImpactScore, MartPerson, MartPersonTimeline, MotionEffectiveness, RecentQuestion, VoteBreakdown } from './types';

export interface ListPoliticiansOptions {
  search?: string;
  party?: string;
  constituency?: string;
  limit?: number;
  offset?: number;
  sortBy?: 'name' | 'mostActive' | 'mostVotes' | 'mostSpeeches' | 'mostRebel' | 'mostEffective';
  fromDate?: string;
  toDate?: string;
  /** Include politicians without party affiliation ("-") in rebel vote rankings. Default: false */
  includeIndependents?: boolean;
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
  const { search, party, constituency, limit = 50, offset = 0, sortBy = 'mostEffective', fromDate, toDate } = options;
  console.log('[listPoliticians] Called with options:', JSON.stringify(options));

  // If date filters are provided, we need to aggregate stats from timeline
  if (fromDate || toDate) {
    return listPoliticiansWithDateFilter(options);
  }

  // For mostEffective sort, we need to join with motion impact data
  if (sortBy === 'mostEffective') {
    return listPoliticiansByEffectiveness(options);
  }

  // Build conditions
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

  console.log('[listPoliticians] Executing SQL:', sql);
  const result = await query<MartPerson>(sql);
  console.log('[listPoliticians] Result count:', result.data.length);
  return result.data;
}

/**
 * List politicians sorted by motion effectiveness using Bayesian ranking
 * Uses Beta-Binomial shrinkage to fairly rank politicians regardless of sample size
 */
async function listPoliticiansByEffectiveness(options: ListPoliticiansOptions): Promise<MartPerson[]> {
  const { search, party, constituency, limit = 50, offset = 0 } = options;

  // Build conditions
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

  // Join with Bayesian motion rank table for fair ranking
  const sql = buildQuery({
    select: 'p.*',
    from: `${Tables.person} p`,
    joins: [`LEFT JOIN ${Tables.motionRank} mr ON p.intressent_id = mr.intressent_id`],
    where: and(...conditions),
    // Sort by Bayesian ranking score (shrunk toward global mean)
    // Politicians without motions sorted by total activity as fallback
    orderBy: search?.trim()
      ? politicianOrderBy('name', search, 'p')
      : `COALESCE(mr.ranking_score, 0) DESC,
         (COALESCE(p.total_votes, 0) + COALESCE(p.total_speeches, 0) + COALESCE(p.total_authored, 0)) DESC`,
    limit,
    offset,
  });

  console.log('[listPoliticiansByEffectiveness] Executing SQL:', sql);
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
  if (constituency) {
    personConditions.push(eq(PersonColumns.valkrets, constituency, 'p'));
  }

  // Build the stats CTE
  const statsCTE = buildTimelineStatsCTE('filtered_stats', timelineConditions);

  // Build select columns - rebel_vote_count comes from person table (all-time)
  // Date-filtered rebel stats are handled separately by getBatchTopRebelTopics if needed
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

  // Determine ORDER BY
  // mostEffective and mostRebel fall back to mostActive when date filters are applied
  // since those calculations don't support date filtering
  const effectiveSortBy = (sortBy === 'mostEffective' || sortBy === 'mostRebel') ? 'mostActive' : sortBy;
  
  let orderByClause: string;
  if (search?.trim()) {
    orderByClause = politicianOrderBy(effectiveSortBy, search, 'p');
  } else {
    // Name sorting uses person table, others use stats CTE
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

export interface PercentileRankings {
  votesPercentile: number;
  speechesPercentile: number;
  authoredPercentile: number;
  activityPercentile: number;
  totalActivePoliticians: number;
}

/**
 * Calculate percentile rankings for a politician compared to all active politicians
 */
export async function getPercentileRankings(intressentId: string): Promise<PercentileRankings> {
  console.log('[getPercentileRankings] Called with intressentId:', intressentId);

  const rankingsCTE = cte(
    'rankings',
    `
SELECT 
  ${PersonColumns.intressent_id},
  PERCENT_RANK() OVER (ORDER BY ${PersonColumns.total_votes}) as votes_pct,
  PERCENT_RANK() OVER (ORDER BY ${PersonColumns.total_speeches}) as speeches_pct,
  PERCENT_RANK() OVER (ORDER BY ${PersonColumns.total_authored}) as authored_pct,
  PERCENT_RANK() OVER (ORDER BY ${PersonColumns.total_actions}) as activity_pct
FROM ${Tables.person}
WHERE ${PersonColumns.status} = 'Tjänstgörande riksdagsledamot'
  `,
  );

  const sql = buildQuery({
    ctes: [rankingsCTE],
    select: `
      votes_pct,
      speeches_pct,
      authored_pct,
      activity_pct,
      (SELECT COUNT(*) FROM ${Tables.person} WHERE ${PersonColumns.status} = 'Tjänstgörande riksdagsledamot') as total_active
    `.trim(),
    from: 'rankings',
    where: { sql: `intressent_id = ${quote(intressentId)}` },
    limit: 1,
  });

  console.log('[getPercentileRankings] Executing SQL:', sql);
  const result = await query<{
    votes_pct: number;
    speeches_pct: number;
    authored_pct: number;
    activity_pct: number;
    total_active: number;
  }>(sql);

  const row = result.data[0];

  return {
    votesPercentile: Math.round((row?.votes_pct ?? 0) * 100),
    speechesPercentile: Math.round((row?.speeches_pct ?? 0) * 100),
    authoredPercentile: Math.round((row?.authored_pct ?? 0) * 100),
    activityPercentile: Math.round((row?.activity_pct ?? 0) * 100),
    totalActivePoliticians: Number(row?.total_active ?? 0),
  };
}

/**
 * Calculate motion effectiveness for a politician
 * How many of their motions actually passed vs were rejected
 * Includes Bayesian-adjusted statistics for fair ranking
 */
export async function getMotionEffectiveness(intressentId: string): Promise<MotionEffectiveness> {
  console.log('[getMotionEffectiveness] Called with intressentId:', intressentId);

  // Get all motions where this person is a signatory
  const sql = `
WITH person_motions AS (
  SELECT DISTINCT t.authored_dok_id as mot_dok_id
  FROM ${Tables.timeline} t
  WHERE t.intressent_id = ${quote(intressentId)}
    AND t.action_type = 'authored'
    AND t.authored_dok_typ IN ('mot', 'Motion')
    AND t.authored_dok_id IS NOT NULL
),
motion_outcomes AS (
  SELECT 
    pm.mot_dok_id,
    m.mot_titel,
    m.impact_score,
    m.outcome_label,
    m.is_provisional,
    m.bifall_typ,
    m.is_tillkannagivande,
    m.is_delvis_bifall
  FROM person_motions pm
  LEFT JOIN ${Tables.motionImpact} m ON m.mot_dok_id = pm.mot_dok_id
)
SELECT 
  COUNT(*) as total_motions,
  COUNT(*) FILTER (WHERE outcome_label = 'bifall') as motions_passed,
  COUNT(*) FILTER (WHERE outcome_label = 'avslag') as motions_rejected,
  COUNT(*) FILTER (WHERE outcome_label IS NULL OR is_provisional = true) as motions_pending,
  AVG(impact_score) FILTER (WHERE impact_score IS NOT NULL) as avg_impact_score,
  -- Bifall breakdown
  COUNT(*) FILTER (WHERE bifall_typ = 'reservation_bifall') as via_reservation,
  COUNT(*) FILTER (WHERE bifall_typ = 'utskott_bifall') as via_utskott,
  COUNT(*) FILTER (WHERE bifall_typ = 'direkt_bifall') as direkt_bifall,
  COUNT(*) FILTER (WHERE is_tillkannagivande = true AND outcome_label = 'bifall') as tillkannagivanden,
  COUNT(*) FILTER (WHERE is_delvis_bifall = true) as delvis_bifall,
  -- Top motion
  (SELECT mot_dok_id FROM motion_outcomes WHERE impact_score IS NOT NULL ORDER BY impact_score DESC LIMIT 1) as top_mot_dok_id,
  (SELECT mot_titel FROM motion_outcomes WHERE impact_score IS NOT NULL ORDER BY impact_score DESC LIMIT 1) as top_mot_title,
  (SELECT impact_score FROM motion_outcomes WHERE impact_score IS NOT NULL ORDER BY impact_score DESC LIMIT 1) as top_impact_score,
  (SELECT outcome_label FROM motion_outcomes WHERE impact_score IS NOT NULL ORDER BY impact_score DESC LIMIT 1) as top_outcome
FROM motion_outcomes
  `;

  console.log('[getMotionEffectiveness] Executing SQL:', sql);
  const result = await query<{
    total_motions: number;
    motions_passed: number;
    motions_rejected: number;
    motions_pending: number;
    avg_impact_score: number | null;
    via_reservation: number;
    via_utskott: number;
    direkt_bifall: number;
    tillkannagivanden: number;
    delvis_bifall: number;
    top_mot_dok_id: string | null;
    top_mot_title: string | null;
    top_impact_score: number | null;
    top_outcome: string | null;
  }>(sql);

  const row = result.data[0];
  const totalMotions = Number(row?.total_motions ?? 0);
  const motionsPassed = Number(row?.motions_passed ?? 0);
  const motionsRejected = Number(row?.motions_rejected ?? 0);
  const resolvedMotions = motionsPassed + motionsRejected;

  // Fetch Bayesian stats from the ranking table
  let bayesianStats: MotionEffectiveness['bayesianStats'];
  if (resolvedMotions > 0) {
    const bayesianSql = `
SELECT 
  bayesian_pass_rate_pct,
  raw_pass_rate_pct,
  global_pass_rate_pct,
  shrinkage_pct,
  credible_lower_bound_pct,
  confidence_tier,
  resolved_motions
FROM ${Tables.motionRank}
WHERE intressent_id = ${quote(intressentId)}
    `;
    
    const bayesianResult = await query<{
      bayesian_pass_rate_pct: number;
      raw_pass_rate_pct: number;
      global_pass_rate_pct: number;
      shrinkage_pct: number;
      credible_lower_bound_pct: number;
      confidence_tier: 'high' | 'medium' | 'low' | 'very_low';
      resolved_motions: number;
    }>(bayesianSql);
    
    const bayesianRow = bayesianResult.data[0];
    if (bayesianRow) {
      bayesianStats = {
        adjustedPassRate: Number(bayesianRow.bayesian_pass_rate_pct),
        rawPassRate: Number(bayesianRow.raw_pass_rate_pct),
        globalPassRate: Number(bayesianRow.global_pass_rate_pct),
        shrinkagePct: Number(bayesianRow.shrinkage_pct),
        credibleLowerBound: Number(bayesianRow.credible_lower_bound_pct),
        confidenceTier: bayesianRow.confidence_tier,
        resolvedMotions: Number(bayesianRow.resolved_motions),
      };
    }
  }

  return {
    totalMotions,
    motionsPassed,
    motionsRejected,
    motionsPending: Number(row?.motions_pending ?? 0),
    passRate: resolvedMotions > 0 ? Math.round((motionsPassed / resolvedMotions) * 100) : 0,
    avgImpactScore: row?.avg_impact_score ? Math.round(row.avg_impact_score * 100) / 100 : 0,
    topMotion: row?.top_mot_dok_id
      ? {
          dokId: row.top_mot_dok_id,
          title: row.top_mot_title ?? 'Motion',
          impactScore: row.top_impact_score ?? 0,
          outcome: row.top_outcome,
        }
      : null,
    bifallBreakdown: {
      viaReservation: Number(row?.via_reservation ?? 0),
      viaUtskott: Number(row?.via_utskott ?? 0),
      direktBifall: Number(row?.direkt_bifall ?? 0),
      tillkannagivanden: Number(row?.tillkannagivanden ?? 0),
      delvisBifall: Number(row?.delvis_bifall ?? 0),
    },
    bayesianStats,
  };
}

export interface RebelVotesByTopic {
  topic: string;
  committee: string;
  count: number;
  recentVotes: RebelVote[];
}

/**
 * Get rebel votes grouped by topic to show patterns
 */
export async function getRebelVotesByTopic(intressentId: string, party: string): Promise<RebelVotesByTopic[]> {
  console.log('[getRebelVotesByTopic] Called with intressentId:', intressentId, 'party:', party);

  const personVotesCTE = cte(
    'person_votes',
    `
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
  `,
  );

  const partyMajorityCTE = cte(
    'party_majority',
    `
SELECT 
  ${TimelineColumns.action_id} as votering_id,
  ${TimelineColumns.vote_value},
  COUNT(*) as vote_count
FROM ${Tables.timeline}
WHERE ${TimelineColumns.parti} = ${quote(party)}
  AND ${TimelineColumns.action_type} = 'vote'
  AND ${TimelineColumns.vote_value} IN ('Ja', 'Nej', 'Avstår')
GROUP BY ${TimelineColumns.action_id}, ${TimelineColumns.vote_value}
  `,
  );

  const partyMajorityVoteCTE = cte(
    'party_majority_vote',
    `
SELECT 
  votering_id,
  vote_value as majority_vote
FROM party_majority
WHERE (votering_id, vote_count) IN (
  SELECT votering_id, MAX(vote_count)
  FROM party_majority
  GROUP BY votering_id
)
  `,
  );

  const rebelVotesCTE = cte(
    'rebel_votes',
    `
SELECT 
  pv.votering_id,
  pv.action_date as date,
  pv.vote_value as person_vote,
  pm.majority_vote as party_majority_vote,
  pv.betankande_dok_id,
  pv.betankande_titel,
  pv.subject_title,
  pv.betankande_organ
FROM person_votes pv
INNER JOIN party_majority_vote pm ON pv.votering_id = pm.votering_id
WHERE pv.vote_value != pm.majority_vote
  `,
  );

  const sql = buildQuery({
    ctes: [personVotesCTE, partyMajorityCTE, partyMajorityVoteCTE, rebelVotesCTE],
    select: `
      betankande_organ as committee,
      COUNT(*) as count,
      json_group_array(json_object(
        'voteringId', votering_id,
        'date', date,
        'personVote', person_vote,
        'partyMajorityVote', party_majority_vote,
        'betankandeId', betankande_dok_id,
        'betankandeTitel', betankande_titel,
        'subjectTitle', subject_title
      ) ORDER BY date DESC) as votes_json
    `.trim(),
    from: 'rebel_votes',
    where: isNotNull('betankande_organ'),
    groupBy: 'betankande_organ',
    orderBy: 'count DESC',
    limit: 10,
  });

  console.log('[getRebelVotesByTopic] Executing SQL:', sql);

  try {
    const result = await query<{
      committee: string;
      count: number;
      votes_json: string;
    }>(sql);

    return result.data.map((row) => {
      let recentVotes: RebelVote[] = [];
      try {
        const parsed = JSON.parse(row.votes_json);
        recentVotes = (Array.isArray(parsed) ? parsed : []).slice(0, 3).map((v: Record<string, unknown>) => ({
          voteringId: String(v.voteringId ?? ''),
          date: String(v.date ?? ''),
          personVote: String(v.personVote ?? ''),
          partyMajorityVote: String(v.partyMajorityVote ?? ''),
          betankandeId: v.betankandeId ? String(v.betankandeId) : null,
          betankandeTitel: v.betankandeTitel ? String(v.betankandeTitel) : null,
          subjectTitle: v.subjectTitle ? String(v.subjectTitle) : null,
          topic: COMMITTEE_TO_TOPIC[row.committee] ?? row.committee,
        }));
      } catch {
        // JSON parsing failed, return empty array
      }

      return {
        topic: COMMITTEE_TO_TOPIC[row.committee] ?? row.committee,
        committee: row.committee,
        count: Number(row.count),
        recentVotes,
      };
    });
  } catch (error) {
    // Fallback: DuckDB might not support json_group_array, use simpler query
    console.log('[getRebelVotesByTopic] JSON aggregation failed, using fallback');

    const fallbackSql = buildQuery({
      ctes: [personVotesCTE, partyMajorityCTE, partyMajorityVoteCTE, rebelVotesCTE],
      select: `
        betankande_organ as committee,
        COUNT(*) as count
      `.trim(),
      from: 'rebel_votes',
      where: isNotNull('betankande_organ'),
      groupBy: 'betankande_organ',
      orderBy: 'count DESC',
      limit: 10,
    });

    const fallbackResult = await query<{
      committee: string;
      count: number;
    }>(fallbackSql);

    return fallbackResult.data.map((row) => ({
      topic: COMMITTEE_TO_TOPIC[row.committee] ?? row.committee,
      committee: row.committee,
      count: Number(row.count),
      recentVotes: [],
    }));
  }
}

export interface KeyVote {
  voteringId: string;
  date: string;
  voteValue: string;
  betankandeId: string;
  betankandeTitel: string;
  topic: string | null;
  isRebel: boolean;
  partyMajorityVote: string | null;
}

/**
 * Get key votes - high-profile votes and votes where they deviated from party
 */
export async function getKeyVotes(intressentId: string, party: string, limit: number = 10): Promise<KeyVote[]> {
  console.log('[getKeyVotes] Called with intressentId:', intressentId);

  // Get votes on important committees (FiU, KU, FöU, JuU) and rebel votes
  const personVotesCTE = cte(
    'person_votes',
    `
SELECT 
  ${TimelineColumns.action_id} as votering_id,
  ${TimelineColumns.action_date} as date,
  ${TimelineColumns.vote_value},
  ${TimelineColumns.betankande_dok_id},
  ${TimelineColumns.betankande_titel},
  ${TimelineColumns.betankande_organ}
FROM ${Tables.timeline}
WHERE ${TimelineColumns.intressent_id} = ${quote(intressentId)}
  AND ${TimelineColumns.action_type} = 'vote'
  AND ${TimelineColumns.vote_value} IN ('Ja', 'Nej', 'Avstår')
  AND ${TimelineColumns.betankande_dok_id} IS NOT NULL
  `,
  );

  const partyMajorityCTE = cte(
    'party_majority',
    `
SELECT 
  ${TimelineColumns.action_id} as votering_id,
  ${TimelineColumns.vote_value},
  COUNT(*) as vote_count
FROM ${Tables.timeline}
WHERE ${TimelineColumns.parti} = ${quote(party)}
  AND ${TimelineColumns.action_type} = 'vote'
  AND ${TimelineColumns.vote_value} IN ('Ja', 'Nej', 'Avstår')
GROUP BY ${TimelineColumns.action_id}, ${TimelineColumns.vote_value}
  `,
  );

  const partyMajorityVoteCTE = cte(
    'party_majority_vote',
    `
SELECT 
  votering_id,
  vote_value as majority_vote
FROM party_majority
WHERE (votering_id, vote_count) IN (
  SELECT votering_id, MAX(vote_count)
  FROM party_majority
  GROUP BY votering_id
)
  `,
  );

  const sql = buildQuery({
    ctes: [personVotesCTE, partyMajorityCTE, partyMajorityVoteCTE],
    select: `
      pv.votering_id,
      pv.date,
      pv.vote_value,
      pv.betankande_dok_id,
      pv.betankande_titel,
      pv.betankande_organ,
      pm.majority_vote,
      CASE WHEN pv.vote_value != pm.majority_vote THEN true ELSE false END as is_rebel,
      CASE 
        WHEN pv.vote_value != pm.majority_vote THEN 100
        WHEN pv.betankande_organ IN ('FiU', 'KU', 'FöU', 'JuU') THEN 80
        WHEN pv.betankande_organ IN ('SoU', 'UU', 'SkU') THEN 60
        ELSE 40
      END as importance
    `.trim(),
    from: 'person_votes pv',
    joins: ['LEFT JOIN party_majority_vote pm ON pv.votering_id = pm.votering_id'],
    orderBy: 'importance DESC, pv.date DESC',
    limit,
  });

  console.log('[getKeyVotes] Executing SQL:', sql);
  const result = await query<{
    votering_id: string;
    date: string;
    vote_value: string;
    betankande_dok_id: string;
    betankande_titel: string;
    betankande_organ: string | null;
    majority_vote: string | null;
    is_rebel: boolean;
    importance: number;
  }>(sql);

  return result.data.map((row) => ({
    voteringId: row.votering_id,
    date: row.date,
    voteValue: row.vote_value,
    betankandeId: row.betankande_dok_id,
    betankandeTitel: row.betankande_titel,
    topic: row.betankande_organ ? (COMMITTEE_TO_TOPIC[row.betankande_organ] ?? row.betankande_organ) : null,
    isRebel: row.is_rebel,
    partyMajorityVote: row.majority_vote,
  }));
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
    where: and(eq(TimelineColumns.intressent_id, intressentId), eq(TimelineColumns.action_type, 'vote')),
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

  const personVotesCTE = cte(
    'person_votes',
    `
SELECT 
  ${TimelineColumns.action_id} as votering_id,
  ${TimelineColumns.vote_value}
FROM ${Tables.timeline}
WHERE ${TimelineColumns.intressent_id} = ${quote(intressentId)}
  AND ${TimelineColumns.action_type} = 'vote'
  AND ${TimelineColumns.vote_value} IN ('Ja', 'Nej', 'Avstår')
  `,
  );

  const partyMajorityCTE = cte(
    'party_majority',
    `
SELECT 
  ${TimelineColumns.action_id} as votering_id,
  ${TimelineColumns.vote_value},
  COUNT(*) as vote_count
FROM ${Tables.timeline}
WHERE ${TimelineColumns.parti} = ${quote(party)}
  AND ${TimelineColumns.action_type} = 'vote'
  AND ${TimelineColumns.vote_value} IN ('Ja', 'Nej', 'Avstår')
GROUP BY ${TimelineColumns.action_id}, ${TimelineColumns.vote_value}
  `,
  );

  const partyMajorityVoteCTE = cte(
    'party_majority_vote',
    `
SELECT 
  votering_id,
  vote_value as majority_vote
FROM party_majority
WHERE (votering_id, vote_count) IN (
  SELECT votering_id, MAX(vote_count)
  FROM party_majority
  GROUP BY votering_id
)
  `,
  );

  const comparisonCTE = cte(
    'comparison',
    `
SELECT 
  pv.votering_id,
  pv.vote_value as person_vote,
  pm.majority_vote,
  CASE WHEN pv.vote_value = pm.majority_vote THEN 1 ELSE 0 END as with_party
FROM person_votes pv
INNER JOIN party_majority_vote pm ON pv.votering_id = pm.votering_id
  `,
  );

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

  return result.data.map((row) => ({
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
 * Get accountability stats - interpellations and written questions
 * These represent the politician's work in questioning/scrutinizing the government
 */
export async function getAccountabilityStats(intressentId: string): Promise<AccountabilityStats> {
  console.log('[getAccountabilityStats] Called with intressentId:', intressentId);

  // Count interpellations and written questions
  const countSql = buildQuery({
    select: `
      COUNT(*) FILTER (WHERE lower(${TimelineColumns.authored_dok_typ}) IN ('ip', 'interpellation')) as interpellations,
      COUNT(*) FILTER (WHERE lower(${TimelineColumns.authored_dok_typ}) IN ('fr', 'skriftlig fråga')) as written_questions
    `.trim(),
    from: Tables.timeline,
    where: and(
      eq(TimelineColumns.intressent_id, intressentId),
      eq(TimelineColumns.action_type, 'authored'),
      or(
        inList(`lower(${TimelineColumns.authored_dok_typ})`, ['ip', 'interpellation', 'fr', 'skriftlig fråga']),
      ),
    ),
  });

  console.log('[getAccountabilityStats] Executing count SQL:', countSql);
  const countResult = await query<{ interpellations: number; written_questions: number }>(countSql);
  const counts = countResult.data[0] ?? { interpellations: 0, written_questions: 0 };

  // Get recent questions (up to 5)
  const recentSql = buildQuery({
    select: `
      ${TimelineColumns.authored_dok_typ} as dok_typ,
      ${TimelineColumns.authored_dok_titel} as title,
      ${TimelineColumns.action_date} as date,
      ${TimelineColumns.authored_dok_id} as dok_id
    `.trim(),
    from: Tables.timeline,
    where: and(
      eq(TimelineColumns.intressent_id, intressentId),
      eq(TimelineColumns.action_type, 'authored'),
      or(
        inList(`lower(${TimelineColumns.authored_dok_typ})`, ['ip', 'interpellation', 'fr', 'skriftlig fråga']),
      ),
    ),
    orderBy: `${TimelineColumns.action_date} DESC`,
    limit: 5,
  });

  console.log('[getAccountabilityStats] Executing recent SQL:', recentSql);
  const recentResult = await query<{ dok_typ: string; title: string; date: string; dok_id: string }>(recentSql);

  const recentQuestions: RecentQuestion[] = recentResult.data.map((row) => ({
    type: ['ip', 'interpellation'].includes(row.dok_typ?.toLowerCase()) ? 'interpellation' : 'skriftlig_fraga',
    title: row.title ?? 'Utan titel',
    date: row.date,
    dokId: row.dok_id,
  }));

  const interpellations = Number(counts.interpellations);
  const writtenQuestions = Number(counts.written_questions);

  return {
    interpellations,
    writtenQuestions,
    totalQuestions: interpellations + writtenQuestions,
    recentQuestions,
  };
}

/**
 * Get recent votes where the politician voted against their party majority
 */
export async function getRebelVotes(intressentId: string, party: string, limit: number = 10): Promise<RebelVote[]> {
  console.log('[getRebelVotes] Called with intressentId:', intressentId, 'party:', party);

  const personVotesCTE = cte(
    'person_votes',
    `
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
  `,
  );

  const partyMajorityCTE = cte(
    'party_majority',
    `
SELECT 
  ${TimelineColumns.action_id} as votering_id,
  ${TimelineColumns.vote_value},
  COUNT(*) as vote_count
FROM ${Tables.timeline}
WHERE ${TimelineColumns.parti} = ${quote(party)}
  AND ${TimelineColumns.action_type} = 'vote'
  AND ${TimelineColumns.vote_value} IN ('Ja', 'Nej', 'Avstår')
GROUP BY ${TimelineColumns.action_id}, ${TimelineColumns.vote_value}
  `,
  );

  const partyMajorityVoteCTE = cte(
    'party_majority_vote',
    `
SELECT 
  votering_id,
  vote_value as majority_vote
FROM party_majority
WHERE (votering_id, vote_count) IN (
  SELECT votering_id, MAX(vote_count)
  FROM party_majority
  GROUP BY votering_id
)
  `,
  );

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

  return result.data.map((row) => ({
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
 * Cursor format: date_actionId (compound to handle multiple items on same date)
 */
export async function getTimeline(
  intressentId: string,
  options: GetTimelineOptions = {},
): Promise<{ items: MartPersonTimeline[]; hasMore: boolean }> {
  const { limit = 20, cursor, actionTypes } = options;
  console.log('[getTimeline] Called with intressentId:', intressentId, 'options:', JSON.stringify(options));

  const conditions: Condition[] = [eq(TimelineColumns.intressent_id, intressentId)];

  // Cursor-based pagination using compound cursor (date_actionId)
  if (cursor) {
    const underscoreIndex = cursor.indexOf('_');
    if (underscoreIndex > 0) {
      const cursorDate = cursor.substring(0, underscoreIndex);
      const cursorActionId = cursor.substring(underscoreIndex + 1);
      // Get items that are either:
      // 1. On an earlier date, OR
      // 2. On the same date but with a "smaller" action_id (for consistent ordering)
      conditions.push(
        or(
          lt(TimelineColumns.action_date, cursorDate),
          and(eq(TimelineColumns.action_date, cursorDate), lt(TimelineColumns.action_id, cursorActionId)),
        ),
      );
    } else {
      // Fallback for old cursor format (just date)
      conditions.push(lt(TimelineColumns.action_date, cursor));
    }
  }

  // Filter by action types (supports multiple)
  if (actionTypes && actionTypes.length > 0) {
    conditions.push(inList(TimelineColumns.action_type, actionTypes));
  }

  // Fetch one extra to check if there are more
  // Order by date DESC, then action_id DESC for consistent pagination
  const sql = buildQuery({
    select: '*',
    from: Tables.timeline,
    where: and(...conditions),
    orderBy: `${TimelineColumns.action_date} DESC, ${TimelineColumns.action_id} DESC`,
    limit: limit + 1,
  });

  console.log('[getTimeline] Executing SQL:', sql);
  const result = await query<MartPersonTimeline>(sql);

  const hasMore = result.data.length > limit;
  const items = hasMore ? result.data.slice(0, limit) : result.data;

  console.log('[getTimeline] Result count:', items.length, 'hasMore:', hasMore);
  return { items, hasMore };
}

/**
 * Batch-fetch impact scores for a list of motion dok_ids.
 * Returns a map of dok_id → MartMotionImpactScore for O(1) lookup.
 */
export async function getMotionImpactScores(dokIds: string[]): Promise<Map<string, MartMotionImpactScore>> {
  if (dokIds.length === 0) return new Map();

  console.log('[getMotionImpactScores] Fetching scores for', dokIds.length, 'motioner');

  const sql = buildQuery({
    select: `
      ${MotionImpactColumns.mot_dok_id},
      ${MotionImpactColumns.impact_score},
      ${MotionImpactColumns.is_provisional},
      ${MotionImpactColumns.outcome_score},
      ${MotionImpactColumns.outcome_label},
      ${MotionImpactColumns.vote_margin_score},
      ${MotionImpactColumns.cross_party_score},
      ${MotionImpactColumns.signatory_score},
      ${MotionImpactColumns.topic_score},
      ${MotionImpactColumns.ja_count},
      ${MotionImpactColumns.nej_count},
      ${MotionImpactColumns.abstain_count},
      ${MotionImpactColumns.signatory_count},
      ${MotionImpactColumns.distinct_parties},
      ${MotionImpactColumns.organ},
      ${MotionImpactColumns.score_breakdown}
    `.trim(),
    from: Tables.motionImpact,
    where: inList(MotionImpactColumns.mot_dok_id, dokIds),
  });

  console.log('[getMotionImpactScores] Executing SQL:', sql);
  const result = await query<MartMotionImpactScore>(sql);

  return new Map(result.data.map((row) => [row.mot_dok_id, row]));
}

// =============================================================================
// Batch functions for list view (efficient multi-politician queries)
// =============================================================================

export interface MotionStatsForList {
  intressentId: string;
  total: number;
  passed: number;
  passRate: number;
}

/**
 * Get motion effectiveness stats for multiple politicians in a single query
 */
export async function getBatchMotionStats(intressentIds: string[]): Promise<Map<string, MotionStatsForList>> {
  if (intressentIds.length === 0) return new Map();

  console.log('[getBatchMotionStats] Called for', intressentIds.length, 'politicians');

  const idList = intressentIds.map(quote).join(', ');

  const sql = `
WITH person_motions AS (
  SELECT 
    t.intressent_id,
    t.authored_dok_id as mot_dok_id
  FROM ${Tables.timeline} t
  WHERE t.intressent_id IN (${idList})
    AND t.action_type = 'authored'
    AND t.authored_dok_typ IN ('mot', 'Motion')
    AND t.authored_dok_id IS NOT NULL
),
motion_outcomes AS (
  SELECT 
    pm.intressent_id,
    pm.mot_dok_id,
    m.outcome_label
  FROM person_motions pm
  LEFT JOIN ${Tables.motionImpact} m ON m.mot_dok_id = pm.mot_dok_id
)
SELECT 
  intressent_id,
  COUNT(DISTINCT mot_dok_id) as total,
  COUNT(DISTINCT mot_dok_id) FILTER (WHERE outcome_label = 'bifall') as passed
FROM motion_outcomes
GROUP BY intressent_id
  `;

  const result = await query<{
    intressent_id: string;
    total: number;
    passed: number;
  }>(sql);

  const map = new Map<string, MotionStatsForList>();
  for (const row of result.data) {
    const total = Number(row.total);
    const passed = Number(row.passed);
    map.set(row.intressent_id, {
      intressentId: row.intressent_id,
      total,
      passed,
      passRate: total > 0 ? Math.round((passed / total) * 100) : 0,
    });
  }

  return map;
}

export interface TopRebelTopicForList {
  intressentId: string;
  topic: string;
  count: number;
}

/**
 * Get top rebel vote topic for multiple politicians in a single query
 */
export async function getBatchTopRebelTopics(
  politicians: Array<{ id: string; party: string }>,
): Promise<Map<string, TopRebelTopicForList>> {
  if (politicians.length === 0) return new Map();

  console.log('[getBatchTopRebelTopics] Called for', politicians.length, 'politicians');

  // Group politicians by party for efficient querying
  const byParty = new Map<string, string[]>();
  for (const p of politicians) {
    const ids = byParty.get(p.party) ?? [];
    ids.push(p.id);
    byParty.set(p.party, ids);
  }

  const results = new Map<string, TopRebelTopicForList>();

  // Query each party group
  for (const [party, ids] of byParty) {
    const idList = ids.map(quote).join(', ');

    const sql = `
WITH person_votes AS (
  SELECT 
    ${TimelineColumns.intressent_id},
    ${TimelineColumns.action_id} as votering_id,
    ${TimelineColumns.vote_value},
    ${TimelineColumns.betankande_organ}
  FROM ${Tables.timeline}
  WHERE ${TimelineColumns.intressent_id} IN (${idList})
    AND ${TimelineColumns.action_type} = 'vote'
    AND ${TimelineColumns.vote_value} IN ('Ja', 'Nej', 'Avstår')
    AND ${TimelineColumns.betankande_organ} IS NOT NULL
),
party_majority AS (
  SELECT 
    ${TimelineColumns.action_id} as votering_id,
    ${TimelineColumns.vote_value},
    COUNT(*) as vote_count
  FROM ${Tables.timeline}
  WHERE ${TimelineColumns.parti} = ${quote(party)}
    AND ${TimelineColumns.action_type} = 'vote'
    AND ${TimelineColumns.vote_value} IN ('Ja', 'Nej', 'Avstår')
  GROUP BY ${TimelineColumns.action_id}, ${TimelineColumns.vote_value}
),
party_majority_vote AS (
  SELECT 
    votering_id,
    vote_value as majority_vote
  FROM party_majority
  WHERE (votering_id, vote_count) IN (
    SELECT votering_id, MAX(vote_count)
    FROM party_majority
    GROUP BY votering_id
  )
),
rebel_votes AS (
  SELECT 
    pv.intressent_id,
    pv.betankande_organ
  FROM person_votes pv
  INNER JOIN party_majority_vote pm ON pv.votering_id = pm.votering_id
  WHERE pv.vote_value != pm.majority_vote
),
rebel_by_topic AS (
  SELECT 
    intressent_id,
    betankande_organ,
    COUNT(*) as count,
    ROW_NUMBER() OVER (PARTITION BY intressent_id ORDER BY COUNT(*) DESC) as rn
  FROM rebel_votes
  GROUP BY intressent_id, betankande_organ
)
SELECT 
  intressent_id,
  betankande_organ as committee,
  count
FROM rebel_by_topic
WHERE rn = 1
    `;

    const result = await query<{
      intressent_id: string;
      committee: string;
      count: number;
    }>(sql);

    for (const row of result.data) {
      const topic = COMMITTEE_TO_TOPIC[row.committee] ?? row.committee;
      results.set(row.intressent_id, {
        intressentId: row.intressent_id,
        topic,
        count: Number(row.count),
      });
    }
  }

  return results;
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

export interface AccountabilityStatsForList {
  intressentId: string;
  interpellations: number;
  writtenQuestions: number;
  totalQuestions: number;
}

/**
 * Get accountability stats (interpellations + written questions) for multiple politicians
 */
export async function getBatchAccountabilityStats(
  intressentIds: string[],
): Promise<Map<string, AccountabilityStatsForList>> {
  if (intressentIds.length === 0) return new Map();

  console.log('[getBatchAccountabilityStats] Called for', intressentIds.length, 'politicians');

  const idList = intressentIds.map(quote).join(', ');

  const sql = `
SELECT 
  ${TimelineColumns.intressent_id} as intressent_id,
  COUNT(*) FILTER (WHERE lower(${TimelineColumns.authored_dok_typ}) IN ('ip', 'interpellation')) as interpellations,
  COUNT(*) FILTER (WHERE lower(${TimelineColumns.authored_dok_typ}) IN ('fr', 'skriftlig fråga')) as written_questions
FROM ${Tables.timeline}
WHERE ${TimelineColumns.intressent_id} IN (${idList})
  AND ${TimelineColumns.action_type} = 'authored'
  AND lower(${TimelineColumns.authored_dok_typ}) IN ('ip', 'interpellation', 'fr', 'skriftlig fråga')
GROUP BY ${TimelineColumns.intressent_id}
  `;

  const result = await query<{
    intressent_id: string;
    interpellations: number;
    written_questions: number;
  }>(sql);

  const map = new Map<string, AccountabilityStatsForList>();
  for (const row of result.data) {
    const interpellations = Number(row.interpellations);
    const writtenQuestions = Number(row.written_questions);
    map.set(row.intressent_id, {
      intressentId: row.intressent_id,
      interpellations,
      writtenQuestions,
      totalQuestions: interpellations + writtenQuestions,
    });
  }

  return map;
}
