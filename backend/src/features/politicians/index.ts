/**
 * Politicians API - Bun HTTP server entry point
 * Runs inside Lambda via AWS Lambda Web Adapter
 */

import { handleGetPolitician } from './GetPolitician';
import { handleListPoliticians, type SortOption } from './GetPoliticians';
import { handleGetTimeline } from './GetPoliticianTimeline';
import { handleSearchPoliticians } from './PostSearchPoliticians';
import type { SearchPoliticiansRequest } from './search/types';
import { getContradictions, getContradictionFilters } from '../contradictions';
import type { GetContradictionsRequest } from '../contradictions';

const PORT = process.env.PORT || 8080;

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
  'Access-Control-Allow-Headers': '*',
};

function json(data: unknown, status = 200) {
  return Response.json(data, { status, headers: corsHeaders });
}

function error(message: string, status: number) {
  return json({ error: message }, status);
}

const validSortOptions = ['name', 'mostActive', 'mostVotes', 'mostSpeeches', 'mostRebel', 'mostEffective'];

const server = Bun.serve({
  port: PORT,

  routes: {
    '/politicians': {
      GET: async (req) => {
        const url = new URL(req.url);
        const sortByParam = url.searchParams.get('sortBy');
        const sortBy = sortByParam && validSortOptions.includes(sortByParam) 
          ? sortByParam as SortOption 
          : 'mostActive';
        
        const result = await handleListPoliticians({
          search: url.searchParams.get('search') || undefined,
          party: url.searchParams.get('party') || undefined,
          constituency: url.searchParams.get('constituency') || undefined,
          limit: parseInt(url.searchParams.get('limit') || '50', 10),
          offset: parseInt(url.searchParams.get('offset') || '0', 10),
          sortBy,
          fromDate: url.searchParams.get('fromDate') || undefined,
          toDate: url.searchParams.get('toDate') || undefined,
          includeIndependents: url.searchParams.get('includeIndependents') === 'true',
        });
        return json(result);
      },
      OPTIONS: () => new Response(null, { status: 204, headers: corsHeaders }),
    },

    '/politicians/:id': {
      GET: async (req) => {
        const politician = await handleGetPolitician(req.params.id);
        if (!politician) {
          return error('Politician not found', 404);
        }
        return json({ data: politician });
      },
      OPTIONS: () => new Response(null, { status: 204, headers: corsHeaders }),
    },

    '/politicians/:id/timeline': {
      GET: async (req) => {
        const url = new URL(req.url);
        const typesParam = url.searchParams.get('types');
        const actionTypes = typesParam
          ? (typesParam.split(',').filter(t => ['vote', 'speech', 'authored'].includes(t)) as Array<'vote' | 'speech' | 'authored'>)
          : undefined;
        
        const result = await handleGetTimeline(req.params.id, {
          limit: parseInt(url.searchParams.get('limit') || '20', 10),
          cursor: url.searchParams.get('cursor') || undefined,
          actionTypes,
        });
        return json(result);
      },
      OPTIONS: () => new Response(null, { status: 204, headers: corsHeaders }),
    },

    '/search/politicians': {
      POST: async (req) => {
        try {
          const body = await req.json() as SearchPoliticiansRequest;

          if (!body.query || typeof body.query !== 'string' || body.query.trim().length === 0) {
            return error('query is required', 400);
          }

          const result = await handleSearchPoliticians({
            query: body.query.trim(),
            limit: body.limit,
            riksmote_year: body.riksmote_year,
          });

          return json(result);
        } catch (err) {
          console.error('[POST /search/politicians] Error:', err);
          return error(err instanceof Error ? err.message : 'Internal server error', 500);
        }
      },
      OPTIONS: () => new Response(null, { status: 204, headers: corsHeaders }),
    },

    '/contradictions': {
      GET: async (req) => {
        try {
          const url = new URL(req.url);
          const request: GetContradictionsRequest = {
            party: url.searchParams.get('party') || undefined,
            category: url.searchParams.get('category') || undefined,
            limit: parseInt(url.searchParams.get('limit') || '20', 10),
            offset: parseInt(url.searchParams.get('offset') || '0', 10),
            min_similarity: parseFloat(url.searchParams.get('min_similarity') || '0.75'),
          };

          const { data, total } = await getContradictions(request);

          return json({
            data,
            meta: {
              total,
              limit: request.limit,
              offset: request.offset,
            },
          });
        } catch (err) {
          console.error('[GET /contradictions] Error:', err);
          return error(err instanceof Error ? err.message : 'Internal server error', 500);
        }
      },
      OPTIONS: () => new Response(null, { status: 204, headers: corsHeaders }),
    },

    '/contradictions/filters': {
      GET: async () => {
        try {
          const filters = await getContradictionFilters();
          return json(filters);
        } catch (err) {
          console.error('[GET /contradictions/filters] Error:', err);
          return error(err instanceof Error ? err.message : 'Internal server error', 500);
        }
      },
      OPTIONS: () => new Response(null, { status: 204, headers: corsHeaders }),
    },
  },

  fetch() {
    return error('Not found', 404);
  },

  error(err) {
    console.error('Server error:', err);
    return error(err.message || 'Internal server error', 500);
  },
});

console.log(`Politicians API running at ${server.url}`);
