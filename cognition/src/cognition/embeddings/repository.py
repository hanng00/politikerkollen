"""Database operations for promise embeddings."""

from datetime import datetime, timezone
from typing import Any

import duckdb

from cognition.core.config import SCHEMA
from cognition.core.db import ensure_schema_exists, table_exists
from cognition.embeddings.models import (
    EMBEDDING_MODEL,
    PromiseEmbedding,
    get_embedding_columns,
)

PROMISE_EMBEDDINGS_TABLE = f"{SCHEMA}.promise_embeddings"
PROMISES_TABLE = f"{SCHEMA}.valmanifest_promises"


def ensure_tables_exist(conn: duckdb.DuckDBPyConnection) -> None:
    """Create the promise embedding table if it doesn't exist."""
    ensure_schema_exists(conn, SCHEMA)

    promise_columns = get_embedding_columns(PromiseEmbedding)
    promise_columns_sql = ",\n            ".join(
        f"{name} {sql_type}" for name, sql_type in promise_columns
    )
    conn.execute(f"""
        CREATE TABLE IF NOT EXISTS {PROMISE_EMBEDDINGS_TABLE} (
            {promise_columns_sql}
        )
    """)


def get_unembedded_promises(
    conn: duckdb.DuckDBPyConnection,
    limit: int | None = None,
    year: int | None = None,
) -> list[dict[str, Any]]:
    """Get promises that haven't been embedded yet.

    Args:
        conn: DuckDB connection
        limit: Maximum number of promises to return
        year: Filter by election year (e.g., 2022)
    """
    embeddings_exist = table_exists(conn, PROMISE_EMBEDDINGS_TABLE)
    year_filter = f"AND p.year = {year}" if year else ""

    if embeddings_exist:
        query = f"""
            SELECT p.promise_id, p.promise_text
            FROM {PROMISES_TABLE} p
            LEFT JOIN {PROMISE_EMBEDDINGS_TABLE} e ON p.promise_id = e.promise_id
            WHERE e.promise_id IS NULL
            {year_filter}
        """
    else:
        query = f"""
            SELECT promise_id, promise_text 
            FROM {PROMISES_TABLE} p
            WHERE 1=1 {year_filter}
        """

    if limit:
        query += f" LIMIT {limit}"

    result = conn.execute(query).fetchall()
    return [{"promise_id": row[0], "promise_text": row[1]} for row in result]


def save_promise_embeddings(
    conn: duckdb.DuckDBPyConnection,
    embeddings: list[tuple[str, list[float]]],
    model_version: str = EMBEDDING_MODEL,
) -> int:
    """Save promise embeddings to MotherDuck using bulk insert."""
    if not embeddings:
        return 0

    ensure_tables_exist(conn)
    embedded_at = datetime.now(timezone.utc)

    # Prepare rows for bulk insert
    rows = [
        (promise_id, embedding, embedded_at, model_version)
        for promise_id, embedding in embeddings
    ]

    # Bulk insert using executemany (much faster than row-by-row)
    conn.executemany(
        f"""
        INSERT INTO {PROMISE_EMBEDDINGS_TABLE}
        (promise_id, embedding, embedded_at, model_version)
        VALUES (?, ?, ?, ?)
        """,
        rows,
    )
    return len(embeddings)


def get_counts(
    conn: duckdb.DuckDBPyConnection,
    year: int | None = None,
) -> dict[str, int]:
    """Get counts of promise embeddings.

    Args:
        conn: DuckDB connection
        year: Filter promises by election year
    """
    counts = {}

    try:
        if year:
            counts["promise_embeddings"] = conn.execute(
                f"""
                SELECT COUNT(*) FROM {PROMISE_EMBEDDINGS_TABLE} e
                JOIN {PROMISES_TABLE} p ON e.promise_id = p.promise_id
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
        year_filter = f"WHERE year = {year}" if year else ""
        counts["promises_total"] = conn.execute(
            f"SELECT COUNT(*) FROM {PROMISES_TABLE} {year_filter}"
        ).fetchone()[0]
    except duckdb.CatalogException:
        counts["promises_total"] = 0

    return counts
