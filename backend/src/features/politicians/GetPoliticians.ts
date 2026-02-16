/**
 * GET /politicians - List politicians with search and filters
 */

import type { APIGatewayProxyEvent, APIGatewayProxyResult } from 'aws-lambda';
import { listPoliticians } from './repository';
import { toSummary } from './types';

export async function handler(event: APIGatewayProxyEvent): Promise<APIGatewayProxyResult> {
  try {
    const params = event.queryStringParameters ?? {};

    const search = params.search;
    const party = params.party;
    const limit = params.limit ? parseInt(params.limit, 10) : 50;

    const rows = await listPoliticians({ search, party, limit });
    const politicians = rows.map(toSummary);

    return {
      statusCode: 200,
      headers: {
        'Content-Type': 'application/json',
        'Access-Control-Allow-Origin': '*',
      },
      body: JSON.stringify({ data: politicians }),
    };
  } catch (error) {
    console.error('Error listing politicians:', error);
    return {
      statusCode: 500,
      headers: {
        'Content-Type': 'application/json',
        'Access-Control-Allow-Origin': '*',
      },
      body: JSON.stringify({
        error: 'Failed to fetch politicians',
        message: error instanceof Error ? error.message : 'Unknown error',
      }),
    };
  }
}
