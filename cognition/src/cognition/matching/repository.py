"""Database operations for promise-source matching.

Matches manifesto promises against source documents (motions and propositions)
using vector similarity. This replaces the old vote_embeddings approach which
embedded procedural text instead of substantive policy content.
"""

import uuid
from datetime import datetime, timezone
from typing import Any

import duckdb

from cognition.core.config import SCHEMA
from cognition.core.db import ensure_schema_exists
from cognition.matching.models import get_match_columns

MATCHES_TABLE = f"{SCHEMA}.promise_vote_matches"
PROMISE_EMBEDDINGS_TABLE = f"{SCHEMA}.promise_embeddings"
SOURCE_EMBEDDINGS_TABLE = f"{SCHEMA}.source_embeddings"
PROMISES_TABLE = f"{SCHEMA}.valmanifest_promises"


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


def find_matches(
    conn: duckdb.DuckDBPyConnection,
    similarity_threshold: float = 0.7,
    top_k: int = 5,
    year: int | None = None,
) -> list[dict[str, Any]]:
    """
    Find matches between promises and source documents using vector similarity.

    Uses DuckDB's array_cosine_similarity for efficient vector comparison.
    Matches promises against source_embeddings (motions/propositions) which contain
    substantive policy content.

    Args:
        conn: DuckDB connection
        similarity_threshold: Minimum cosine similarity score (0-1)
        top_k: Maximum number of matches per promise
        year: Filter by election year (matches promises from that year to sources in mandate period)
    """
    if year:
        riksmote_years = _get_mandate_riksmote_years(year)
        riksmote_years_sql = ", ".join(str(y) for y in riksmote_years)
        
        query = f"""
            WITH filtered_promises AS (
                SELECT pe.promise_id, pe.embedding
                FROM {PROMISE_EMBEDDINGS_TABLE} pe
                JOIN {PROMISES_TABLE} p ON pe.promise_id = p.promise_id
                WHERE p.year = {year}
            ),
            filtered_sources AS (
                SELECT se.dok_id, se.embedding
                FROM {SOURCE_EMBEDDINGS_TABLE} se
                WHERE se.riksmote_year IN ({riksmote_years_sql})
            ),
            ranked_matches AS (
                SELECT
                    p.promise_id,
                    s.dok_id as source_dok_id,
                    array_cosine_similarity(p.embedding, s.embedding) as similarity_score,
                    ROW_NUMBER() OVER (
                        PARTITION BY p.promise_id
                        ORDER BY array_cosine_similarity(p.embedding, s.embedding) DESC
                    ) as rank
                FROM filtered_promises p
                CROSS JOIN filtered_sources s
                WHERE array_cosine_similarity(p.embedding, s.embedding) >= {similarity_threshold}
            )
            SELECT promise_id, source_dok_id, similarity_score
            FROM ranked_matches
            WHERE rank <= {top_k}
            ORDER BY promise_id, similarity_score DESC
        """
    else:
        query = f"""
            WITH ranked_matches AS (
                SELECT
                    p.promise_id,
                    s.dok_id as source_dok_id,
                    array_cosine_similarity(p.embedding, s.embedding) as similarity_score,
                    ROW_NUMBER() OVER (
                        PARTITION BY p.promise_id
                        ORDER BY array_cosine_similarity(p.embedding, s.embedding) DESC
                    ) as rank
                FROM {PROMISE_EMBEDDINGS_TABLE} p
                CROSS JOIN {SOURCE_EMBEDDINGS_TABLE} s
                WHERE array_cosine_similarity(p.embedding, s.embedding) >= {similarity_threshold}
            )
            SELECT promise_id, source_dok_id, similarity_score
            FROM ranked_matches
            WHERE rank <= {top_k}
            ORDER BY promise_id, similarity_score DESC
        """

    result = conn.execute(query).fetchall()
    return [
        {"promise_id": row[0], "source_dok_id": row[1], "similarity_score": row[2]}
        for row in result
    ]


def save_matches(
    conn: duckdb.DuckDBPyConnection,
    matches: list[dict[str, Any]],
) -> int:
    """Save promise-source matches to MotherDuck using bulk insert."""
    if not matches:
        return 0

    ensure_tables_exist(conn)
    matched_at = datetime.now(timezone.utc)

    # Prepare rows for bulk insert
    rows = [
        (
            str(uuid.uuid4()),
            match["promise_id"],
            match["source_dok_id"],
            match["similarity_score"],
            matched_at,
        )
        for match in matches
    ]

    # Bulk insert using executemany (much faster than row-by-row)
    conn.executemany(
        f"""
        INSERT INTO {MATCHES_TABLE}
        (match_id, promise_id, source_dok_id, similarity_score, matched_at)
        VALUES (?, ?, ?, ?, ?)
        """,
        rows,
    )
    return len(matches)


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
                SELECT COUNT(*) FROM {PROMISE_EMBEDDINGS_TABLE} pe
                JOIN {PROMISES_TABLE} p ON pe.promise_id = p.promise_id
                WHERE p.year = {year}
                """
            ).fetchone()[0]
        else:
            counts["promise_embeddings"] = conn.execute(
                f"SELECT COUNT(*) FROM {PROMISE_EMBEDDINGS_TABLE}"
            ).fetchone()[0]
    except duckdb.CatalogException:
        counts["promise_embeddings"] = 0

    try:
        if year:
            riksmote_years = _get_mandate_riksmote_years(year)
            riksmote_years_sql = ", ".join(str(y) for y in riksmote_years)
            counts["source_embeddings"] = conn.execute(
                f"SELECT COUNT(*) FROM {SOURCE_EMBEDDINGS_TABLE} WHERE riksmote_year IN ({riksmote_years_sql})"
            ).fetchone()[0]
        else:
            counts["source_embeddings"] = conn.execute(
                f"SELECT COUNT(*) FROM {SOURCE_EMBEDDINGS_TABLE}"
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
