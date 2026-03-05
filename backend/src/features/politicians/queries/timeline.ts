/**
 * Queries for politician timeline
 */

import { logSql } from '../../../utils/logger';
import { query } from '../../../utils/motherduck';
import {
  Tables,
  TimelineColumns,
  and,
  buildQuery,
  eq,
  inList,
  lt,
  or,
} from '../../../utils/sql-builder';
import type { MartPersonTimeline } from '../types';

export interface GetTimelineOptions {
  limit?: number;
  cursor?: string;
  actionTypes?: Array<'vote' | 'speech' | 'authored'>;
}

/**
 * Get timeline for a politician with cursor-based pagination
 * Cursor format: date_actionId (compound to handle multiple items on same date)
 */
export async function getTimeline(
  intressentId: string,
  options: GetTimelineOptions = {},
): Promise<{ items: MartPersonTimeline[]; hasMore: boolean }> {
  const { limit = 20, cursor, actionTypes } = options;
  console.log('[getTimeline] Called with intressentId:', intressentId, 'options:', JSON.stringify(options));

  const conditions = [eq(TimelineColumns.intressent_id, intressentId)];

  if (cursor) {
    const underscoreIndex = cursor.indexOf('_');
    if (underscoreIndex > 0) {
      const cursorDate = cursor.substring(0, underscoreIndex);
      const cursorActionId = cursor.substring(underscoreIndex + 1);
      conditions.push(
        or(
          lt(TimelineColumns.action_date, cursorDate),
          and(eq(TimelineColumns.action_date, cursorDate), lt(TimelineColumns.action_id, cursorActionId)),
        ),
      );
    } else {
      conditions.push(lt(TimelineColumns.action_date, cursor));
    }
  }

  if (actionTypes && actionTypes.length > 0) {
    conditions.push(inList(TimelineColumns.action_type, actionTypes));
  }

  const sql = buildQuery({
    select: '*',
    from: Tables.timeline,
    where: and(...conditions),
    orderBy: `${TimelineColumns.action_date} DESC, ${TimelineColumns.action_id} DESC`,
    limit: limit + 1,
  });

  logSql('[getTimeline] Executing SQL:', sql);
  const result = await query<MartPersonTimeline>(sql);

  const hasMore = result.data.length > limit;
  const items = hasMore ? result.data.slice(0, limit) : result.data;

  console.log('[getTimeline] Result count:', items.length, 'hasMore:', hasMore);
  return { items, hasMore };
}
