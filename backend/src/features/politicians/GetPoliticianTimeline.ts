/**
 * GET /politicians/{id}/timeline - Get a politician's action timeline
 */

import { getMotionImpactScores, getTimeline } from './repository';
import type { PaginatedResponse, TimelineItem } from './types';
import { toMotionImpactScore, toTimelineItem } from './types';

export interface GetTimelineParams {
  limit?: number;
  cursor?: string;
  actionTypes?: Array<'vote' | 'speech' | 'authored'>;
}

export async function handleGetTimeline(
  id: string,
  params: GetTimelineParams,
): Promise<PaginatedResponse<TimelineItem>> {
  const { limit = 20, cursor, actionTypes } = params;

  const { items, hasMore } = await getTimeline(id, { limit, cursor, actionTypes });
  const timeline = items.map(toTimelineItem);

  // Batch-enrich authored motioner with impact scores
  const motionDokIds = timeline
    .filter((item) => item.type === 'authored' && item.documentType === 'Motion' && item.documentId)
    .map((item) => item.documentId as string);

  if (motionDokIds.length > 0) {
    const scoreMap = await getMotionImpactScores(motionDokIds);
    for (const item of timeline) {
      if (item.type === 'authored' && item.documentId) {
        const row = scoreMap.get(item.documentId);
        if (row) {
          item.impactScore = toMotionImpactScore(row);
        }
      }
    }
  }

  // Compound cursor: date_actionId to handle multiple items on same date
  const lastItem = timeline[timeline.length - 1];
  const nextCursor = hasMore && lastItem ? `${lastItem.date}_${lastItem.id}` : null;

  return {
    data: timeline,
    pagination: { hasMore, nextCursor },
  };
}
