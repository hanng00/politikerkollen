"""Database operations for promise-source matching.

Matches manifesto promises against source documents (motions and propositions)
using hybrid retrieval (vector similarity + keyword search) with RRF fusion.
Uses the unified embeddings table with chunk aggregation.
"""

import re
import uuid
from collections import defaultdict
from datetime import datetime, timezone
from typing import Any

import duckdb

from cognition.core.config import SCHEMA
from cognition.core.db import ensure_schema_exists, table_exists
from cognition.matching.models import get_match_columns

MATCHES_TABLE = f"{SCHEMA}.promise_vote_matches"
EMBEDDINGS_TABLE = f"{SCHEMA}.embeddings"
PROMISES_TABLE = f"{SCHEMA}.valmanifest_promises"

RRF_K = 60
DEFAULT_MAX_PER_PROMISE = 50
DEFAULT_SIMILARITY_THRESHOLD = 0.6

SWEDISH_STOPWORDS = {
    "och", "att", "det", "som", "en", "ett", "av", "för", "med", "till",
    "den", "de", "är", "på", "var", "har", "om", "inte", "kan", "ska",
    "vi", "från", "eller", "men", "så", "alla", "vara", "sig", "också",
    "efter", "vid", "nu", "när", "där", "hur", "mer", "ut", "upp", "in",
    "över", "under", "genom", "mellan", "utan", "inom", "mot", "hos",
}


def ensure_tables_exist(conn: duckdb.DuckDBPyConnection) -> None:
    """Create the matches table if it doesn't exist."""
    ensure_schema_exists(conn, SCHEMA)

    match_columns = get_match_columns()
    match_columns_sql = ",\n            ".join(
        f"{name} {sql_type}" for name, sql_type in match_columns
    )
    conn.execute(f"""
        CREATE TABLE IF NOT EXISTS {MATCHES_TABLE} (
            {match_columns_sql}
        )
    """)


def _get_mandate_riksmote_years(election_year: int) -> list[int]:
    """Get riksmöte years for a mandate period.
    
    Election year 2022 → mandate period 2022-2026 → riksmöte years [2022, 2023, 2024, 2025]
    """
    return list(range(election_year, election_year + 4))


def _extract_keywords(text: str) -> list[str]:
    """Extract keywords from text for keyword search."""
    words = re.findall(r"\b\w+\b", text.lower())
    return [w for w in words if len(w) > 2 and w not in SWEDISH_STOPWORDS]


def _escape_sql_string(s: str) -> str:
    """Escape single quotes for SQL LIKE patterns."""
    return s.replace("'", "''")


def _vector_search(
    conn: duckdb.DuckDBPyConnection,
    similarity_threshold: float,
    max_per_promise: int,
    year_filter_promise: str,
    year_filter_source: str,
) -> list[dict[str, Any]]:
    """Vector similarity search leg of hybrid retrieval."""
    query = f"""
        WITH promise_embeddings AS (
            SELECT 
                entity_id as promise_id,
                embedding
            FROM {EMBEDDINGS_TABLE}
            WHERE entity_type = 'promise'
            {year_filter_promise}
        ),
        source_chunks AS (
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
                p.promise_id,
                s.dok_id as source_dok_id,
                s.chunk_text,
                array_cosine_similarity(p.embedding, s.embedding) as chunk_similarity
            FROM promise_embeddings p
            CROSS JOIN source_chunks s
            WHERE array_cosine_similarity(p.embedding, s.embedding) >= {similarity_threshold}
        ),
        aggregated_similarities AS (
            SELECT
                promise_id,
                source_dok_id,
                MAX(chunk_similarity) as similarity_score,
                FIRST(chunk_text ORDER BY chunk_similarity DESC) as best_chunk_text
            FROM chunk_similarities
            GROUP BY promise_id, source_dok_id
        ),
        ranked_matches AS (
            SELECT
                promise_id,
                source_dok_id,
                similarity_score,
                best_chunk_text,
                ROW_NUMBER() OVER (
                    PARTITION BY promise_id
                    ORDER BY similarity_score DESC
                ) as rank
            FROM aggregated_similarities
        )
        SELECT promise_id, source_dok_id, similarity_score, best_chunk_text
        FROM ranked_matches
        WHERE rank <= {max_per_promise}
        ORDER BY promise_id, similarity_score DESC
    """
    result = conn.execute(query).fetchall()
    return [
        {
            "promise_id": row[0],
            "source_dok_id": row[1],
            "similarity_score": row[2],
            "best_chunk_text": row[3],
        }
        for row in result
    ]


def _keyword_search(
    conn: duckdb.DuckDBPyConnection,
    max_per_promise: int,
    year_filter_promise: str,
    year_filter_source: str,
) -> list[dict[str, Any]]:
    """Keyword search leg of hybrid retrieval.
    
    Searches both title and chunk text. Uses a two-phase approach:
    1. Single query to find all sources matching any keyword from any promise
    2. Python-side association of sources to specific promises
    """
    promises_query = f"""
        SELECT entity_id as promise_id, metadata->>'$.promise_text' as promise_text
        FROM {EMBEDDINGS_TABLE}
        WHERE entity_type = 'promise'
        {year_filter_promise}
    """
    promises = conn.execute(promises_query).fetchall()
    
    if not promises:
        return []
    
    all_keywords: dict[str, list[str]] = {}
    for promise_id, promise_text in promises:
        if promise_text:
            keywords = _extract_keywords(promise_text)[:5]
            if keywords:
                all_keywords[promise_id] = keywords
    
    if not all_keywords:
        return []
    
    unique_keywords = set()
    for kws in all_keywords.values():
        unique_keywords.update(kws)
    
    if not unique_keywords:
        return []
    
    keyword_list = list(unique_keywords)[:30]
    
    title_conditions = " OR ".join(
        f"LOWER(titel) LIKE '%{_escape_sql_string(kw)}%'"
        for kw in keyword_list
    )
    chunk_conditions = " OR ".join(
        f"LOWER(chunk_text) LIKE '%{_escape_sql_string(kw)}%'"
        for kw in keyword_list
    )
    
    sources_query = f"""
        WITH source_chunks AS (
            SELECT 
                entity_id as dok_id,
                metadata->>'$.titel' as titel,
                chunk_text,
                ROW_NUMBER() OVER (PARTITION BY entity_id ORDER BY chunk_index) as rn
            FROM {EMBEDDINGS_TABLE}
            WHERE entity_type = 'source'
            {year_filter_source}
            AND (({title_conditions}) OR ({chunk_conditions}))
        )
        SELECT dok_id, titel, chunk_text
        FROM source_chunks
        WHERE rn = 1
    """
    
    try:
        sources = conn.execute(sources_query).fetchall()
    except duckdb.Error:
        return []
    
    all_matches = []
    for dok_id, titel, chunk_text in sources:
        titel_lower = (titel or "").lower()
        chunk_lower = (chunk_text or "").lower()
        combined = titel_lower + " " + chunk_lower
        
        for promise_id, keywords in all_keywords.items():
            if any(kw in combined for kw in keywords):
                all_matches.append({
                    "promise_id": promise_id,
                    "source_dok_id": dok_id,
                    "similarity_score": 0.0,
                    "best_chunk_text": chunk_text,
                })
    
    by_promise: dict[str, list] = defaultdict(list)
    for m in all_matches:
        by_promise[m["promise_id"]].append(m)
    
    capped = []
    for promise_id, matches in by_promise.items():
        capped.extend(matches[:max_per_promise])
    
    return capped


def _reciprocal_rank_fusion(
    vector_results: list[dict[str, Any]],
    keyword_results: list[dict[str, Any]],
    max_per_promise: int,
) -> list[dict[str, Any]]:
    """Merge vector and keyword results using Reciprocal Rank Fusion."""
    by_promise_vector: dict[str, list[dict]] = defaultdict(list)
    by_promise_keyword: dict[str, list[dict]] = defaultdict(list)
    
    for m in vector_results:
        by_promise_vector[m["promise_id"]].append(m)
    for m in keyword_results:
        by_promise_keyword[m["promise_id"]].append(m)
    
    all_promise_ids = set(by_promise_vector.keys()) | set(by_promise_keyword.keys())
    
    fused_results = []
    for promise_id in all_promise_ids:
        scores: dict[str, dict] = {}
        
        vector_list = by_promise_vector.get(promise_id, [])
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
            if dok_id not in scores:
                scores[dok_id] = {
                    "promise_id": promise_id,
                    "source_dok_id": dok_id,
                    "similarity_score": m["similarity_score"],
                    "best_chunk_text": m["best_chunk_text"],
                    "rrf_score": 0.0,
                }
            scores[dok_id]["rrf_score"] += 1 / (RRF_K + rank + 1)
        
        sorted_matches = sorted(scores.values(), key=lambda x: x["rrf_score"], reverse=True)
        fused_results.extend(sorted_matches[:max_per_promise])
    
    return fused_results


def find_matches(
    conn: duckdb.DuckDBPyConnection,
    similarity_threshold: float = DEFAULT_SIMILARITY_THRESHOLD,
    max_per_promise: int = DEFAULT_MAX_PER_PROMISE,
    year: int | None = None,
    enable_keyword: bool = False,
) -> list[dict[str, Any]]:
    """
    Find matches between promises and source documents.

    Uses vector similarity search by default. Optionally adds keyword search
    with RRF fusion (disabled by default — keyword search is too noisy without
    TF-IDF or min-match-count filtering).

    Args:
        conn: DuckDB connection
        similarity_threshold: Minimum cosine similarity score for vector search (0-1)
        max_per_promise: Maximum number of matches per promise (safety cap)
        year: Filter by election year (matches promises from that year to sources in mandate period)
        enable_keyword: Enable keyword search leg (default False — adds noise without tuning)
    
    Returns:
        List of match dicts with promise_id, source_dok_id, similarity_score, best_chunk_text
    """
    if not table_exists(conn, EMBEDDINGS_TABLE):
        return []

    if year:
        riksmote_years = _get_mandate_riksmote_years(year)
        riksmote_years_sql = ", ".join(str(y) for y in riksmote_years)
        year_filter_promise = f"AND CAST(metadata->>'$.year' AS INTEGER) = {year}"
        year_filter_source = f"AND CAST(metadata->>'$.riksmote_year' AS INTEGER) IN ({riksmote_years_sql})"
    else:
        year_filter_promise = ""
        year_filter_source = ""

    vector_results = _vector_search(
        conn, similarity_threshold, max_per_promise, year_filter_promise, year_filter_source
    )
    
    if not enable_keyword:
        return vector_results
    
    keyword_results = _keyword_search(
        conn, max_per_promise, year_filter_promise, year_filter_source
    )
    
    fused = _reciprocal_rank_fusion(vector_results, keyword_results, max_per_promise)
    
    return fused


def save_matches(
    conn: duckdb.DuckDBPyConnection,
    matches: list[dict[str, Any]],
    alignments: dict[str, Any] | None = None,
) -> int:
    """Save promise-source matches to MotherDuck using bulk insert.
    
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

    rows = []
    for match in matches:
        match_id = str(uuid.uuid4())
        temp_id = f"{match['promise_id']}_{match['source_dok_id']}"
        alignment = alignments.get(match_id) or alignments.get(temp_id)
        
        rows.append((
            match_id,
            match["promise_id"],
            match["source_dok_id"],
            match["similarity_score"],
            matched_at,
            alignment.alignment if alignment else None,
            alignment.confidence if alignment else None,
            alignment.rationale if alignment else None,
        ))

    conn.executemany(
        f"""
        INSERT INTO {MATCHES_TABLE}
        (match_id, promise_id, source_dok_id, similarity_score, matched_at,
         alignment, alignment_confidence, alignment_rationale)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?)
        """,
        rows,
    )
    return len(matches)


def update_alignments(
    conn: duckdb.DuckDBPyConnection,
    alignments: dict[str, Any],
) -> int:
    """Update alignment classifications for existing matches.
    
    Args:
        conn: DuckDB connection
        alignments: Dict mapping match_id -> AlignmentResult
    
    Returns:
        Number of matches updated
    """
    if not alignments:
        return 0
    
    updated = 0
    for match_id, alignment in alignments.items():
        try:
            conn.execute(
                f"""
                UPDATE {MATCHES_TABLE}
                SET alignment = ?,
                    alignment_confidence = ?,
                    alignment_rationale = ?
                WHERE match_id = ?
                """,
                [
                    alignment.alignment,
                    alignment.confidence,
                    alignment.rationale,
                    match_id,
                ],
            )
            updated += 1
        except duckdb.Error:
            continue
    
    return updated


def clear_matches(conn: duckdb.DuckDBPyConnection, year: int | None = None) -> int:
    """Clear existing matches (for re-computation).

    Args:
        conn: DuckDB connection
        year: If provided, only clear matches for promises from this election year
    """
    try:
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
    conn: duckdb.DuckDBPyConnection, year: int | None = None
) -> dict[str, int]:
    """Get counts of embeddings and matches.

    Args:
        conn: DuckDB connection
        year: Filter by election year
    """
    counts = {}

    try:
        if year:
            counts["promise_embeddings"] = conn.execute(
                f"""
                SELECT COUNT(DISTINCT entity_id) FROM {EMBEDDINGS_TABLE}
                WHERE entity_type = 'promise'
                  AND CAST(metadata->>'$.year' AS INTEGER) = {year}
                """
            ).fetchone()[0]
        else:
            counts["promise_embeddings"] = conn.execute(
                f"SELECT COUNT(DISTINCT entity_id) FROM {EMBEDDINGS_TABLE} WHERE entity_type = 'promise'"
            ).fetchone()[0]
    except duckdb.CatalogException:
        counts["promise_embeddings"] = 0

    try:
        if year:
            riksmote_years = _get_mandate_riksmote_years(year)
            riksmote_years_sql = ", ".join(str(y) for y in riksmote_years)
            counts["source_embeddings"] = conn.execute(
                f"""
                SELECT COUNT(DISTINCT entity_id) FROM {EMBEDDINGS_TABLE}
                WHERE entity_type = 'source'
                  AND CAST(metadata->>'$.riksmote_year' AS INTEGER) IN ({riksmote_years_sql})
                """
            ).fetchone()[0]
        else:
            counts["source_embeddings"] = conn.execute(
                f"SELECT COUNT(DISTINCT entity_id) FROM {EMBEDDINGS_TABLE} WHERE entity_type = 'source'"
            ).fetchone()[0]
    except duckdb.CatalogException:
        counts["source_embeddings"] = 0

    try:
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
