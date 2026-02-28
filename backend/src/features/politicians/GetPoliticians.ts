/**
 * GET /politicians - List politicians with search and filters
 */

import { listPoliticians, getBatchMotionStats, getBatchTopRebelTopics, getConstituencies } from './repository';
import type { PoliticianSummary } from './types';
import { toSummary } from './types';

export type SortOption = 'name' | 'mostActive' | 'mostVotes' | 'mostSpeeches' | 'mostRebel' | 'mostEffective';

export interface ListPoliticiansParams {
  search?: string;
  party?: string;
  constituency?: string;
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
  const { search, party, constituency, limit = 50, offset = 0, sortBy = 'mostEffective', fromDate, toDate } = params;
  
  // Fetch one extra to determine if there are more results
  const rows = await listPoliticians({ search, party, constituency, limit: limit + 1, offset, sortBy, fromDate, toDate });
  
  const hasMore = rows.length > limit;
  const data = hasMore ? rows.slice(0, limit) : rows;
  
  // Get accountability metrics in parallel
  const ids = data.map((r) => r.intressent_id);
  const politiciansWithParty = data.map((r) => ({ id: r.intressent_id, party: r.parti }));
  
  const [motionStatsMap, topRebelTopicsMap] = await Promise.all([
    getBatchMotionStats(ids),
    getBatchTopRebelTopics(politiciansWithParty),
  ]);
  
  // Transform with accountability metrics
  const summaries = data.map((row) => {
    const motionStats = motionStatsMap.get(row.intressent_id);
    const topRebelTopic = topRebelTopicsMap.get(row.intressent_id);
    
    return toSummary(
      row,
      motionStats ? { total: motionStats.total, passed: motionStats.passed, passRate: motionStats.passRate } : undefined,
      topRebelTopic ? { topic: topRebelTopic.topic, count: topRebelTopic.count } : undefined,
    );
  });
  
  return {
    data: summaries,
    nextOffset: hasMore ? offset + limit : null,
    hasMore,
  };
}

export async function handleGetConstituencies(): Promise<string[]> {
  return getConstituencies();
}
