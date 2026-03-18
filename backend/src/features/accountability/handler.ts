/**
 * Accountability API — Lambda handler for API Gateway.
 * Handles /promises/* routes for promise accountability.
 */

import type { APIGatewayProxyEvent, APIGatewayProxyResult } from 'aws-lambda';
import { keepalive } from '../../utils/motherduck';
import {
  getPromiseFilters,
  getPromiseScores,
  getPromiseScoreById,
  getPartyEvidenceScorecard,
} from './queries';
import type { GetPromiseScoresRequest } from './types';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
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
  // Legacy routes - redirect to new endpoints
  '/contradictions/filters': {
    GET: async () => {
      const filters = await getPromiseFilters();
      return json(filters);
    },
  },

  // New promise-based routes
  '/promises/scores': {
    GET: async (event) => {
      const request: GetPromiseScoresRequest = {
        party: param(event, 'party'),
        category: param(event, 'category'),
        evidence_direction: param(event, 'evidence_direction'),
        outcome: param(event, 'outcome') as 'positive' | 'negative' | 'contradictory' | undefined,
        limit: parseInt(param(event, 'limit') || '20', 10),
        offset: parseInt(param(event, 'offset') || '0', 10),
      };
      const { data, total } = await getPromiseScores(request);
      return json({ data, meta: { total, limit: request.limit, offset: request.offset } });
    },
  },

  '/promises/scores/{promiseId}': {
    GET: async (event) => {
      const promiseId = event.pathParameters?.promiseId;
      if (!promiseId) return error('Missing promiseId', 400);
      const promise = await getPromiseScoreById(promiseId);
      if (!promise) return error('Promise not found', 404);
      return json({ data: promise });
    },
  },

  '/promises/scorecard': {
    GET: async (event) => {
      const category = param(event, 'category');
      const data = await getPartyEvidenceScorecard(category);
      return json({ data });
    },
  },
};

export const handler = async (event: APIGatewayProxyEvent & { source?: string }): Promise<APIGatewayProxyResult> => {
  // Scheduled keepalive — ping MotherDuck to prevent session cold start
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
