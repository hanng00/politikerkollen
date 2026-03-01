/**
 * Queries for votes - rebel votes, key votes, party voting patterns
 */

import { query } from '../../../utils/motherduck';
import {
  Tables,
  TimelineColumns,
  buildQuery,
  cte,
  isNotNull,
  quote,
} from '../../../utils/sql-builder';
import { COMMITTEE_TO_TOPIC } from './detail';

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
        // JSON parsing failed
      }

      return {
        topic: COMMITTEE_TO_TOPIC[row.committee] ?? row.committee,
        committee: row.committee,
        count: Number(row.count),
        recentVotes,
      };
    });
  } catch {
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

  const byParty = new Map<string, string[]>();
  for (const p of politicians) {
    const ids = byParty.get(p.party) ?? [];
    ids.push(p.id);
    byParty.set(p.party, ids);
  }

  const results = new Map<string, TopRebelTopicForList>();

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
