"""Database operations for promise-vote matching."""

import uuid
from datetime import datetime, timezone
from typing import Any

import duckdb

from cognition.core.db import ensure_schema_exists, table_exists
from cognition.matching.models import get_match_columns

SCHEMA = "processed_snd"
MATCHES_TABLE = f"{SCHEMA}.promise_vote_matches"
PROMISE_EMBEDDINGS_TABLE = f"{SCHEMA}.promise_embeddings"
VOTE_EMBEDDINGS_TABLE = f"{SCHEMA}.vote_embeddings"


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


def find_matches(
    conn: duckdb.DuckDBPyConnection,
    similarity_threshold: float = 0.7,
    top_k: int = 5,
) -> list[dict[str, Any]]:
    """
    Find matches between promises and votes using vector similarity.

    Uses DuckDB's array_cosine_similarity for efficient vector comparison.
    """
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


def clear_matches(conn: duckdb.DuckDBPyConnection) -> int:
    """Clear all existing matches (for re-computation)."""
    try:
        count = conn.execute(f"SELECT COUNT(*) FROM {MATCHES_TABLE}").fetchone()[0]
        conn.execute(f"DELETE FROM {MATCHES_TABLE}")
        return count
    except duckdb.CatalogException:
        return 0


def get_counts(conn: duckdb.DuckDBPyConnection) -> dict[str, int]:
    """Get counts of embeddings and matches."""
    counts = {}

    try:
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
        counts["matches"] = conn.execute(
            f"SELECT COUNT(*) FROM {MATCHES_TABLE}"
        ).fetchone()[0]
    except duckdb.CatalogException:
        counts["matches"] = 0

    return counts
