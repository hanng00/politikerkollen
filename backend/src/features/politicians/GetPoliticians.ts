/**
 * GET /politicians - List politicians with search and filters
 */

import { listPoliticians } from './repository';
import type { PoliticianSummary } from './types';
import { toSummary } from './types';

export interface ListPoliticiansParams {
  search?: string;
  party?: string;
  limit?: number;
}

export async function handleListPoliticians(params: ListPoliticiansParams): Promise<PoliticianSummary[]> {
  const { search, party, limit = 50 } = params;
  const rows = await listPoliticians({ search, party, limit });
  return rows.map(toSummary);
}
