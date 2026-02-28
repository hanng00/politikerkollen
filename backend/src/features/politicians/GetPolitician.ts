/**
 * GET /politicians/{id} - Get a single politician by ID
 */

import { getPolitician, getVoteBreakdown, getPartyLoyalty, getTopTopics, getRebelVotesByTopic, getMotionEffectiveness, getKeyVotes } from './repository';
import type { PoliticianDetail } from './types';
import { toDetail } from './types';

export async function handleGetPolitician(id: string): Promise<PoliticianDetail | null> {
  const row = await getPolitician(id);
  if (!row) return null;
  
  const [voteBreakdown, partyLoyalty, topTopics, rebelVotesByTopic, motionEffectiveness, keyVotes] = await Promise.all([
    getVoteBreakdown(id),
    getPartyLoyalty(id, row.parti),
    getTopTopics(id, 5),
    getRebelVotesByTopic(id, row.parti),
    getMotionEffectiveness(id),
    getKeyVotes(id, row.parti, 10),
  ]);
  
  return toDetail(row, voteBreakdown, partyLoyalty, topTopics, rebelVotesByTopic, motionEffectiveness, keyVotes);
}
