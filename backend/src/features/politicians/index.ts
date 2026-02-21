/**
 * Politicians API - Bun HTTP server entry point
 * Runs inside Lambda via AWS Lambda Web Adapter
 */

import { handleGetPolitician } from './GetPolitician';
import { handleListPoliticians, type SortOption } from './GetPoliticians';
import { handleGetTimeline } from './GetPoliticianTimeline';

const PORT = process.env.PORT || 8080;

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'GET, OPTIONS',
  'Access-Control-Allow-Headers': '*',
};

function json(data: unknown, status = 200) {
  return Response.json(data, { status, headers: corsHeaders });
}

function error(message: string, status: number) {
  return json({ error: message }, status);
}

const validSortOptions = ['name', 'mostActive', 'mostVotes', 'mostSpeeches', 'mostRebel'];

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
          limit: parseInt(url.searchParams.get('limit') || '50', 10),
          offset: parseInt(url.searchParams.get('offset') || '0', 10),
          sortBy,
          fromDate: url.searchParams.get('fromDate') || undefined,
          toDate: url.searchParams.get('toDate') || undefined,
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
