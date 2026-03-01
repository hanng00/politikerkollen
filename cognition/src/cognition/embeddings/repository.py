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
) -> list[dict[str, Any]]:
    """Get promises that haven't been embedded yet."""
    embeddings_exist = table_exists(conn, PROMISE_EMBEDDINGS_TABLE)

    if embeddings_exist:
        query = f"""
            SELECT p.promise_id, p.promise_text
            FROM {PROMISES_TABLE} p
            LEFT JOIN {PROMISE_EMBEDDINGS_TABLE} e ON p.promise_id = e.promise_id
            WHERE e.promise_id IS NULL
        """
    else:
        query = f"SELECT promise_id, promise_text FROM {PROMISES_TABLE}"

    if limit:
        query += f" LIMIT {limit}"

    result = conn.execute(query).fetchall()
    return [{"promise_id": row[0], "promise_text": row[1]} for row in result]


def get_unembedded_votes(
    conn: duckdb.DuckDBPyConnection,
    limit: int | None = None,
) -> list[dict[str, Any]]:
    """Get vote proposals that haven't been embedded yet.
    
    Joins voteringlista with utskottsforslag on votering_id to get the proposal text.
    Returns unique (votering_id, dok_id, forslag_text) combinations.
    """
    embeddings_exist = table_exists(conn, VOTE_EMBEDDINGS_TABLE)

    # Join on votering_id - the utskottsforslag table has votering_id but not dok_id
    # We get dok_id from voteringlista
    base_query = """
        SELECT DISTINCT v.votering_id, v.dok_id, u.forslag as forslag_text
        FROM raw_riksdagen.voteringlista v
        JOIN raw_riksdagen.dokumentstatus__dokutskottsforslag__utskottsforslag u
            ON v.votering_id = u.votering_id
    """

    if embeddings_exist:
        query = f"""
            {base_query}
            LEFT JOIN {VOTE_EMBEDDINGS_TABLE} e ON v.votering_id = e.votering_id
            WHERE e.votering_id IS NULL
                AND u.forslag IS NOT NULL
                AND LENGTH(u.forslag) > 10
        """
    else:
        query = f"""
            {base_query}
            WHERE u.forslag IS NOT NULL AND LENGTH(u.forslag) > 10
        """

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


def get_counts(conn: duckdb.DuckDBPyConnection) -> dict[str, int]:
    """Get counts of embeddings."""
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
        counts["promises_total"] = conn.execute(
            f"SELECT COUNT(*) FROM {PROMISES_TABLE}"
        ).fetchone()[0]
    except duckdb.CatalogException:
        counts["promises_total"] = 0

    return counts
