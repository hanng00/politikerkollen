import logging
import uuid
from collections import defaultdict
from dataclasses import dataclass
from datetime import datetime, timezone
from typing import Any

import duckdb
import pyarrow as pa

from cognition.core.config import SCHEMA
from cognition.core.db import (
    ConnectionPool,
    ensure_columns_exist,
    ensure_schema_exists,
    table_exists,
)
from cognition.core.embedding import EmbeddingService
from cognition.modules.build_source_texts.repository import SOURCE_TEXTS_TABLE
from cognition.modules.extract_promises.models import CATEGORY_DESCRIPTIONS
from cognition.modules.match_promises.models import PromiseVoteMatch, get_match_columns

logger = logging.getLogger("cognition")

MATCHES_TABLE = f"{SCHEMA}.promise_vote_matches"
EMBEDDINGS_TABLE = f"{SCHEMA}.embeddings"
PROMISES_TABLE = f"{SCHEMA}.valmanifest_promises"

FTS_SCHEMA = f"fts_{SCHEMA}_source_texts"

RRF_K = 60
DEFAULT_MAX_PER_PROMISE = 50
DEFAULT_SIMILARITY_THRESHOLD = 0.4
DEFAULT_MIN_BM25_SCORE = 4.0


def expand_promise_for_retrieval(promise: dict[str, Any]) -> str:
    """Expand promise text with context for better retrieval.
    
    Adds category context and parliamentary vocabulary to bridge the semantic
    gap between short promise statements and verbose parliamentary documents.
    
    Args:
        promise: Dict with promise_text, category, party keys
        
    Returns:
        Expanded text optimized for embedding similarity with riksdag documents
    """
    text = promise.get("promise_text", "")
    category = promise.get("category", "")
    
    # Get category description for context
    category_desc = CATEGORY_DESCRIPTIONS.get(category, "")
    
    # Build expanded query with parliamentary context
    parts = []
    
    # Category framing
    if category_desc:
        parts.append(f"Politikområde: {category_desc}.")
    
    # The promise itself
    parts.append(f"Vallöfte: {text}")
    
    # Parliamentary vocabulary hints
    parts.append(
        "Relaterade riksdagsdokument: motion, proposition, utskottsbetänkande, "
        "yrkande, förslag, tillkännagivande."
    )
    
    return " ".join(parts)


@dataclass
class CandidatePool:
    """Configuration for which promises and sources to include in matching.

    Generates SQL filter fragments for the recall engine. The internal search
    functions (_vector_search, _keyword_search) accept these as raw SQL strings.

    Attributes:
        year: Election year filter (e.g., 2022). Filters promises by year and
              sources by the corresponding mandate period riksmöte years.
        source_dok_ids: Explicit allowlist of source document IDs. When set,
                        only these sources are searched (e.g., vote-linked sources).
        source_entity_type: Entity type for sources (default "source", future
                            support for "anforande").
    """

    year: int | None = None
    source_dok_ids: set[str] | None = None
    source_entity_type: str = "source"

    def promise_sql(self) -> str:
        """Generate SQL AND clause for filtering promise embeddings."""
        if not self.year:
            return ""
        return f"AND CAST(metadata->>'$.year' AS INTEGER) = {self.year}"

    def source_sql(self) -> str:
        """Generate SQL AND clause for filtering source embeddings."""
        clauses = []
        if self.year:
            years = _get_mandate_riksmote_years(self.year)
            years_sql = ", ".join(str(y) for y in years)
            clauses.append(
                f"AND CAST(metadata->>'$.riksmote_year' AS INTEGER) IN ({years_sql})"
            )
        if self.source_dok_ids is not None:
            ids = ", ".join(f"'{d}'" for d in self.source_dok_ids)
            clauses.append(f"AND entity_id IN ({ids})")
        return " ".join(clauses)


def get_vote_linked_source_ids(
    conn: duckdb.DuckDBPyConnection,
    year: int | None = None,
) -> set[str]:
    """Get source dok_ids that have at least one vote link.

    DEPRECATED: This function uses the removed int_vote_source_links model.
    The --vote-linked option is deprecated and will raise an error.

    Args:
        conn: DuckDB connection
        year: Filter by election year (uses mandate period riksmöte years)

    Returns:
        Set of source_dok_id values that have entries in int_vote_source_links

    Raises:
        RuntimeError: Always, since the underlying model has been removed.
    """
    raise RuntimeError(
        "The --vote-linked option is deprecated. The underlying int_vote_source_links "
        "model has been removed due to broken lineage. Use the default --no-vote-linked "
        "mode which matches against all sources and lets the LLM classifier decide relevance."
    )


def get_promise_parties(
    conn: duckdb.DuckDBPyConnection,
    promise_ids: set[str] | None = None,
) -> dict[str, str]:
    """Map promise_id → party_id from the embeddings table metadata.

    Args:
        conn: DuckDB connection
        promise_ids: Optional set of promise IDs to filter

    Returns:
        Dict mapping promise_id to its party abbreviation (lowercase)
    """
    id_filter = ""
    if promise_ids:
        ids = ", ".join(f"'{pid}'" for pid in promise_ids)
        id_filter = f"AND entity_id IN ({ids})"

    rows = conn.execute(f"""
        SELECT entity_id, lower(metadata->>'$.party') as party
        FROM {EMBEDDINGS_TABLE}
        WHERE entity_type = 'promise'
        {id_filter}
    """).fetchall()

    return {row[0]: row[1] for row in rows if row[1]}


def get_source_voting_parties(
    conn: duckdb.DuckDBPyConnection,
    source_dok_ids: set[str],
) -> dict[str, set[str]]:
    """Map source_dok_id → set of parties that actually cast votes on it.

    DEPRECATED: This function uses the removed int_vote_source_links model.
    The --party-filter option is deprecated and will raise an error.

    Args:
        conn: DuckDB connection
        source_dok_ids: Source document IDs to check

    Returns:
        Dict mapping source_dok_id to the set of party abbreviations that voted

    Raises:
        RuntimeError: Always, since the underlying model has been removed.
    """
    raise RuntimeError(
        "The --party-filter option is deprecated. The underlying int_vote_source_links "
        "model has been removed due to broken lineage. Use the default mode which "
        "matches against all sources and lets the LLM classifier decide relevance."
    )


def filter_by_party_votes(
    matches: list[dict[str, Any]],
    promise_parties: dict[str, str],
    source_voting_parties: dict[str, set[str]],
) -> list[dict[str, Any]]:
    """Drop matches where the promising party didn't vote on the source.

    This is a post-retrieval filter that runs after vector/BM25 recall
    but before LLM classification, avoiding wasted API calls.

    Args:
        matches: Raw matches from find_matches()
        promise_parties: promise_id → party_id mapping
        source_voting_parties: source_dok_id → {parties that voted}

    Returns:
        Filtered matches where the promising party actually voted
    """
    filtered = []
    dropped = 0
    for match in matches:
        party = promise_parties.get(match["promise_id"])
        voting_parties = source_voting_parties.get(match["source_dok_id"], set())
        if party and party in voting_parties:
            filtered.append(match)
        else:
            dropped += 1

    logger.info(
        f"Party-vote filter: kept {len(filtered)}, dropped {dropped} "
        f"(party had no vote on source)"
    )
    return filtered


def ensure_tables_exist(conn: duckdb.DuckDBPyConnection) -> None:
    """Create the matches table if it doesn't exist, and add any missing columns."""
    ensure_schema_exists(conn, SCHEMA)

    match_columns = get_match_columns()
    match_columns_sql = ",\n            ".join(
        f"{name} {sql_type}" for name, sql_type in match_columns
    )
    conn.execute(f"""
        CREATE TABLE IF NOT EXISTS {MATCHES_TABLE} (
            {match_columns_sql},
            UNIQUE (promise_id, source_dok_id)
        )
    """)

    ensure_columns_exist(conn, MATCHES_TABLE, match_columns)

    try:
        conn.execute(f"""
            ALTER TABLE {MATCHES_TABLE}
            ADD CONSTRAINT uq_promise_source UNIQUE (promise_id, source_dok_id)
        """)
    except duckdb.Error:
        pass


def ensure_fts_index(conn: duckdb.DuckDBPyConnection) -> None:
    """Create or rebuild the FTS index on source_texts for BM25 keyword search."""
    logger.info("Creating FTS index on source_texts...")
    try:
        conn.execute("INSTALL fts; LOAD fts;")
    except duckdb.Error:
        pass

    try:
        conn.execute(f"PRAGMA drop_fts_index('{SOURCE_TEXTS_TABLE}')")
        logger.info("Dropped existing FTS index")
    except duckdb.Error:
        pass

    conn.execute(f"""
        PRAGMA create_fts_index(
            '{SOURCE_TEXTS_TABLE}',
            'dok_id',
            'full_text'
        )
    """)
    logger.info("FTS index created on source_texts.")


def _get_mandate_riksmote_years(election_year: int) -> list[int]:
    """Get riksmöte years for a mandate period.

    Election year 2022 → mandate period 2022-2026 → riksmöte years [2022, 2023, 2024, 2025]
    """
    return list(range(election_year, election_year + 4))


def _fetch_promises(
    conn: duckdb.DuckDBPyConnection,
    pool: "CandidatePool",
    limit: int | None = None,
    exclude_matched: bool = True,
) -> list[dict[str, Any]]:
    """Fetch promises with metadata for on-the-fly embedding.
    
    Args:
        conn: DuckDB connection
        pool: CandidatePool for filtering
        limit: Max promises to fetch
        exclude_matched: If True, skip promises that already have matches in the database
    """
    year_filter = ""
    if pool.year:
        year_filter = f"AND year = {pool.year}"
    
    exclude_clause = ""
    if exclude_matched:
        exclude_clause = f"""
            AND promise_id NOT IN (
                SELECT DISTINCT promise_id FROM {MATCHES_TABLE}
            )
        """
    
    limit_clause = f"LIMIT {limit}" if limit else ""
    
    query = f"""
        SELECT 
            promise_id,
            promise_text,
            category,
            party_id as party
        FROM {PROMISES_TABLE}
        WHERE promise_text IS NOT NULL
        {year_filter}
        {exclude_clause}
        {limit_clause}
    """
    rows = conn.execute(query).fetchall()
    return [
        {
            "promise_id": row[0],
            "promise_text": row[1],
            "category": row[2],
            "party": row[3],
        }
        for row in rows
    ]


def _vector_search_onthefly(
    conn: duckdb.DuckDBPyConnection,
    promises: list[dict[str, Any]],
    similarity_threshold: float,
    max_per_promise: int,
    year_filter_source: str,
    embedding_service: EmbeddingService | None = None,
) -> list[dict[str, Any]]:
    """Vector similarity search with on-the-fly promise embedding.
    
    Instead of using pre-computed promise embeddings, this:
    1. Expands promise text with category context and parliamentary vocabulary
    2. Embeds the expanded text on-the-fly
    3. Compares against pre-embedded source chunks
    
    This allows experimenting with different promise representations without
    re-running the embedding pipeline.
    
    Processes one promise at a time to avoid OOM on MotherDuck's memory limits.
    Without HNSW indexes (not supported on MotherDuck), brute-force similarity
    requires O(n) comparisons per promise, but doing them sequentially avoids
    materializing the full cross-product in memory.
    """
    if not promises:
        return []
    
    if embedding_service is None:
        embedding_service = EmbeddingService()
    
    # Expand and embed promises on-the-fly
    logger.info(f"Expanding and embedding {len(promises)} promises on-the-fly...")
    expanded_texts = [expand_promise_for_retrieval(p) for p in promises]
    embedding_results = embedding_service.embed_texts(expanded_texts)
    
    # Build promise_id -> embedding mapping
    promise_embeddings = [
        (p["promise_id"], result.embedding)
        for p, result in zip(promises, embedding_results)
    ]
    
    logger.info(f"Embedded {len(promise_embeddings)} promises, searching against sources...")
    
    # Process one promise at a time to avoid OOM
    # This runs N queries instead of one massive cross join
    all_results = []
    
    for i, (promise_id, embedding) in enumerate(promise_embeddings):
        if (i + 1) % 10 == 0 or i == len(promise_embeddings) - 1:
            logger.info(f"Processing promise {i + 1}/{len(promise_embeddings)}...")
        
        # Query for this single promise against all source chunks
        query = f"""
            WITH source_chunks AS (
                SELECT 
                    entity_id as dok_id,
                    embedding,
                    chunk_text
                FROM {EMBEDDINGS_TABLE}
                WHERE entity_type = 'source'
                {year_filter_source}
            ),
            chunk_similarities AS (
                SELECT
                    dok_id as source_dok_id,
                    chunk_text,
                    array_cosine_similarity($1::FLOAT[1536], embedding) as chunk_similarity
                FROM source_chunks
                WHERE array_cosine_similarity($1::FLOAT[1536], embedding) >= {similarity_threshold}
            ),
            aggregated AS (
                SELECT
                    source_dok_id,
                    MAX(chunk_similarity) as similarity_score,
                    FIRST(chunk_text ORDER BY chunk_similarity DESC) as best_chunk_text
                FROM chunk_similarities
                GROUP BY source_dok_id
            )
            SELECT source_dok_id, similarity_score, best_chunk_text
            FROM aggregated
            ORDER BY similarity_score DESC
            LIMIT {max_per_promise}
        """
        
        result = conn.execute(query, [embedding]).fetchall()
        
        all_results.extend([
            {
                "promise_id": promise_id,
                "source_dok_id": row[0],
                "similarity_score": row[1],
                "best_chunk_text": row[2],
            }
            for row in result
        ])
    
    return all_results


def _build_bm25_query(
    promise_text: str,
    max_per_promise: int,
    year_filter_source: str,
    min_bm25_score: float = 0.0,
) -> str:
    """Build BM25 search query against full document text."""
    escaped_text = promise_text.replace("'", "''")
    score_filter = f"AND bm25_score >= {min_bm25_score}" if min_bm25_score > 0 else ""

    year_clause = ""
    if year_filter_source:
        year_clause = year_filter_source.replace(
            "CAST(metadata->>'$.riksmote_year' AS INTEGER)",
            "riksmote_year",
        ).replace("AND entity_id IN", "AND dok_id IN")

    return f"""
        SELECT
            dok_id,
            titel,
            {FTS_SCHEMA}.match_bm25(dok_id, '{escaped_text}') as bm25_score
        FROM {SOURCE_TEXTS_TABLE}
        WHERE {FTS_SCHEMA}.match_bm25(dok_id, '{escaped_text}') IS NOT NULL
        {score_filter}
        {year_clause}
        ORDER BY bm25_score DESC
        LIMIT {max_per_promise}
    """


def _keyword_search(
    conn: duckdb.DuckDBPyConnection,
    max_per_promise: int,
    year_filter_promise: str,
    year_filter_source: str,
    limit_clause: str = "",
    max_workers: int = 8,
    min_bm25_score: float = 0.0,
) -> list[dict[str, Any]]:
    """BM25 keyword search leg of hybrid retrieval.

    Uses DuckDB's FTS extension for proper BM25 scoring. This naturally handles
    TF-IDF weighting and document length normalization — no manual stopwords needed.

    Parallelizes queries across a pool of reusable connections.
    """
    from concurrent.futures import ThreadPoolExecutor, as_completed

    promises_query = f"""
        SELECT entity_id as promise_id, metadata->>'$.promise_text' as promise_text
        FROM {EMBEDDINGS_TABLE}
        WHERE entity_type = 'promise'
        {year_filter_promise}
        {limit_clause}
    """
    promises = [
        (pid, ptext) for pid, ptext in conn.execute(promises_query).fetchall() if ptext
    ]

    if not promises:
        return []

    logger.info(
        f"Running BM25 search for {len(promises)} promises with {max_workers} workers..."
    )

    pool = ConnectionPool(size=max_workers)

    def init_fts(c: duckdb.DuckDBPyConnection) -> None:
        c.execute("INSTALL fts; LOAD fts;")
        c.execute("SET scalar_subquery_error_on_multiple_rows=false")

    pool.setup(init_fts)

    # Verify FTS index is accessible from pool connections
    with pool.connection() as test_conn:
        try:
            test_conn.execute(
                f"SELECT * FROM information_schema.schemata WHERE schema_name = '{FTS_SCHEMA}'"
            ).fetchall()
            logger.info(f"FTS schema '{FTS_SCHEMA}' verified on pool connections")
        except duckdb.Error as e:
            logger.warning(
                f"FTS schema '{FTS_SCHEMA}' not found on pool connections: {e}"
            )
            # List available FTS schemas for debugging
            try:
                schemas = test_conn.execute(
                    "SELECT schema_name FROM information_schema.schemata WHERE schema_name LIKE 'fts_%'"
                ).fetchall()
                logger.info(f"Available FTS schemas: {[s[0] for s in schemas]}")
            except duckdb.Error:
                pass

    def search_promise(promise_id: str, promise_text: str) -> list[dict[str, Any]]:
        query = _build_bm25_query(
            promise_text, max_per_promise, year_filter_source, min_bm25_score
        )
        with pool.connection() as thread_conn:
            try:
                result = thread_conn.execute(query).fetchall()
            except duckdb.Error as e:
                logger.warning(
                    f"BM25 query failed for promise {promise_id[:8]}...: {e}"
                )
                return []

        return [
            {
                "promise_id": promise_id,
                "source_dok_id": row[0],
                "bm25_score": row[2],
            }
            for row in result
        ]

    all_matches: list[dict[str, Any]] = []
    completed = 0

    try:
        with ThreadPoolExecutor(max_workers=max_workers) as executor:
            futures = {
                executor.submit(search_promise, pid, ptext): pid
                for pid, ptext in promises
            }

            for future in as_completed(futures):
                completed += 1
                if completed % 50 == 0:
                    logger.info(
                        f"  BM25 progress: {completed}/{len(promises)} promises searched..."
                    )

                all_matches.extend(future.result())
    finally:
        pool.close()

    logger.info(
        f"  BM25 search complete: {len(all_matches)} matches from {len(promises)} promises"
    )
    return all_matches


def _reciprocal_rank_fusion(
    vector_results: list[dict[str, Any]],
    keyword_results: list[dict[str, Any]],
    max_per_promise: int,
) -> list[dict[str, Any]]:
    """Merge vector and keyword results using Reciprocal Rank Fusion.

    BM25 acts as a boost: only sources already found by vector search
    get keyword rank contributions. BM25-only hits are discarded.
    """
    by_promise_vector: dict[str, list[dict]] = defaultdict(list)
    by_promise_keyword: dict[str, list[dict]] = defaultdict(list)

    for m in vector_results:
        by_promise_vector[m["promise_id"]].append(m)
    for m in keyword_results:
        by_promise_keyword[m["promise_id"]].append(m)

    fused_results = []
    bm25_boosts = 0

    for promise_id in by_promise_vector:
        scores: dict[str, dict] = {}

        vector_list = by_promise_vector[promise_id]
        for rank, m in enumerate(vector_list):
            dok_id = m["source_dok_id"]
            if dok_id not in scores:
                scores[dok_id] = {
                    "promise_id": promise_id,
                    "source_dok_id": dok_id,
                    "similarity_score": m["similarity_score"],
                    "best_chunk_text": m["best_chunk_text"],
                    "rrf_score": 0.0,
                }
            scores[dok_id]["rrf_score"] += 1 / (RRF_K + rank + 1)
            if m["similarity_score"] > scores[dok_id]["similarity_score"]:
                scores[dok_id]["similarity_score"] = m["similarity_score"]
                scores[dok_id]["best_chunk_text"] = m["best_chunk_text"]

        keyword_list = by_promise_keyword.get(promise_id, [])
        for rank, m in enumerate(keyword_list):
            dok_id = m["source_dok_id"]
            if dok_id in scores:
                scores[dok_id]["rrf_score"] += 1 / (RRF_K + rank + 1)
                bm25_boosts += 1

        sorted_matches = sorted(
            scores.values(), key=lambda x: x["rrf_score"], reverse=True
        )
        fused_results.extend(sorted_matches[:max_per_promise])

    logger.info(
        f"RRF fusion: {len(fused_results)} results, {bm25_boosts} BM25 boosts applied"
    )
    return fused_results


def find_matches(
    conn: duckdb.DuckDBPyConnection,
    similarity_threshold: float = DEFAULT_SIMILARITY_THRESHOLD,
    max_per_promise: int = DEFAULT_MAX_PER_PROMISE,
    pool: CandidatePool | None = None,
    enable_keyword: bool = False,
    limit: int | None = None,
    min_bm25_score: float = DEFAULT_MIN_BM25_SCORE,
    full_refresh: bool = False,
) -> list[dict[str, Any]]:
    """
    Find matches between promises and source documents.

    Embeds promises on-the-fly with context expansion for better retrieval quality.
    Optionally adds BM25 keyword search (via DuckDB FTS extension) with RRF fusion.

    Args:
        conn: DuckDB connection
        similarity_threshold: Minimum cosine similarity score for vector search (0-1)
        max_per_promise: Maximum number of matches per promise (safety cap)
        pool: CandidatePool configuration for filtering promises and sources.
              If None, searches all promises against all sources.
        enable_keyword: Enable BM25 keyword search leg with RRF fusion
        limit: Limit number of promises to process (for testing)
        min_bm25_score: Minimum BM25 score threshold for keyword search (0 = no threshold)
        full_refresh: If True, process all promises. If False, skip already-matched promises.

    Returns:
        List of match dicts with promise_id, source_dok_id, similarity_score, best_chunk_text
    """
    if not table_exists(conn, EMBEDDINGS_TABLE):
        return []

    if pool is None:
        pool = CandidatePool()

    year_filter_source = pool.source_sql()

    # Fetch and embed promises on-the-fly with context expansion
    logger.info("Fetching promises for on-the-fly embedding...")
    promises = _fetch_promises(conn, pool, limit=limit, exclude_matched=not full_refresh)
    
    if not promises:
        logger.warning("No promises found to match (all may already be processed)")
        return []
    
    logger.info("Running vector similarity search...")
    vector_results = _vector_search_onthefly(
        conn,
        promises,
        similarity_threshold,
        max_per_promise,
        year_filter_source,
    )
    
    logger.info(f"Vector search complete: {len(vector_results)} matches")

    if not enable_keyword:
        return vector_results

    if not table_exists(conn, SOURCE_TEXTS_TABLE):
        logger.warning(
            f"{SOURCE_TEXTS_TABLE} not found — run 'embed-sources' first. "
            "Skipping BM25 boost."
        )
        return vector_results

    ensure_fts_index(conn)

    year_filter_promise = pool.promise_sql()
    limit_clause = f"LIMIT {limit}" if limit else ""
    
    keyword_results = _keyword_search(
        conn,
        max_per_promise,
        year_filter_promise,
        year_filter_source,
        limit_clause,
        min_bm25_score=min_bm25_score,
    )
    logger.info(
        f"Vector: {len(vector_results)} matches, BM25: {len(keyword_results)} matches"
    )

    logger.info("Fusing results with RRF...")
    fused = _reciprocal_rank_fusion(vector_results, keyword_results, max_per_promise)
    logger.info(f"RRF fusion complete: {len(fused)} matches")

    return fused


def save_matches(
    conn: duckdb.DuckDBPyConnection,
    matches: list[dict[str, Any]],
    alignments: dict[str, Any] | None = None,
) -> int:
    """Save promise-source matches with upsert semantics.

    Uses INSERT OR REPLACE on the (promise_id, source_dok_id) unique constraint.
    Re-running the pipeline for the same promises safely overwrites previous results.

    Args:
        conn: DuckDB connection
        matches: List of match dicts with promise_id, source_dok_id, similarity_score
        alignments: Optional dict mapping match_id -> AlignmentResult

    Returns:
        Number of matches saved
    """
    if not matches:
        return 0

    ensure_tables_exist(conn)
    matched_at = datetime.now(timezone.utc)
    alignments = alignments or {}

    validated: list[PromiseVoteMatch] = []
    for match in matches:
        match_id = str(uuid.uuid4())
        temp_id = f"{match['promise_id']}_{match['source_dok_id']}"
        alignment = alignments.get(match_id) or alignments.get(temp_id)

        validated.append(
            PromiseVoteMatch(
                match_id=match_id,
                promise_id=match["promise_id"],
                source_dok_id=match["source_dok_id"],
                similarity_score=match["similarity_score"],
                matched_at=matched_at,
                alignment=alignment.alignment if alignment else None,
                alignment_confidence=alignment.confidence if alignment else None,
                alignment_rationale=alignment.rationale if alignment else None,
            )
        )

    rows = [m.model_dump() for m in validated]
    columns = [
        "match_id",
        "promise_id",
        "source_dok_id",
        "similarity_score",
        "matched_at",
        "alignment",
        "alignment_confidence",
        "alignment_rationale",
    ]
    table = pa.table({col: [row[col] for row in rows] for col in columns})
    conn.register("_match_batch", table)
    conn.execute(f"""
        INSERT OR REPLACE INTO {MATCHES_TABLE}
        (match_id, promise_id, source_dok_id, similarity_score, matched_at,
         alignment, alignment_confidence, alignment_rationale)
        SELECT
            match_id, promise_id, source_dok_id, similarity_score, matched_at,
            alignment, alignment_confidence, alignment_rationale
        FROM _match_batch
    """)
    conn.unregister("_match_batch")
    return len(matches)


def update_alignments(
    conn: duckdb.DuckDBPyConnection,
    alignments: dict[str, Any],
) -> int:
    """Update alignment classifications for existing matches.

    Uses a temp table + single UPDATE for batch efficiency.

    Args:
        conn: DuckDB connection
        alignments: Dict mapping match_id -> AlignmentResult

    Returns:
        Number of matches updated
    """
    if not alignments:
        return 0

    rows = [
        (match_id, a.alignment, a.confidence, a.rationale)
        for match_id, a in alignments.items()
    ]

    conn.execute("""
        CREATE OR REPLACE TEMP TABLE _alignment_updates (
            match_id VARCHAR,
            alignment VARCHAR,
            confidence DOUBLE,
            rationale VARCHAR
        )
    """)

    conn.executemany("INSERT INTO _alignment_updates VALUES (?, ?, ?, ?)", rows)

    conn.execute(f"""
        UPDATE {MATCHES_TABLE} m
        SET alignment = u.alignment,
            alignment_confidence = u.confidence,
            alignment_rationale = u.rationale
        FROM _alignment_updates u
        WHERE m.match_id = u.match_id
    """)

    conn.execute("DROP TABLE IF EXISTS _alignment_updates")
    logger.info(f"Batch-updated {len(rows)} alignments")
    return len(rows)


def clear_matches(
    conn: duckdb.DuckDBPyConnection, pool: CandidatePool | None = None
) -> int:
    """Clear existing matches (for re-computation).

    Args:
        conn: DuckDB connection
        pool: If provided with a year, only clear matches for promises from that election year
    """
    try:
        year = pool.year if pool else None
        if year:
            count = conn.execute(
                f"""
                SELECT COUNT(*) FROM {MATCHES_TABLE} m
                JOIN {PROMISES_TABLE} p ON m.promise_id = p.promise_id
                WHERE p.year = {year}
                """
            ).fetchone()[0]
            conn.execute(
                f"""
                DELETE FROM {MATCHES_TABLE}
                WHERE promise_id IN (
                    SELECT promise_id FROM {PROMISES_TABLE} WHERE year = {year}
                )
                """
            )
        else:
            count = conn.execute(f"SELECT COUNT(*) FROM {MATCHES_TABLE}").fetchone()[0]
            conn.execute(f"DELETE FROM {MATCHES_TABLE}")
        return count
    except duckdb.CatalogException:
        return 0


def get_counts(
    conn: duckdb.DuckDBPyConnection, pool: CandidatePool | None = None
) -> dict[str, int]:
    """Get counts of embeddings and matches.

    Args:
        conn: DuckDB connection
        pool: CandidatePool for filtering. Uses year for promise/source counts,
              and source_dok_ids for filtered source count if provided.
    """
    counts = {}

    if pool is None:
        pool = CandidatePool()

    promise_filter = pool.promise_sql()
    source_filter = pool.source_sql()

    try:
        counts["promise_embeddings"] = conn.execute(
            f"""
            SELECT COUNT(DISTINCT entity_id) FROM {EMBEDDINGS_TABLE}
            WHERE entity_type = 'promise'
            {promise_filter}
            """
        ).fetchone()[0]
    except duckdb.CatalogException:
        counts["promise_embeddings"] = 0

    try:
        counts["source_embeddings"] = conn.execute(
            f"""
            SELECT COUNT(DISTINCT entity_id) FROM {EMBEDDINGS_TABLE}
            WHERE entity_type = 'source'
            {source_filter}
            """
        ).fetchone()[0]
    except duckdb.CatalogException:
        counts["source_embeddings"] = 0

    try:
        year = pool.year
        if year:
            counts["matches"] = conn.execute(
                f"""
                SELECT COUNT(*) FROM {MATCHES_TABLE} m
                JOIN {PROMISES_TABLE} p ON m.promise_id = p.promise_id
                WHERE p.year = {year}
                """
            ).fetchone()[0]
        else:
            counts["matches"] = conn.execute(
                f"SELECT COUNT(*) FROM {MATCHES_TABLE}"
            ).fetchone()[0]
    except duckdb.CatalogException:
        counts["matches"] = 0

    return counts
