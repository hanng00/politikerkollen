/**
 * Aggregate politician scores from source matches
 * 
 * For each matched source document:
 * 1. Authors get weight 10 (they initiated this)
 * 2. Voters get weight +3 (Ja) or -3 (Nej)
 * 
 * Final score = Σ(action_weight × similarity)
 */

import { query } from '../../../utils/motherduck';
import type { SourceMatch, PoliticianSearchResult, PoliticianAction } from './types';
import { SCORING_WEIGHTS } from './types';

const STG_SCHEMA = 'main_stg';
const INT_SCHEMA = 'main_int';
const MART_SCHEMA = 'main_mart';

interface PoliticianScore {
  intressent_id: string;
  score: number;
  motions_authored: number;
  votes_for: number;
  votes_against: number;
  actions: PoliticianAction[];
}

/**
 * Get votes for matched source documents
 * Uses int_vote_source_links to trace source → vote → individual votes
 */
async function getVotesForSources(
  dokIds: string[]
): Promise<Map<string, Array<{ intressent_id: string; rost: string; dok_id: string }>>> {
  if (dokIds.length === 0) return new Map();

  const dokIdList = dokIds.map(id => `'${id}'`).join(',');

  const sql = `
    SELECT 
      vsl.source_dok_id as dok_id,
      vl.intressent_id,
      vl.rost
    FROM ${INT_SCHEMA}.int_vote_source_links vsl
    JOIN ${STG_SCHEMA}.stg_voteringlista vl ON vl.votering_id = vsl.votering_id
    WHERE vsl.source_dok_id IN (${dokIdList})
      AND vl.rost IN ('Ja', 'Nej')
  `;

  const result = await query<{
    dok_id: string;
    intressent_id: string;
    rost: string;
  }>(sql);

  const votesByDok = new Map<string, Array<{ intressent_id: string; rost: string; dok_id: string }>>();
  for (const row of result.data) {
    const existing = votesByDok.get(row.dok_id) || [];
    existing.push(row);
    votesByDok.set(row.dok_id, existing);
  }

  return votesByDok;
}

/**
 * Get politician metadata (name, party, image)
 */
async function getPoliticianMetadata(
  intressentIds: string[]
): Promise<Map<string, { name: string; party: string; constituency: string | null; image_url: string | null }>> {
  if (intressentIds.length === 0) return new Map();

  const idList = intressentIds.map(id => `'${id}'`).join(',');

  const sql = `
    SELECT 
      intressent_id,
      namn as name,
      parti as party,
      valkrets as constituency,
      bild_url_192 as image_url
    FROM ${MART_SCHEMA}.mart_person
    WHERE intressent_id IN (${idList})
  `;

  const result = await query<{
    intressent_id: string;
    name: string;
    party: string;
    constituency: string | null;
    image_url: string | null;
  }>(sql);

  const metadata = new Map<string, { name: string; party: string; constituency: string | null; image_url: string | null }>();
  for (const row of result.data) {
    metadata.set(row.intressent_id, {
      name: row.name,
      party: row.party,
      constituency: row.constituency,
      image_url: row.image_url,
    });
  }

  return metadata;
}

/**
 * Aggregate scores by politician from source matches
 */
export async function aggregateByPolitician(
  matches: SourceMatch[],
  limit: number = 20
): Promise<PoliticianSearchResult[]> {
  if (matches.length === 0) return [];

  const dokIds = matches.map(m => m.dok_id);
  const matchMap = new Map(matches.map(m => [m.dok_id, m]));

  // Get votes for all matched sources
  const votesByDok = await getVotesForSources(dokIds);

  // Build politician scores
  const scores = new Map<string, PoliticianScore>();

  const getOrCreateScore = (intressentId: string): PoliticianScore => {
    let score = scores.get(intressentId);
    if (!score) {
      score = {
        intressent_id: intressentId,
        score: 0,
        motions_authored: 0,
        votes_for: 0,
        votes_against: 0,
        actions: [],
      };
      scores.set(intressentId, score);
    }
    return score;
  };

  // Process authors (from intressent_ids on source documents)
  for (const match of matches) {
    if (match.intressent_ids && match.intressent_ids.length > 0) {
      for (const intressentId of match.intressent_ids) {
        const politicianScore = getOrCreateScore(intressentId);
        const actionScore = SCORING_WEIGHTS.authored * match.similarity;
        politicianScore.score += actionScore;
        politicianScore.motions_authored += 1;
        politicianScore.actions.push({
          intressent_id: intressentId,
          dok_id: match.dok_id,
          action: 'authored',
          similarity: match.similarity,
          weight: SCORING_WEIGHTS.authored,
        });
      }
    }
  }

  // Process votes
  for (const [dokId, votes] of votesByDok) {
    const match = matchMap.get(dokId);
    if (!match) continue;

    for (const vote of votes) {
      const politicianScore = getOrCreateScore(vote.intressent_id);
      const isJa = vote.rost === 'Ja';
      const weight = isJa ? SCORING_WEIGHTS.voted_ja : SCORING_WEIGHTS.voted_nej;
      const actionScore = weight * match.similarity;

      politicianScore.score += actionScore;
      if (isJa) {
        politicianScore.votes_for += 1;
      } else {
        politicianScore.votes_against += 1;
      }
      politicianScore.actions.push({
        intressent_id: vote.intressent_id,
        dok_id: dokId,
        action: isJa ? 'voted_ja' : 'voted_nej',
        similarity: match.similarity,
        weight,
      });
    }
  }

  // Sort by score and take top N
  const sortedScores = Array.from(scores.values())
    .sort((a, b) => b.score - a.score)
    .slice(0, limit);

  // Get politician metadata
  const intressentIds = sortedScores.map(s => s.intressent_id);
  const metadata = await getPoliticianMetadata(intressentIds);

  // Build results
  const results: PoliticianSearchResult[] = [];
  for (const politicianScore of sortedScores) {
    const meta = metadata.get(politicianScore.intressent_id);
    if (!meta) continue;

    // Get top matches for this politician (sorted by contribution to score)
    const topActions = politicianScore.actions
      .sort((a, b) => Math.abs(b.weight * b.similarity) - Math.abs(a.weight * a.similarity))
      .slice(0, 3);

    const topMatches = topActions.map(action => {
      const match = matchMap.get(action.dok_id)!;
      return {
        dok_id: action.dok_id,
        titel: match.titel,
        similarity: action.similarity,
        action: action.action,
      };
    });

    results.push({
      intressent_id: politicianScore.intressent_id,
      name: meta.name,
      party: meta.party,
      constituency: meta.constituency,
      image_url: meta.image_url,
      score: Math.round(politicianScore.score * 100) / 100,
      evidence: {
        motions_authored: politicianScore.motions_authored,
        votes_for: politicianScore.votes_for,
        votes_against: politicianScore.votes_against,
      },
      top_matches: topMatches,
    });
  }

  return results;
}
