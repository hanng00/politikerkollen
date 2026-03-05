/**
 * Hybrid search: semantic similarity + keyword matching, fused with RRF.
 *
 * Vector search stores the query embedding in a local temp table to avoid
 * issues with large inline array literals over the MotherDuck wire protocol.
 */

import { getConnection, query, escapeString } from '../../../utils/motherduck';
import { embeddingDimensions } from '../../../utils/models';
import type { SourceMatch } from './types';
import { DEFAULT_SIMILARITY_THRESHOLD, DEFAULT_RIKSMOTE_YEAR } from './types';

const COGNITION_SCHEMA = 'cognition';
const RRF_K = 60;

export interface HybridSearchOptions {
  embedding: number[];
  queryText: string;
  threshold?: number;
  limit?: number;
  riksmote_year?: number;
}

async function vectorSearch(
  embedding: number[],
  threshold: number,
  limit: number,
  riksmote_year: number,
): Promise<SourceMatch[]> {
  const conn = await getConnection();
  const embeddingLiteral = `[${embedding.join(',')}]::FLOAT[${embeddingDimensions}]`;

  await conn.run(`CREATE OR REPLACE TEMP TABLE _query_embedding AS SELECT ${embeddingLiteral} AS emb`);

  const sql = `
    SELECT 
      s.dok_id,
      s.titel,
      s.dok_typ,
      s.parti,
      s.intressent_ids,
      array_cosine_similarity(s.embedding, q.emb) as similarity
    FROM ${COGNITION_SCHEMA}.source_embeddings s, _query_embedding q
    WHERE s.riksmote_year = ${riksmote_year}
      AND array_cosine_similarity(s.embedding, q.emb) >= ${threshold}
    ORDER BY similarity DESC
    LIMIT ${limit}
  `;

  const reader = await conn.runAndReadAll(sql);
  return reader.getRowObjectsJson() as SourceMatch[];
}

async function keywordSearch(
  queryText: string,
  limit: number,
  riksmote_year: number,
): Promise<SourceMatch[]> {
  const keywords = queryText
    .toLowerCase()
    .split(/\s+/)
    .filter(w => w.length > 2);

  if (keywords.length === 0) return [];

  const conditions = keywords.map(kw => {
    const escaped = escapeString(kw);
    return `(LOWER(s.titel) LIKE '%${escaped}%' OR LOWER(s.content_text) LIKE '%${escaped}%')`;
  });

  const sql = `
    SELECT 
      s.dok_id,
      s.titel,
      s.dok_typ,
      s.parti,
      s.intressent_ids,
      0.0 as similarity
    FROM ${COGNITION_SCHEMA}.source_embeddings s
    WHERE s.riksmote_year = ${riksmote_year}
      AND (${conditions.join(' OR ')})
    LIMIT ${limit}
  `;

  const result = await query<SourceMatch>(sql);
  return result.data;
}

/**
 * Reciprocal Rank Fusion: merge two ranked result lists.
 * score(doc) = Σ 1/(k + rank_i) for each list the doc appears in.
 */
function reciprocalRankFusion(
  vectorResults: SourceMatch[],
  keywordResults: SourceMatch[],
  limit: number,
): SourceMatch[] {
  const scores = new Map<string, { match: SourceMatch; rrfScore: number }>();

  for (let i = 0; i < vectorResults.length; i++) {
    const m = vectorResults[i]!;
    const entry = scores.get(m.dok_id) ?? { match: m, rrfScore: 0 };
    entry.rrfScore += 1 / (RRF_K + i + 1);
    entry.match = m;
    scores.set(m.dok_id, entry);
  }

  for (let i = 0; i < keywordResults.length; i++) {
    const m = keywordResults[i]!;
    const entry = scores.get(m.dok_id) ?? { match: m, rrfScore: 0 };
    entry.rrfScore += 1 / (RRF_K + i + 1);
    scores.set(m.dok_id, entry);
  }

  return Array.from(scores.values())
    .sort((a, b) => b.rrfScore - a.rrfScore)
    .slice(0, limit)
    .map(({ match }) => match);
}

/**
 * Hybrid search: vector search first (needs temp table), then keyword in parallel-safe sequence, fused with RRF.
 */
export async function searchSources(options: HybridSearchOptions): Promise<SourceMatch[]> {
  const {
    embedding,
    queryText,
    threshold = DEFAULT_SIMILARITY_THRESHOLD,
    limit = 50,
    riksmote_year = DEFAULT_RIKSMOTE_YEAR,
  } = options;

  // Run sequentially: both use the shared MotherDuck connection,
  // and vectorSearch must create the temp table before its query runs.
  const vectorResults = await vectorSearch(embedding, threshold, limit, riksmote_year);
  const keywordResults = await keywordSearch(queryText, limit, riksmote_year);

  console.log('[search] vector:', vectorResults.length, 'keyword:', keywordResults.length);

  const fused = reciprocalRankFusion(vectorResults, keywordResults, limit);
  console.log('[search] fused:', fused.length);
  return fused;
}

// Backwards-compatible alias
export { searchSources as searchSourcesByEmbedding };
