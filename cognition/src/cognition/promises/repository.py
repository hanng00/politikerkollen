"""Database operations for promises."""

import uuid
from datetime import datetime, timezone
from typing import Any

import duckdb

from cognition.core.db import ensure_schema_exists, python_type_to_sql, table_exists
from cognition.promises.models import DocumentExtractionResult, ExtractedPromise

SCHEMA = "processed_snd"
PROMISES_TABLE = f"{SCHEMA}.valmanifest_promises"
STATE_TABLE = f"{SCHEMA}.extraction_state"


def _get_promise_columns_from_model() -> list[tuple[str, str]]:
    """Generate SQL column definitions from ExtractedPromise Pydantic model."""
    columns = []
    for field_name, field_info in ExtractedPromise.model_fields.items():
        annotation = field_info.annotation
        is_required = field_info.is_required()
        sql_type = python_type_to_sql(annotation, nullable=not is_required)
        columns.append((field_name, sql_type))
    return columns


def ensure_tables_exist(conn: duckdb.DuckDBPyConnection) -> None:
    """Create the output tables if they don't exist."""
    ensure_schema_exists(conn, SCHEMA)

    model_columns = _get_promise_columns_from_model()
    model_columns_sql = ",\n            ".join(
        f"{name} {sql_type}" for name, sql_type in model_columns
    )

    conn.execute(f"""
        CREATE TABLE IF NOT EXISTS {PROMISES_TABLE} (
            promise_id VARCHAR PRIMARY KEY,
            document_id VARCHAR NOT NULL,
            party_id VARCHAR,
            year INTEGER,
            {model_columns_sql},
            extracted_at TIMESTAMP NOT NULL,
            model_version VARCHAR NOT NULL
        )
    """)

    conn.execute(f"""
        CREATE TABLE IF NOT EXISTS {STATE_TABLE} (
            document_id VARCHAR PRIMARY KEY,
            extracted_at TIMESTAMP NOT NULL,
            model_version VARCHAR NOT NULL,
            promise_count INTEGER NOT NULL,
            cost_usd DECIMAL(10, 6)
        )
    """)


def get_unprocessed_documents(
    conn: duckdb.DuckDBPyConnection,
    limit: int | None = None,
    document_id: str | None = None,
    year: int | None = None,
) -> list[dict[str, Any]]:
    """Get documents from valmanifest that haven't been processed yet.
    
    Args:
        conn: DuckDB connection
        limit: Maximum number of documents to return
        document_id: Filter to a specific document
        year: Filter by election year (e.g., 2022)
    """
    if document_id:
        query = """
            SELECT document_id, party_id, year, text_content
            FROM raw_snd.valmanifest
            WHERE document_id = ?
        """
        result = conn.execute(query, [document_id]).fetchall()
    else:
        state_exists = table_exists(conn, STATE_TABLE)
        
        # Build year filter clause
        year_filter = ""
        if year:
            year_filter = f"AND v.year = {year}"

        if state_exists:
            query = f"""
                SELECT v.document_id, v.party_id, v.year, v.text_content
                FROM raw_snd.valmanifest v
                LEFT JOIN {STATE_TABLE} s ON v.document_id = s.document_id
                WHERE s.document_id IS NULL
                    AND v.text_content IS NOT NULL
                    AND LENGTH(v.text_content) > 100
                    {year_filter}
            """
        else:
            query = f"""
                SELECT document_id, party_id, year, text_content
                FROM raw_snd.valmanifest v
                WHERE text_content IS NOT NULL
                    AND LENGTH(text_content) > 100
                    {year_filter}
            """

        if limit:
            query += f" LIMIT {limit}"
        result = conn.execute(query).fetchall()

    columns = ["document_id", "party_id", "year", "text_content"]
    return [dict(zip(columns, row)) for row in result]


def get_document_count(conn: duckdb.DuckDBPyConnection, year: int | None = None) -> dict[str, int]:
    """Get counts of total and unprocessed documents.
    
    Args:
        conn: DuckDB connection
        year: Filter by election year (e.g., 2022)
    """
    year_filter = f"AND year = {year}" if year else ""
    
    total = conn.execute(
        f"SELECT COUNT(*) FROM raw_snd.valmanifest WHERE text_content IS NOT NULL {year_filter}"
    ).fetchone()[0]

    try:
        if year:
            processed = conn.execute(
                f"""
                SELECT COUNT(*) FROM {STATE_TABLE} s
                JOIN raw_snd.valmanifest v ON s.document_id = v.document_id
                WHERE v.year = {year}
                """
            ).fetchone()[0]
        else:
            processed = conn.execute(f"SELECT COUNT(*) FROM {STATE_TABLE}").fetchone()[0]
    except duckdb.CatalogException:
        processed = 0

    return {"total": total, "processed": processed, "remaining": total - processed}


def save_promises(
    conn: duckdb.DuckDBPyConnection,
    result: DocumentExtractionResult,
    party_id: str | None,
    year: int | None,
    model_version: str,
    cost_usd: float | None = None,
) -> int:
    """Save extracted promises to MotherDuck."""
    ensure_tables_exist(conn)
    extracted_at = datetime.now(timezone.utc)

    model_field_names = list(ExtractedPromise.model_fields.keys())
    columns = (
        ["promise_id", "document_id", "party_id", "year"]
        + model_field_names
        + ["extracted_at", "model_version"]
    )
    placeholders = ", ".join(["?"] * len(columns))
    columns_sql = ", ".join(columns)

    for promise in result.promises:
        promise_id = str(uuid.uuid4())
        model_values = [getattr(promise, field) for field in model_field_names]
        values = (
            [promise_id, result.document_id, party_id, year]
            + model_values
            + [extracted_at, model_version]
        )
        conn.execute(
            f"INSERT INTO {PROMISES_TABLE} ({columns_sql}) VALUES ({placeholders})",
            values,
        )

    _mark_document_processed(conn, result.document_id, model_version, len(result.promises), cost_usd)
    return len(result.promises)


def _mark_document_processed(
    conn: duckdb.DuckDBPyConnection,
    document_id: str,
    model_version: str,
    promise_count: int,
    cost_usd: float | None = None,
) -> None:
    """Record that a document has been processed."""
    conn.execute(
        f"""
        INSERT OR REPLACE INTO {STATE_TABLE} (
            document_id, extracted_at, model_version, promise_count, cost_usd
        ) VALUES (?, ?, ?, ?, ?)
        """,
        [document_id, datetime.now(timezone.utc), model_version, promise_count, cost_usd],
    )
