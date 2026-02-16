/**
 * GET /politicians/{id}/timeline - Get a politician's action timeline
 */

import type { APIGatewayProxyEvent, APIGatewayProxyResult } from 'aws-lambda';
import { getTimeline } from './repository';
import type { PaginatedResponse, TimelineItem } from './types';
import { toTimelineItem } from './types';

export async function handler(event: APIGatewayProxyEvent): Promise<APIGatewayProxyResult> {
  try {
    const id = event.pathParameters?.id;

    if (!id) {
      return {
        statusCode: 400,
        headers: {
          'Content-Type': 'application/json',
          'Access-Control-Allow-Origin': '*',
        },
        body: JSON.stringify({ error: 'Missing politician ID' }),
      };
    }

    const params = event.queryStringParameters ?? {};
    const limit = params.limit ? parseInt(params.limit, 10) : 20;
    const cursor = params.cursor;
    const actionType = params.type as 'vote' | 'speech' | 'authored' | undefined;

    const { items, hasMore } = await getTimeline(id, { limit, cursor, actionType });
    const timeline = items.map(toTimelineItem);

    // Next cursor is the date of the last item
    const nextCursor = hasMore && timeline.length > 0 ? timeline[timeline.length - 1].date : null;

    const response: PaginatedResponse<TimelineItem> = {
      data: timeline,
      pagination: {
        hasMore,
        nextCursor,
      },
    };

    return {
      statusCode: 200,
      headers: {
        'Content-Type': 'application/json',
        'Access-Control-Allow-Origin': '*',
      },
      body: JSON.stringify(response),
    };
  } catch (error) {
    console.error('Error fetching timeline:', error);
    return {
      statusCode: 500,
      headers: {
        'Content-Type': 'application/json',
        'Access-Control-Allow-Origin': '*',
      },
      body: JSON.stringify({
        error: 'Failed to fetch timeline',
        message: error instanceof Error ? error.message : 'Unknown error',
      }),
    };
  }
}
