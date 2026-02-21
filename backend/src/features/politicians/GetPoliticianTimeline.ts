/**
 * GET /politicians/{id}/timeline - Get a politician's action timeline
 */

import { getTimeline } from './repository';
import type { PaginatedResponse, TimelineItem } from './types';
import { toTimelineItem } from './types';

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

  // Compound cursor: date_actionId to handle multiple items on same date
  const lastItem = timeline[timeline.length - 1];
  const nextCursor = hasMore && lastItem ? `${lastItem.date}_${lastItem.id}` : null;

  return {
    data: timeline,
    pagination: { hasMore, nextCursor },
  };
}
