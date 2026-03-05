/**
 * POST /search/politicians - Semantic search for politicians by query
 */

import { aggregateByPolitician } from './search/aggregate';
import { embedQuery } from './search/embed';
import { searchSourcesByEmbedding } from './search/searchSources';
import type { SearchPoliticiansRequest, SearchPoliticiansResponse } from './search/types';
import { DEFAULT_LIMIT, DEFAULT_RIKSMOTE_YEAR, DEFAULT_SIMILARITY_THRESHOLD } from './search/types';

export async function handleSearchPoliticians(request: SearchPoliticiansRequest): Promise<SearchPoliticiansResponse> {
  const startTime = Date.now();

  const { query: queryText, limit = DEFAULT_LIMIT, riksmote_year = DEFAULT_RIKSMOTE_YEAR } = request;

  console.log('[handleSearchPoliticians] Query:', queryText, 'Year:', riksmote_year);

  const embedding = await embedQuery(queryText);
  console.log('[handleSearchPoliticians] Embedding generated, dimensions:', embedding.length);

  const matches = await searchSourcesByEmbedding({
    embedding,
    queryText,
    threshold: DEFAULT_SIMILARITY_THRESHOLD,
    limit: 50,
    riksmote_year,
  });
  console.log('[handleSearchPoliticians] Source matches:', matches.length);

  const results = await aggregateByPolitician(matches, limit);
  console.log('[handleSearchPoliticians] Politicians found:', results.length);

  const searchTimeMs = Date.now() - startTime;

  return {
    query: queryText,
    results,
    metadata: {
      total_matches: matches.length,
      search_time_ms: searchTimeMs,
    },
  };
}
