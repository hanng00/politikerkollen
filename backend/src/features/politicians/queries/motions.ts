/**
 * Queries for motion effectiveness and impact scores
 */

import { query } from '../../../utils/motherduck';
import {
  MotionImpactColumns,
  Tables,
  buildQuery,
  inList,
  quote,
} from '../../../utils/sql-builder';
import type { MartMotionImpactScore, MotionEffectiveness, MotionListItem } from '../types';

/**
 * Calculate motion effectiveness for a politician
 * Includes Bayesian-adjusted statistics for fair ranking
 */
export async function getMotionEffectiveness(intressentId: string): Promise<MotionEffectiveness> {
  console.log('[getMotionEffectiveness] Called with intressentId:', intressentId);

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

  // Fetch recent motions list
  const recentMotions = await getRecentMotions(intressentId, 10);

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
    recentMotions,
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

/**
 * Get a list of recent motions for a politician
 */
async function getRecentMotions(intressentId: string, limit: number): Promise<MotionListItem[]> {
  const sql = `
WITH person_motions AS (
  SELECT DISTINCT 
    t.authored_dok_id as mot_dok_id,
    t.action_date as date
  FROM ${Tables.timeline} t
  WHERE t.intressent_id = ${quote(intressentId)}
    AND t.action_type = 'authored'
    AND t.authored_dok_typ IN ('mot', 'Motion')
    AND t.authored_dok_id IS NOT NULL
)
SELECT 
  pm.mot_dok_id,
  pm.date,
  COALESCE(m.mot_titel, 'Motion') as title,
  m.outcome_label,
  m.impact_score
FROM person_motions pm
LEFT JOIN ${Tables.motionImpact} m ON m.mot_dok_id = pm.mot_dok_id
ORDER BY pm.date DESC
LIMIT ${limit}
  `;

  const result = await query<{
    mot_dok_id: string;
    date: string;
    title: string;
    outcome_label: string | null;
    impact_score: number | null;
  }>(sql);

  return result.data.map((row) => ({
    dokId: row.mot_dok_id,
    title: row.title,
    date: row.date,
    outcome: row.outcome_label as 'bifall' | 'avslag' | null,
    impactScore: row.impact_score,
  }));
}

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

/**
 * Batch-fetch impact scores for a list of motion dok_ids.
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
