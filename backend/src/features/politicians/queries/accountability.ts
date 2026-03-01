/**
 * Queries for accountability stats (interpellations, written questions)
 */

import { query } from '../../../utils/motherduck';
import {
  Tables,
  TimelineColumns,
  and,
  buildQuery,
  eq,
  inList,
  or,
  quote,
} from '../../../utils/sql-builder';
import type { AccountabilityStats, RecentQuestion } from '../types';

/**
 * Get accountability stats - interpellations and written questions
 * These represent the politician's work in questioning/scrutinizing the government
 */
export async function getAccountabilityStats(intressentId: string): Promise<AccountabilityStats> {
  console.log('[getAccountabilityStats] Called with intressentId:', intressentId);

  const countSql = buildQuery({
    select: `
      COUNT(*) FILTER (WHERE lower(${TimelineColumns.authored_dok_typ}) IN ('ip', 'interpellation')) as interpellations,
      COUNT(*) FILTER (WHERE lower(${TimelineColumns.authored_dok_typ}) IN ('fr', 'skriftlig fråga')) as written_questions
    `.trim(),
    from: Tables.timeline,
    where: and(
      eq(TimelineColumns.intressent_id, intressentId),
      eq(TimelineColumns.action_type, 'authored'),
      inList(TimelineColumns.authored_roll, ['undertecknare', 'fragestallare']),
      or(
        inList(`lower(${TimelineColumns.authored_dok_typ})`, ['ip', 'interpellation', 'fr', 'skriftlig fråga']),
      ),
    ),
  });

  console.log('[getAccountabilityStats] Executing count SQL:', countSql);
  const countResult = await query<{ interpellations: number; written_questions: number }>(countSql);
  const counts = countResult.data[0] ?? { interpellations: 0, written_questions: 0 };

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
      inList(TimelineColumns.authored_roll, ['undertecknare', 'fragestallare']),
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
  AND ${TimelineColumns.authored_roll} IN ('undertecknare', 'fragestallare')
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

export interface ScrutinizedStatsForList {
  intressentId: string;
  interpellationsReceived: number;
  writtenQuestionsReceived: number;
  totalQuestionsReceived: number;
}

/**
 * Get scrutinized stats (interpellations + written questions received) for multiple politicians
 * This counts questions where the politician is the responder (stalldtill/besvaradav), typically ministers
 */
export async function getBatchScrutinizedStats(
  intressentIds: string[],
): Promise<Map<string, ScrutinizedStatsForList>> {
  if (intressentIds.length === 0) return new Map();

  console.log('[getBatchScrutinizedStats] Called for', intressentIds.length, 'politicians');

  const idList = intressentIds.map(quote).join(', ');

  const sql = `
SELECT 
  ${TimelineColumns.intressent_id} as intressent_id,
  COUNT(*) FILTER (WHERE lower(${TimelineColumns.authored_dok_typ}) IN ('ip', 'interpellation')) as interpellations_received,
  COUNT(*) FILTER (WHERE lower(${TimelineColumns.authored_dok_typ}) IN ('fr', 'skriftlig fråga')) as written_questions_received
FROM ${Tables.timeline}
WHERE ${TimelineColumns.intressent_id} IN (${idList})
  AND ${TimelineColumns.action_type} = 'authored'
  AND ${TimelineColumns.authored_roll} = 'stalldtill'
  AND lower(${TimelineColumns.authored_dok_typ}) IN ('ip', 'interpellation', 'fr', 'skriftlig fråga')
GROUP BY ${TimelineColumns.intressent_id}
  `;

  const result = await query<{
    intressent_id: string;
    interpellations_received: number;
    written_questions_received: number;
  }>(sql);

  const map = new Map<string, ScrutinizedStatsForList>();
  for (const row of result.data) {
    const interpellationsReceived = Number(row.interpellations_received);
    const writtenQuestionsReceived = Number(row.written_questions_received);
    map.set(row.intressent_id, {
      intressentId: row.intressent_id,
      interpellationsReceived,
      writtenQuestionsReceived,
      totalQuestionsReceived: interpellationsReceived + writtenQuestionsReceived,
    });
  }

  return map;
}
