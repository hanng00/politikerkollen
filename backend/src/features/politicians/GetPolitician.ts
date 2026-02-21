/**
 * GET /politicians/{id} - Get a single politician by ID
 */

import { getPolitician, getVoteBreakdown, getPartyLoyalty, getTopTopics, getRebelVotes } from './repository';
import type { PoliticianDetail } from './types';
import { toDetail } from './types';

export async function handleGetPolitician(id: string): Promise<PoliticianDetail | null> {
  const row = await getPolitician(id);
  if (!row) return null;
  
  const [voteBreakdown, partyLoyalty, topTopics, rebelVotes] = await Promise.all([
    getVoteBreakdown(id),
    getPartyLoyalty(id, row.parti),
    getTopTopics(id, 5),
    getRebelVotes(id, row.parti, 50),
  ]);
  
  return toDetail(row, voteBreakdown, partyLoyalty, topTopics, rebelVotes);
}
