"""Database operations for promise embeddings.

Uses the unified embeddings table via core.repository.EmbeddingRepository.
"""

from typing import Any

import duckdb

from cognition.core.config import SCHEMA
from cognition.core.models import EmbeddingRecord
from cognition.core.repository import EmbeddingRepository

PROMISES_TABLE = f"{SCHEMA}.valmanifest_promises"


def get_all_promise_ids(
    conn: duckdb.DuckDBPyConnection,
    year: int | None = None,
) -> list[str]:
    """Get all promise IDs from valmanifest_promises.

    Args:
        conn: DuckDB connection
        year: Filter by election year
    """
    year_filter = f"WHERE year = {year}" if year else ""

    try:
        result = conn.execute(
            f"SELECT promise_id FROM {PROMISES_TABLE} {year_filter}"
        ).fetchall()
        return [row[0] for row in result]
    except Exception:
        return []


def get_unembedded_promises(
    conn: duckdb.DuckDBPyConnection,
    limit: int | None = None,
    year: int | None = None,
) -> list[dict[str, Any]]:
    """Get promises that haven't been embedded yet.

    Uses the unified embeddings table to check for existing embeddings.

    Args:
        conn: DuckDB connection
        limit: Maximum number of promises to return
        year: Filter by election year (e.g., 2022)
    """
    repo = EmbeddingRepository(conn)

    all_ids = get_all_promise_ids(conn, year=year)
    if not all_ids:
        return []

    unembedded_ids = repo.get_unembedded_entity_ids("promise", all_ids)

    if not unembedded_ids:
        return []

    ids_str = ", ".join(f"'{id}'" for id in unembedded_ids)
    year_filter = f"AND year = {year}" if year else ""

    query = f"""
        SELECT promise_id, promise_text, party_id, year, category
        FROM {PROMISES_TABLE}
        WHERE promise_id IN ({ids_str})
        {year_filter}
    """

    if limit:
        query += f" LIMIT {limit}"

    result = conn.execute(query).fetchall()

    return [
        {
            "promise_id": row[0],
            "promise_text": row[1],
            "party": row[2],
            "year": row[3],
            "category": row[4],
        }
        for row in result
    ]


def save_promise_embeddings(
    conn: duckdb.DuckDBPyConnection,
    records: list[EmbeddingRecord],
) -> int:
    """Save promise embeddings to the unified embeddings table.

    Args:
        conn: DuckDB connection
        records: List of EmbeddingRecord from embed_promises()

    Returns:
        Number of records saved
    """
    repo = EmbeddingRepository(conn)
    return repo.save(records)


def get_counts(
    conn: duckdb.DuckDBPyConnection,
    year: int | None = None,
) -> dict[str, int]:
    """Get counts of promise embeddings.

    Args:
        conn: DuckDB connection
        year: Filter promises by election year
    """
    repo = EmbeddingRepository(conn)

    metadata_filter = {"year": year} if year else None

    embedding_counts = repo.get_counts(
        entity_type="promise",
        metadata_filter=metadata_filter,
    )

    year_filter = f"WHERE year = {year}" if year else ""

    try:
        promises_total = conn.execute(
            f"SELECT COUNT(*) FROM {PROMISES_TABLE} {year_filter}"
        ).fetchone()[0]
    except Exception:
        promises_total = 0

    return {
        "promise_embeddings": embedding_counts["embeddings"],
        "promise_entities": embedding_counts["entities"],
        "promises_total": promises_total,
    }
