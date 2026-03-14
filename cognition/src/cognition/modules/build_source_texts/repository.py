"""Database operations for source text extraction.

Reads HTML from int_document_content, extracts plain text via BeautifulSoup,
and stores it in cognition.source_texts for use by BM25 search and other pipelines.
"""

import logging
from datetime import datetime, timezone
from typing import Any

import duckdb
import pyarrow as pa

from cognition.core.config import INT_SOURCE_DOCUMENTS, SCHEMA
from cognition.modules.build_source_texts.parser import extract_text_from_html

logger = logging.getLogger("cognition")

SOURCE_TEXTS_TABLE = f"{SCHEMA}.source_texts"


def ensure_table_exists(conn: duckdb.DuckDBPyConnection) -> None:
    """Create the source_texts table if it doesn't exist."""
    conn.execute(f"CREATE SCHEMA IF NOT EXISTS {SCHEMA}")
    conn.execute(f"""
        CREATE TABLE IF NOT EXISTS {SOURCE_TEXTS_TABLE} (
            dok_id VARCHAR PRIMARY KEY,
            titel VARCHAR,
            full_text VARCHAR NOT NULL,
            dok_typ VARCHAR,
            riksmote_year INTEGER,
            parti VARCHAR,
            saved_at TIMESTAMP NOT NULL
        )
    """)


def get_sources_needing_text(
    conn: duckdb.DuckDBPyConnection,
    limit: int | None = None,
    riksmote_year: int | None = None,
    dok_typ: str | None = None,
) -> list[dict[str, Any]]:
    """Get source documents that don't yet have an entry in source_texts.

    Single query with LEFT JOIN anti-pattern for incremental detection.
    HTML parsing happens in Python per row.
    """
    ensure_table_exists(conn)

    filters = []
    if riksmote_year:
        filters.append(f"s.riksmote_year = {riksmote_year}")
    if dok_typ:
        filters.append(f"s.dok_typ = '{dok_typ}'")

    where_extra = (" AND " + " AND ".join(filters)) if filters else ""
    limit_clause = f"LIMIT {limit}" if limit else ""

    rows = conn.execute(f"""
        SELECT
            s.dok_id, s.dok_typ, s.riksmote_year,
            s.titel, c.html, s.parti
        FROM {INT_SOURCE_DOCUMENTS} s
        JOIN main_int.int_document_content c ON c.dok_id = s.dok_id
        LEFT JOIN {SOURCE_TEXTS_TABLE} st ON st.dok_id = s.dok_id
        WHERE st.dok_id IS NULL
        {where_extra}
        {limit_clause}
    """).fetchall()

    sources = []
    for row in rows:
        content_text = extract_text_from_html(row[4])
        if not content_text or len(content_text) < 100:
            continue
        sources.append({
            "dok_id": row[0],
            "dok_typ": row[1],
            "riksmote_year": row[2],
            "titel": row[3],
            "content_text": content_text,
            "parti": row[5],
        })

    return sources


def save_source_texts(
    conn: duckdb.DuckDBPyConnection,
    sources: list[dict[str, Any]],
) -> int:
    """Save extracted plain text to cognition.source_texts.

    Uses INSERT OR REPLACE so re-runs safely overwrite.
    """
    if not sources:
        return 0

    ensure_table_exists(conn)
    now = datetime.now(timezone.utc)

    table = pa.table({
        "dok_id": [s["dok_id"] for s in sources],
        "titel": [s.get("titel") for s in sources],
        "full_text": [s["content_text"] for s in sources],
        "dok_typ": [s.get("dok_typ") for s in sources],
        "riksmote_year": [s.get("riksmote_year") for s in sources],
        "parti": [s.get("parti") for s in sources],
        "saved_at": [now for _ in sources],
    })
    conn.register("_source_texts_batch", table)
    conn.execute(f"""
        INSERT OR REPLACE INTO {SOURCE_TEXTS_TABLE}
        SELECT * FROM _source_texts_batch
    """)
    conn.unregister("_source_texts_batch")
    logger.info(f"Saved {len(sources)} source texts to {SOURCE_TEXTS_TABLE}")
    return len(sources)
