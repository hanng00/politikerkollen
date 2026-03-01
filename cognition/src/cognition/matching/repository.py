"""Database operations for promise-vote matching."""

import uuid
from datetime import datetime, timezone
from typing import Any

import duckdb

from cognition.core.config import SCHEMA
from cognition.core.db import ensure_schema_exists, table_exists
from cognition.matching.models import get_match_columns

MATCHES_TABLE = f"{SCHEMA}.promise_vote_matches"
PROMISE_EMBEDDINGS_TABLE = f"{SCHEMA}.promise_embeddings"
VOTE_EMBEDDINGS_TABLE = f"{SCHEMA}.vote_embeddings"
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


def _get_riksmote_filter(year: int, table_alias: str = "v") -> str:
    """Get SQL filter for riksmöte year.
    
    Swedish riksmöte runs from September to June, e.g., 2022/23.
    For election year 2022, we want votes from the mandate period 2022-2026.
    """
    next_election = year + 4
    return f"""
        AND (
            (EXTRACT(YEAR FROM {table_alias}.datum) = {year} AND EXTRACT(MONTH FROM {table_alias}.datum) >= 9)
            OR (EXTRACT(YEAR FROM {table_alias}.datum) > {year} AND EXTRACT(YEAR FROM {table_alias}.datum) < {next_election})
            OR (EXTRACT(YEAR FROM {table_alias}.datum) = {next_election} AND EXTRACT(MONTH FROM {table_alias}.datum) < 9)
        )
    """


def find_matches(
    conn: duckdb.DuckDBPyConnection,
    similarity_threshold: float = 0.7,
    top_k: int = 5,
    year: int | None = None,
) -> list[dict[str, Any]]:
    """
    Find matches between promises and votes using vector similarity.

    Uses DuckDB's array_cosine_similarity for efficient vector comparison.
    
    Args:
        conn: DuckDB connection
        similarity_threshold: Minimum cosine similarity score (0-1)
        top_k: Maximum number of matches per promise
        year: Filter by election year (matches promises from that year to votes in mandate period)
    """
    if year:
        # Filter promises by election year and votes by mandate period
        query = f"""
            WITH filtered_promises AS (
                SELECT pe.promise_id, pe.embedding
                FROM {PROMISE_EMBEDDINGS_TABLE} pe
                JOIN {PROMISES_TABLE} p ON pe.promise_id = p.promise_id
                WHERE p.year = {year}
            ),
            filtered_votes AS (
                SELECT ve.votering_id, ve.embedding
                FROM {VOTE_EMBEDDINGS_TABLE} ve
                JOIN raw_riksdagen.voteringlista v ON ve.votering_id = v.votering_id
                WHERE 1=1 {_get_riksmote_filter(year, 'v')}
            ),
            ranked_matches AS (
                SELECT
                    p.promise_id,
                    v.votering_id,
                    array_cosine_similarity(p.embedding, v.embedding) as similarity_score,
                    ROW_NUMBER() OVER (
                        PARTITION BY p.promise_id
                        ORDER BY array_cosine_similarity(p.embedding, v.embedding) DESC
                    ) as rank
                FROM filtered_promises p
                CROSS JOIN filtered_votes v
                WHERE array_cosine_similarity(p.embedding, v.embedding) >= {similarity_threshold}
            )
            SELECT promise_id, votering_id, similarity_score
            FROM ranked_matches
            WHERE rank <= {top_k}
            ORDER BY promise_id, similarity_score DESC
        """
    else:
        query = f"""
            WITH ranked_matches AS (
                SELECT
                    p.promise_id,
                    v.votering_id,
                    array_cosine_similarity(p.embedding, v.embedding) as similarity_score,
                    ROW_NUMBER() OVER (
                        PARTITION BY p.promise_id
                        ORDER BY array_cosine_similarity(p.embedding, v.embedding) DESC
                    ) as rank
                FROM {PROMISE_EMBEDDINGS_TABLE} p
                CROSS JOIN {VOTE_EMBEDDINGS_TABLE} v
                WHERE array_cosine_similarity(p.embedding, v.embedding) >= {similarity_threshold}
            )
            SELECT promise_id, votering_id, similarity_score
            FROM ranked_matches
            WHERE rank <= {top_k}
            ORDER BY promise_id, similarity_score DESC
        """

    result = conn.execute(query).fetchall()
    return [
        {"promise_id": row[0], "votering_id": row[1], "similarity_score": row[2]}
        for row in result
    ]


def save_matches(
    conn: duckdb.DuckDBPyConnection,
    matches: list[dict[str, Any]],
) -> int:
    """Save promise-vote matches to MotherDuck."""
    ensure_tables_exist(conn)
    matched_at = datetime.now(timezone.utc)

    for match in matches:
        match_id = str(uuid.uuid4())
        conn.execute(
            f"""
            INSERT INTO {MATCHES_TABLE}
            (match_id, promise_id, votering_id, similarity_score, matched_at)
            VALUES (?, ?, ?, ?, ?)
            """,
            [match_id, match["promise_id"], match["votering_id"], match["similarity_score"], matched_at],
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


def get_counts(conn: duckdb.DuckDBPyConnection, year: int | None = None) -> dict[str, int]:
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
        counts["vote_embeddings"] = conn.execute(
            f"SELECT COUNT(*) FROM {VOTE_EMBEDDINGS_TABLE}"
        ).fetchone()[0]
    except duckdb.CatalogException:
        counts["vote_embeddings"] = 0

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
