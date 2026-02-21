/**
 * GET /politicians - List politicians with search and filters
 */

import { listPoliticians } from './repository';
import type { PoliticianSummary } from './types';
import { toSummary } from './types';

export type SortOption = 'name' | 'mostActive' | 'mostVotes' | 'mostSpeeches' | 'mostRebel';

export interface ListPoliticiansParams {
  search?: string;
  party?: string;
  limit?: number;
  offset?: number;
  sortBy?: SortOption;
  fromDate?: string;
  toDate?: string;
}

export interface PaginatedPoliticiansResponse {
  data: PoliticianSummary[];
  nextOffset: number | null;
  hasMore: boolean;
}

export async function handleListPoliticians(params: ListPoliticiansParams): Promise<PaginatedPoliticiansResponse> {
  const { search, party, limit = 50, offset = 0, sortBy = 'name', fromDate, toDate } = params;
  
  // Fetch one extra to determine if there are more results
  const rows = await listPoliticians({ search, party, limit: limit + 1, offset, sortBy, fromDate, toDate });
  
  const hasMore = rows.length > limit;
  const data = hasMore ? rows.slice(0, limit) : rows;
  
  return {
    data: data.map(toSummary),
    nextOffset: hasMore ? offset + limit : null,
    hasMore,
  };
}
