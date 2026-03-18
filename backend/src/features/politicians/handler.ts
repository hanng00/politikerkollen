/**
 * Politicians API — Lambda handler for API Gateway.
 * Handles /politicians/* and /search/politicians routes.
 */

import type { APIGatewayProxyEvent, APIGatewayProxyResult } from 'aws-lambda';
import { keepalive } from '../../utils/motherduck';
import { handleGetPolitician } from './GetPolitician';
import { handleListPoliticians, type SortOption } from './GetPoliticians';
import { handleGetTimeline } from './GetPoliticianTimeline';
import { handleSearchPoliticians } from './PostSearchPoliticians';
import type { SearchPoliticiansRequest } from './search/types';

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

const validSortOptions = ['name', 'mostActive', 'mostVotes', 'mostSpeeches', 'mostRebel', 'mostEffective'];

function param(event: APIGatewayProxyEvent, key: string): string | undefined {
  return event.queryStringParameters?.[key] ?? undefined;
}

type RouteHandler = (event: APIGatewayProxyEvent) => Promise<APIGatewayProxyResult>;

const routes: Record<string, Record<string, RouteHandler>> = {
  '/politicians': {
    GET: async (event) => {
      const sortByParam = param(event, 'sortBy');
      const sortBy = sortByParam && validSortOptions.includes(sortByParam)
        ? sortByParam as SortOption
        : 'mostActive';

      const result = await handleListPoliticians({
        search: param(event, 'search'),
        party: param(event, 'party'),
        constituency: param(event, 'constituency'),
        limit: parseInt(param(event, 'limit') || '50', 10),
        offset: parseInt(param(event, 'offset') || '0', 10),
        sortBy,
        fromDate: param(event, 'fromDate'),
        toDate: param(event, 'toDate'),
        includeIndependents: param(event, 'includeIndependents') === 'true',
      });
      return json(result);
    },
  },

  '/politicians/{id}': {
    GET: async (event) => {
      const id = event.pathParameters?.id;
      if (!id) return error('Missing politician id', 400);
      const politician = await handleGetPolitician(id);
      if (!politician) return error('Politician not found', 404);
      return json({ data: politician });
    },
  },

  '/politicians/{id}/timeline': {
    GET: async (event) => {
      const id = event.pathParameters?.id;
      if (!id) return error('Missing politician id', 400);
      const typesParam = param(event, 'types');
      const actionTypes = typesParam
        ? (typesParam.split(',').filter(t => ['vote', 'speech', 'authored'].includes(t)) as Array<'vote' | 'speech' | 'authored'>)
        : undefined;

      const result = await handleGetTimeline(id, {
        limit: parseInt(param(event, 'limit') || '20', 10),
        cursor: param(event, 'cursor'),
        actionTypes,
      });
      return json(result);
    },
  },

  '/search/politicians': {
    POST: async (event) => {
      const body = JSON.parse(event.body || '{}') as SearchPoliticiansRequest;
      if (!body.query || typeof body.query !== 'string' || body.query.trim().length === 0) {
        return error('query is required', 400);
      }

      const result = await handleSearchPoliticians({
        query: body.query.trim(),
        limit: body.limit,
        riksmote_year: body.riksmote_year,
      });
      return json(result);
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
