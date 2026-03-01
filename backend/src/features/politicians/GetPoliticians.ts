/**
 * GET /politicians - List politicians with search and filters
 */

import { listPoliticians, getBatchMotionStats, getBatchTopRebelTopics, getBatchAccountabilityStats, getBatchScrutinizedStats, getConstituencies } from './queries';
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
  /** Include politicians without party affiliation ("-") in rebel vote rankings. Default: false */
  includeIndependents?: boolean;
}

export interface PaginatedPoliticiansResponse {
  data: PoliticianSummary[];
  nextOffset: number | null;
  hasMore: boolean;
}

export async function handleListPoliticians(params: ListPoliticiansParams): Promise<PaginatedPoliticiansResponse> {
  const {
    search,
    party,
    constituency,
    limit = 50,
    offset = 0,
    sortBy = 'mostEffective',
    fromDate,
    toDate,
    includeIndependents = false,
  } = params;
  
  // Fetch one extra to determine if there are more results
  const rows = await listPoliticians({
    search,
    party,
    constituency,
    limit: limit + 1,
    offset,
    sortBy,
    fromDate,
    toDate,
    includeIndependents,
  });
  
  const hasMore = rows.length > limit;
  const data = hasMore ? rows.slice(0, limit) : rows;
  
  // Get accountability metrics in parallel
  const ids = data.map((r) => r.intressent_id);
  const politiciansWithParty = data.map((r) => ({ id: r.intressent_id, party: r.parti }));
  
  const [motionStatsMap, topRebelTopicsMap, accountabilityStatsMap, scrutinizedStatsMap] = await Promise.all([
    getBatchMotionStats(ids),
    getBatchTopRebelTopics(politiciansWithParty),
    getBatchAccountabilityStats(ids),
    getBatchScrutinizedStats(ids),
  ]);
  
  // Transform with accountability metrics
  const summaries = data.map((row) => {
    const motionStats = motionStatsMap.get(row.intressent_id);
    const topRebelTopic = topRebelTopicsMap.get(row.intressent_id);
    const accountabilityStats = accountabilityStatsMap.get(row.intressent_id);
    const scrutinizedStats = scrutinizedStatsMap.get(row.intressent_id);
    
    return toSummary(
      row,
      motionStats ? { total: motionStats.total, passed: motionStats.passed, passRate: motionStats.passRate } : undefined,
      topRebelTopic ? { topic: topRebelTopic.topic, count: topRebelTopic.count } : undefined,
      accountabilityStats ? { 
        interpellations: accountabilityStats.interpellations, 
        writtenQuestions: accountabilityStats.writtenQuestions, 
        totalQuestions: accountabilityStats.totalQuestions 
      } : undefined,
      scrutinizedStats ? {
        interpellationsReceived: scrutinizedStats.interpellationsReceived,
        writtenQuestionsReceived: scrutinizedStats.writtenQuestionsReceived,
        totalQuestionsReceived: scrutinizedStats.totalQuestionsReceived,
      } : undefined,
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
