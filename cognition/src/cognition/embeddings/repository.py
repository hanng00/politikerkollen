"""Database operations for embeddings."""

from datetime import datetime, timezone
from typing import Any

import duckdb

from cognition.core.db import ensure_schema_exists, table_exists
from cognition.embeddings.models import (
    EMBEDDING_MODEL,
    PromiseEmbedding,
    VoteEmbedding,
    get_embedding_columns,
)

SCHEMA = "processed_snd"
PROMISE_EMBEDDINGS_TABLE = f"{SCHEMA}.promise_embeddings"
VOTE_EMBEDDINGS_TABLE = f"{SCHEMA}.vote_embeddings"
PROMISES_TABLE = f"{SCHEMA}.valmanifest_promises"


def ensure_tables_exist(conn: duckdb.DuckDBPyConnection) -> None:
    """Create the embedding tables if they don't exist."""
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

    vote_columns = get_embedding_columns(VoteEmbedding)
    vote_columns_sql = ",\n            ".join(
        f"{name} {sql_type}" for name, sql_type in vote_columns
    )
    conn.execute(f"""
        CREATE TABLE IF NOT EXISTS {VOTE_EMBEDDINGS_TABLE} (
            {vote_columns_sql}
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


def _get_riksmote_filter(year: int) -> str:
    """Get SQL filter for riksmöte year.
    
    Swedish riksmöte runs from September to June, e.g., 2022/23.
    Votes in riksmöte 2022/23 have dates from 2022-09 to 2023-06.
    
    For election year 2022, we want votes from riksmöte 2022/23, 2023/24, 2024/25, 2025/26
    (the mandate period until next election in 2026).
    """
    next_election = year + 4
    return f"""
        AND (
            (EXTRACT(YEAR FROM v.datum) = {year} AND EXTRACT(MONTH FROM v.datum) >= 9)
            OR (EXTRACT(YEAR FROM v.datum) > {year} AND EXTRACT(YEAR FROM v.datum) < {next_election})
            OR (EXTRACT(YEAR FROM v.datum) = {next_election} AND EXTRACT(MONTH FROM v.datum) < 9)
        )
    """


def get_unembedded_votes(
    conn: duckdb.DuckDBPyConnection,
    limit: int | None = None,
    year: int | None = None,
) -> list[dict[str, Any]]:
    """Get vote proposals that haven't been embedded yet.
    
    Joins voteringlista with utskottsforslag on votering_id to get the proposal text.
    Returns unique (votering_id, dok_id, forslag_text) combinations.
    
    Args:
        conn: DuckDB connection
        limit: Maximum number of votes to return
        year: Filter by riksmöte year (e.g., 2022 for votes in mandate period 2022-2026)
    """
    embeddings_exist = table_exists(conn, VOTE_EMBEDDINGS_TABLE)
    year_filter = _get_riksmote_filter(year) if year else ""

    base_query = f"""
        SELECT DISTINCT v.votering_id, v.dok_id, u.forslag as forslag_text
        FROM raw_riksdagen.voteringlista v
        JOIN raw_riksdagen.dokumentstatus__dokutskottsforslag__utskottsforslag u
            ON v.votering_id = u.votering_id
        WHERE u.forslag IS NOT NULL AND LENGTH(u.forslag) > 10
        {year_filter}
    """

    if embeddings_exist:
        query = f"""
            WITH base AS ({base_query})
            SELECT b.votering_id, b.dok_id, b.forslag_text
            FROM base b
            LEFT JOIN {VOTE_EMBEDDINGS_TABLE} e ON b.votering_id = e.votering_id
            WHERE e.votering_id IS NULL
        """
    else:
        query = base_query

    if limit:
        query += f" LIMIT {limit}"

    result = conn.execute(query).fetchall()
    return [
        {"votering_id": row[0], "dok_id": row[1], "forslag_text": row[2]}
        for row in result
    ]


def save_promise_embeddings(
    conn: duckdb.DuckDBPyConnection,
    embeddings: list[tuple[str, list[float]]],
    model_version: str = EMBEDDING_MODEL,
) -> int:
    """Save promise embeddings to MotherDuck."""
    ensure_tables_exist(conn)
    embedded_at = datetime.now(timezone.utc)

    for promise_id, embedding in embeddings:
        conn.execute(
            f"""
            INSERT INTO {PROMISE_EMBEDDINGS_TABLE}
            (promise_id, embedding, embedded_at, model_version)
            VALUES (?, ?, ?, ?)
            """,
            [promise_id, embedding, embedded_at, model_version],
        )
    return len(embeddings)


def save_vote_embeddings(
    conn: duckdb.DuckDBPyConnection,
    embeddings: list[tuple[str, str, str, list[float]]],
    model_version: str = EMBEDDING_MODEL,
) -> int:
    """Save vote embeddings to MotherDuck."""
    ensure_tables_exist(conn)
    embedded_at = datetime.now(timezone.utc)

    for votering_id, dok_id, forslag_text, embedding in embeddings:
        conn.execute(
            f"""
            INSERT INTO {VOTE_EMBEDDINGS_TABLE}
            (votering_id, dok_id, forslag_text, embedding, embedded_at, model_version)
            VALUES (?, ?, ?, ?, ?, ?)
            """,
            [votering_id, dok_id, forslag_text, embedding, embedded_at, model_version],
        )
    return len(embeddings)


def get_counts(conn: duckdb.DuckDBPyConnection, year: int | None = None) -> dict[str, int]:
    """Get counts of embeddings.
    
    Args:
        conn: DuckDB connection
        year: Filter by year (election year for promises, riksmöte year for votes)
    """
    counts = {}
    year_filter_promises = f"WHERE p.year = {year}" if year else ""

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
        counts["vote_embeddings"] = conn.execute(
            f"SELECT COUNT(*) FROM {VOTE_EMBEDDINGS_TABLE}"
        ).fetchone()[0]
    except duckdb.CatalogException:
        counts["vote_embeddings"] = 0

    try:
        counts["promises_total"] = conn.execute(
            f"SELECT COUNT(*) FROM {PROMISES_TABLE} p {year_filter_promises}"
        ).fetchone()[0]
    except duckdb.CatalogException:
        counts["promises_total"] = 0

    return counts
