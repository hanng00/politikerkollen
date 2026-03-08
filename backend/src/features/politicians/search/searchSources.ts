/**
 * Hybrid search: semantic similarity + keyword matching, fused with RRF.
 *
 * Uses the unified embeddings table with chunk aggregation.
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

/**
 * Vector search with chunk aggregation.
 * Searches the unified embeddings table and aggregates chunk scores by entity.
 */
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
    WITH candidates AS (
      SELECT e.entity_id, e.chunk_text, e.metadata, e.embedding
      FROM ${COGNITION_SCHEMA}.embeddings e
      WHERE e.entity_type = 'source'
        AND CAST(json_extract_string(e.metadata, '$.riksmote_year') AS INTEGER) = ${riksmote_year}
    ),
    scored AS (
      SELECT
        c.entity_id as dok_id,
        c.chunk_text,
        c.metadata,
        array_cosine_similarity(c.embedding, q.emb) as similarity
      FROM candidates c, _query_embedding q
      WHERE array_cosine_similarity(c.embedding, q.emb) >= ${threshold}
    ),
    ranked AS (
      SELECT
        dok_id,
        chunk_text,
        metadata,
        similarity,
        ROW_NUMBER() OVER (PARTITION BY dok_id ORDER BY similarity DESC) as rn
      FROM scored
    )
    SELECT
      dok_id,
      json_extract_string(metadata, '$.titel') as titel,
      json_extract_string(metadata, '$.dok_typ') as dok_typ,
      json_extract_string(metadata, '$.parti') as parti,
      CASE
        WHEN json_extract(metadata, '$.intressent_ids') IS NOT NULL
          AND json_extract_string(metadata, '$.intressent_ids') != 'null'
        THEN json_extract(metadata, '$.intressent_ids')
        ELSE NULL
      END as intressent_ids,
      similarity,
      chunk_text as best_chunk_text
    FROM ranked
    WHERE rn = 1
    ORDER BY similarity DESC
    LIMIT ${limit}
  `;

  const reader = await conn.runAndReadAll(sql);
  const rows = reader.getRowObjectsJson() as Array<{
    dok_id: string;
    titel: string;
    dok_typ: string;
    parti: string | null;
    intressent_ids: string | null;
    similarity: number;
    best_chunk_text: string;
  }>;

  return rows.map(row => ({
    dok_id: row.dok_id,
    titel: row.titel,
    dok_typ: row.dok_typ as 'mot' | 'prop',
    parti: row.parti,
    intressent_ids: row.intressent_ids ? JSON.parse(row.intressent_ids) : null,
    similarity: row.similarity,
    best_chunk_text: row.best_chunk_text,
  }));
}

/**
 * Keyword search on chunk text.
 * Searches across all chunks and aggregates by entity.
 */
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
    return `(LOWER(json_extract_string(e.metadata, '$.titel')) LIKE '%${escaped}%' OR LOWER(e.chunk_text) LIKE '%${escaped}%')`;
  });

  const sql = `
    WITH matching_chunks AS (
      SELECT
        e.entity_id as dok_id,
        json_extract_string(e.metadata, '$.titel') as titel,
        json_extract_string(e.metadata, '$.dok_typ') as dok_typ,
        json_extract_string(e.metadata, '$.parti') as parti,
        json_extract(e.metadata, '$.intressent_ids') as intressent_ids_json,
        e.chunk_text,
        ROW_NUMBER() OVER (PARTITION BY e.entity_id ORDER BY e.chunk_index) as rn
      FROM ${COGNITION_SCHEMA}.embeddings e
      WHERE e.entity_type = 'source'
        AND CAST(json_extract_string(e.metadata, '$.riksmote_year') AS INTEGER) = ${riksmote_year}
        AND (${conditions.join(' OR ')})
    )
    SELECT DISTINCT ON (dok_id)
      dok_id,
      titel,
      dok_typ,
      parti,
      CASE 
        WHEN intressent_ids_json IS NOT NULL AND CAST(intressent_ids_json AS VARCHAR) != 'null'
        THEN intressent_ids_json
        ELSE NULL
      END as intressent_ids,
      0.0 as similarity,
      chunk_text as best_chunk_text
    FROM matching_chunks
    WHERE rn = 1
    LIMIT ${limit}
  `;

  const result = await query<{
    dok_id: string;
    titel: string;
    dok_typ: string;
    parti: string | null;
    intressent_ids: string | null;
    similarity: number;
    best_chunk_text: string;
  }>(sql);

  return result.data.map(row => ({
    dok_id: row.dok_id,
    titel: row.titel,
    dok_typ: row.dok_typ as 'mot' | 'prop',
    parti: row.parti,
    intressent_ids: row.intressent_ids ? JSON.parse(row.intressent_ids) : null,
    similarity: row.similarity,
    best_chunk_text: row.best_chunk_text,
  }));
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

  const vectorResults = await vectorSearch(embedding, threshold, limit, riksmote_year);
  const keywordResults = await keywordSearch(queryText, limit, riksmote_year);

  console.log('[search] vector:', vectorResults.length, 'keyword:', keywordResults.length);

  const fused = reciprocalRankFusion(vectorResults, keywordResults, limit);
  console.log('[search] fused:', fused.length);
  return fused;
}

export { searchSources as searchSourcesByEmbedding };
