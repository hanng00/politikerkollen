/**
 * Queries for single politician detail view
 */

import { logSql } from '../../../utils/logger';
import { query } from '../../../utils/motherduck';
import {
  PersonColumns,
  Tables,
  TimelineColumns,
  and,
  buildQuery,
  cte,
  eq,
  isNotNull,
  neq,
  quote,
} from '../../../utils/sql-builder';
import type { MartPerson, VoteBreakdown } from '../types';

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

  logSql('[getPolitician] Executing SQL:', sql);
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

  logSql('[getPercentileRankings] Executing SQL:', sql);
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

  logSql('[getVoteBreakdown] Executing SQL:', sql);
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

/**
 * Calculate party loyalty score for a politician.
 */
export async function getPartyLoyalty(intressentId: string, party: string): Promise<PartyLoyalty> {
  console.log('[getPartyLoyalty] Called with intressentId:', intressentId, 'party:', party);

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

  logSql('[getPartyLoyalty] Executing SQL:', sql);
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

export interface TopicActivity {
  topic: string;
  committee: string;
  voteCount: number;
  speechCount: number;
  totalCount: number;
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

  logSql('[getTopTopics] Executing SQL:', sql);
  const result = await query<{ committee: string; vote_count: number; speech_count: number; total_count: number }>(sql);

  return result.data.map((row) => ({
    committee: row.committee,
    topic: COMMITTEE_TO_TOPIC[row.committee] ?? row.committee,
    voteCount: Number(row.vote_count),
    speechCount: Number(row.speech_count),
    totalCount: Number(row.total_count),
  }));
}

export { COMMITTEE_TO_TOPIC };
