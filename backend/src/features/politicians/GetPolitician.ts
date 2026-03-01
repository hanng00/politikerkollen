/**
 * GET /politicians/{id} - Get a single politician by ID
 */

import {
  getAccountabilityStats,
  getKeyVotes,
  getMotionEffectiveness,
  getPartyLoyalty,
  getPolitician,
  getRebelVotesByTopic,
  getTopTopics,
  getVoteBreakdown,
} from './queries';
import type { PoliticianDetail } from './types';
import { toDetail } from './types';

export async function handleGetPolitician(id: string): Promise<PoliticianDetail | null> {
  const row = await getPolitician(id);
  if (!row) return null;

  const [
    voteBreakdown,
    partyLoyalty,
    topTopics,
    rebelVotesByTopic,
    motionEffectiveness,
    keyVotes,
    accountabilityStats,
  ] = await Promise.all([
    getVoteBreakdown(id),
    getPartyLoyalty(id, row.parti),
    getTopTopics(id, 5),
    getRebelVotesByTopic(id, row.parti),
    getMotionEffectiveness(id),
    getKeyVotes(id, row.parti, 10),
    getAccountabilityStats(id),
  ]);

  return toDetail(
    row,
    voteBreakdown,
    partyLoyalty,
    topTopics,
    rebelVotesByTopic,
    motionEffectiveness,
    keyVotes,
    accountabilityStats,
  );
}
