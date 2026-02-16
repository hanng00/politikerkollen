/**
 * Unified handler for Politicians API
 * Routes requests based on path to the appropriate handler
 */

import type { APIGatewayProxyEvent, APIGatewayProxyResult } from 'aws-lambda';
import { handler as getPolitician } from './GetPolitician';
import { handler as listPoliticians } from './GetPoliticians';
import { handler as getTimeline } from './GetPoliticianTimeline';

export async function handler(event: APIGatewayProxyEvent): Promise<APIGatewayProxyResult> {
  const path = event.path;
  const method = event.httpMethod;

  // Route based on path pattern
  // GET /politicians - list all
  // GET /politicians/{id} - get single
  // GET /politicians/{id}/timeline - get timeline

  if (method !== 'GET') {
    return {
      statusCode: 405,
      headers: {
        'Content-Type': 'application/json',
        'Access-Control-Allow-Origin': '*',
      },
      body: JSON.stringify({ error: 'Method not allowed' }),
    };
  }

  // Match /politicians/{id}/timeline
  if (path.match(/^\/politicians\/[^/]+\/timeline$/)) {
    return getTimeline(event);
  }

  // Match /politicians/{id}
  if (path.match(/^\/politicians\/[^/]+$/)) {
    return getPolitician(event);
  }

  // Match /politicians
  if (path === '/politicians' || path === '/politicians/') {
    return listPoliticians(event);
  }

  return {
    statusCode: 404,
    headers: {
      'Content-Type': 'application/json',
      'Access-Control-Allow-Origin': '*',
    },
    body: JSON.stringify({ error: 'Not found' }),
  };
}
