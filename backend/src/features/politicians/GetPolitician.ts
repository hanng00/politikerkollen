/**
 * GET /politicians/{id} - Get a single politician by ID
 */

import { getPolitician } from './repository';
import type { PoliticianDetail } from './types';
import { toDetail } from './types';

export async function handleGetPolitician(id: string): Promise<PoliticianDetail | null> {
  const row = await getPolitician(id);
  return row ? toDetail(row) : null;
}
