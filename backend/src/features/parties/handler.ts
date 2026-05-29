/**
 * Parties API — Lambda handler for API Gateway.
 * Handles /parties/* routes for party-level data.
 */

import type { APIGatewayProxyEvent, APIGatewayProxyResult } from 'aws-lambda';
import { keepalive } from '../../utils/motherduck';
import { getPartyEvidenceScorecard, getPartyScorecardById } from '../accountability/queries';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'GET, OPTIONS',
  'Access-Control-Allow-Headers': '*',
};

function json(data: unknown, statusCode = 200): APIGatewayProxyResult {
  return { statusCode, headers: corsHeaders, body: JSON.stringify(data) };
}

function error(message: string, statusCode: number): APIGatewayProxyResult {
  return json({ error: message }, statusCode);
}

function param(event: APIGatewayProxyEvent, key: string): string | undefined {
  return event.queryStringParameters?.[key] ?? undefined;
}

type RouteHandler = (event: APIGatewayProxyEvent) => Promise<APIGatewayProxyResult>;

const routes: Record<string, Record<string, RouteHandler>> = {
  '/parties/scorecard': {
    GET: async (event) => {
      const category = param(event, 'category');
      const data = await getPartyEvidenceScorecard(category);
      return json({ data });
    },
  },

  '/parties/scorecard/{partyId}': {
    GET: async (event) => {
      const partyId = event.pathParameters?.partyId;
      if (!partyId) return error('Missing partyId', 400);
      const scorecard = await getPartyScorecardById(partyId);
      if (!scorecard) return error('Party not found', 404);
      return json({ data: scorecard });
    },
  },
};

export const handler = async (event: APIGatewayProxyEvent & { source?: string }): Promise<APIGatewayProxyResult> => {
  if (event.source === 'aws.events') {
    await keepalive();
    return { statusCode: 200, headers: corsHeaders, body: '{"keepalive":true}' };
  }

  if (event.httpMethod === 'OPTIONS') {
    return { statusCode: 204, headers: corsHeaders, body: '' };
  }

  const route = routes[event.resource];
  const routeHandler = route?.[event.httpMethod];

  if (!routeHandler) {
    return error('Not found', 404);
  }

  try {
    return await routeHandler(event);
  } catch (err) {
    console.error(`[${event.httpMethod} ${event.path}] Error:`, err);
    return error(err instanceof Error ? err.message : 'Internal server error', 500);
  }
};
