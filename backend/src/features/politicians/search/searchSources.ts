/**
 * Search sources by semantic similarity to query embedding
 */

import { query } from '../../../utils/motherduck';
import type { SourceMatch } from './types';
import { DEFAULT_SIMILARITY_THRESHOLD, DEFAULT_RIKSMOTE_YEAR } from './types';

const COGNITION_SCHEMA = 'cognition';

export interface SearchSourcesOptions {
  embedding: number[];
  threshold?: number;
  limit?: number;
  riksmote_year?: number;
}

/**
 * Search source_embeddings table by vector similarity
 * Returns matching documents with their similarity scores
 */
export async function searchSourcesByEmbedding(
  options: SearchSourcesOptions
): Promise<SourceMatch[]> {
  const {
    embedding,
    threshold = DEFAULT_SIMILARITY_THRESHOLD,
    limit = 50,
    riksmote_year = DEFAULT_RIKSMOTE_YEAR,
  } = options;

  const embeddingArray = `[${embedding.join(',')}]::FLOAT[1536]`;

  const sql = `
    SELECT 
      dok_id,
      titel,
      dok_typ,
      parti,
      intressent_ids,
      array_cosine_similarity(embedding, ${embeddingArray}) as similarity
    FROM ${COGNITION_SCHEMA}.source_embeddings
    WHERE riksmote_year = ${riksmote_year}
      AND array_cosine_similarity(embedding, ${embeddingArray}) >= ${threshold}
    ORDER BY similarity DESC
    LIMIT ${limit}
  `;

  console.log('[searchSourcesByEmbedding] Executing search with threshold:', threshold);
  const result = await query<{
    dok_id: string;
    titel: string;
    dok_typ: 'mot' | 'prop';
    parti: string | null;
    intressent_ids: string[] | null;
    similarity: number;
  }>(sql);

  console.log('[searchSourcesByEmbedding] Found matches:', result.data.length);
  return result.data;
}
