"""Database operations for source document embeddings.

Reads from int_document_content (pre-filtered mot/prop with HTML) and
stg_dokumentstatus_intressent for signatory information.
"""

from datetime import datetime, timezone
from typing import Any

import duckdb

from cognition.core.config import (
    DOKUMENTSTATUS_INTRESSENT_SOURCE,
    INT_DOCUMENT_CONTENT,
    SCHEMA,
)
from cognition.core.db import ensure_schema_exists, table_exists
from cognition.sources.models import (
    EMBEDDING_MODEL,
    get_source_embedding_columns,
)
from cognition.sources.parser import extract_text_from_html

SOURCE_EMBEDDINGS_TABLE = f"{SCHEMA}.source_embeddings"


def ensure_tables_exist(conn: duckdb.DuckDBPyConnection) -> None:
    """Create the source embeddings table if it doesn't exist."""
    ensure_schema_exists(conn, SCHEMA)

    columns = get_source_embedding_columns()
    columns_sql = ",\n            ".join(
        f"{name} {sql_type}" for name, sql_type in columns
    )
    conn.execute(f"""
        CREATE TABLE IF NOT EXISTS {SOURCE_EMBEDDINGS_TABLE} (
            {columns_sql}
        )
    """)


def _build_source_query(
    riksmote_year: int | None = None,
    dok_typ: str | None = None,
    exclude_embedded: bool = True,
    limit: int | None = None,
) -> str:
    """Build SQL query to fetch source documents from int_document_content.

    Reads from pre-filtered, deduplicated int_document_content table and joins
    signatory info from stg_dokumentstatus_intressent.
    HTML parsing happens in Python after fetch.
    
    Optimizations:
    - int_document_content is pre-filtered to mot/prop with HTML (much smaller)
    - Single scan of intressent table with conditional aggregation
    - LEFT JOIN ... IS NULL pattern instead of NOT IN for exclusion
    """
    filters = []

    if riksmote_year:
        filters.append(f"d.riksmote_year = {riksmote_year}")
    if dok_typ:
        filters.append(f"d.dok_typ = '{dok_typ}'")

    where_clause = " AND ".join(filters) if filters else "1=1"

    # Single scan of intressent table - compute both first signatory and all signatories
    query = f"""
        WITH signatory_agg AS (
            SELECT
                _dlt_root_id AS dlt_id,
                -- First signatory's party (for motions)
                arg_min(partibet, (ordning, _dlt_id)) AS first_parti,
                -- All signatory IDs as list
                LIST(intressent_id ORDER BY ordning NULLS LAST) AS intressent_ids
            FROM {DOKUMENTSTATUS_INTRESSENT_SOURCE}
            WHERE roll IN ('undertecknare', 'huvudman')
            GROUP BY _dlt_root_id
        )
        SELECT
            d.dok_id,
            d.dok_typ,
            d.rm,
            d.riksmote_year,
            d.titel,
            d.html,
            d.dokument_url,
            CASE 
                WHEN d.dok_typ = 'prop' THEN 'Regeringen'
                ELSE sa.first_parti
            END AS parti,
            CASE 
                WHEN d.dok_typ = 'mot' THEN sa.intressent_ids
                ELSE NULL
            END AS intressent_ids,
            d._dlt_id
        FROM {INT_DOCUMENT_CONTENT} d
        LEFT JOIN signatory_agg sa ON sa.dlt_id = d._dlt_id
    """

    if exclude_embedded:
        # Use LEFT JOIN ... IS NULL pattern (more efficient than NOT IN)
        query = f"""
        WITH signatory_agg AS (
            SELECT
                _dlt_root_id AS dlt_id,
                arg_min(partibet, (ordning, _dlt_id)) AS first_parti,
                LIST(intressent_id ORDER BY ordning NULLS LAST) AS intressent_ids
            FROM {DOKUMENTSTATUS_INTRESSENT_SOURCE}
            WHERE roll IN ('undertecknare', 'huvudman')
            GROUP BY _dlt_root_id
        )
        SELECT
            d.dok_id,
            d.dok_typ,
            d.rm,
            d.riksmote_year,
            d.titel,
            d.html,
            d.dokument_url,
            CASE 
                WHEN d.dok_typ = 'prop' THEN 'Regeringen'
                ELSE sa.first_parti
            END AS parti,
            CASE 
                WHEN d.dok_typ = 'mot' THEN sa.intressent_ids
                ELSE NULL
            END AS intressent_ids,
            d._dlt_id
        FROM {INT_DOCUMENT_CONTENT} d
        LEFT JOIN signatory_agg sa ON sa.dlt_id = d._dlt_id
        LEFT JOIN {SOURCE_EMBEDDINGS_TABLE} e ON e.dok_id = d.dok_id
        WHERE {where_clause}
          AND e.dok_id IS NULL
        """
    else:
        query += f"\n        WHERE {where_clause}"

    if limit:
        query += f"\n        LIMIT {limit}"

    return query


def get_unembedded_sources(
    conn: duckdb.DuckDBPyConnection,
    limit: int | None = None,
    riksmote_year: int | None = None,
    dok_typ: str | None = None,
) -> list[dict[str, Any]]:
    """Get source documents that haven't been embedded yet.

    Reads from int_document_content (pre-filtered mot/prop with HTML) and
    parses HTML in Python using BeautifulSoup for better text extraction.

    Args:
        conn: DuckDB connection
        limit: Maximum number of sources to return
        riksmote_year: Filter by riksmöte year (e.g., 2024 for riksmöte 2024/25)
        dok_typ: Filter by document type ('mot' or 'prop')
    """
    embeddings_exist = table_exists(conn, SOURCE_EMBEDDINGS_TABLE)

    query = _build_source_query(
        riksmote_year=riksmote_year,
        dok_typ=dok_typ,
        exclude_embedded=embeddings_exist,
        limit=limit,
    )

    result = conn.execute(query).fetchall()

    sources = []
    for row in result:
        html = row[5]
        content_text = extract_text_from_html(html)

        # Skip documents with no extractable content
        if not content_text or len(content_text) < 100:
            continue

        sources.append({
            "dok_id": row[0],
            "dok_typ": row[1],
            "rm": row[2],
            "riksmote_year": row[3],
            "titel": row[4],
            "content_text": content_text,
            "dokument_url": row[6],
            "parti": row[7],
            "intressent_ids": row[8],
        })

    return sources


def save_source_embeddings(
    conn: duckdb.DuckDBPyConnection,
    sources: list[dict[str, Any]],
    embeddings: list[list[float]],
    model_version: str = EMBEDDING_MODEL,
) -> int:
    """Save source embeddings to MotherDuck using bulk insert.

    Args:
        conn: DuckDB connection
        sources: List of source document dicts (from get_unembedded_sources)
        embeddings: List of embeddings in same order as sources
        model_version: Embedding model version string
    """
    if not sources:
        return 0

    ensure_tables_exist(conn)
    embedded_at = datetime.now(timezone.utc)

    # Prepare data for bulk insert
    rows = [
        (
            source["dok_id"],
            source["dok_typ"],
            source["rm"],
            source["riksmote_year"],
            source["titel"],
            source["content_text"],
            embedding,
            source.get("dokument_url"),
            source.get("parti"),
            source.get("intressent_ids"),
            embedded_at,
            model_version,
        )
        for source, embedding in zip(sources, embeddings)
    ]

    # Bulk insert using executemany (much faster than row-by-row)
    conn.executemany(
        f"""
        INSERT INTO {SOURCE_EMBEDDINGS_TABLE}
        (dok_id, dok_typ, rm, riksmote_year, titel, content_text, embedding,
         dokument_url, parti, intressent_ids, embedded_at, model_version)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
        """,
        rows,
    )
    return len(sources)


def get_counts(
    conn: duckdb.DuckDBPyConnection,
    riksmote_year: int | None = None,
    dok_typ: str | None = None,
) -> dict[str, int]:
    """Get counts of source embeddings and available documents.

    Uses a single aggregation query to minimize memory usage on MotherDuck.

    Args:
        conn: DuckDB connection
        riksmote_year: Filter by riksmöte year
        dok_typ: Filter by document type ('mot' or 'prop')
    """
    counts = {}

    # Embedding counts - single query with conditional aggregation
    emb_filters = []
    if riksmote_year:
        emb_filters.append(f"riksmote_year = {riksmote_year}")
    emb_where = " AND ".join(emb_filters) if emb_filters else "1=1"

    try:
        result = conn.execute(f"""
            SELECT
                COUNT(*) FILTER (WHERE {emb_where}) AS total,
                COUNT(*) FILTER (WHERE dok_typ = 'mot'{f" AND riksmote_year = {riksmote_year}" if riksmote_year else ""}) AS mot,
                COUNT(*) FILTER (WHERE dok_typ = 'prop'{f" AND riksmote_year = {riksmote_year}" if riksmote_year else ""}) AS prop
            FROM {SOURCE_EMBEDDINGS_TABLE}
        """).fetchone()
        counts["source_embeddings"] = result[0]
        counts["source_embeddings_mot"] = result[1]
        counts["source_embeddings_prop"] = result[2]
    except duckdb.CatalogException:
        counts["source_embeddings"] = 0
        counts["source_embeddings_mot"] = 0
        counts["source_embeddings_prop"] = 0

    # Source document counts from int_document_content (pre-filtered table)
    year_filter = ""
    if riksmote_year:
        year_filter = f"AND riksmote_year = {riksmote_year}"

    try:
        result = conn.execute(f"""
            SELECT
                COUNT(*) AS total,
                COUNT(*) FILTER (WHERE dok_typ = 'mot') AS mot,
                COUNT(*) FILTER (WHERE dok_typ = 'prop') AS prop
            FROM {INT_DOCUMENT_CONTENT}
            WHERE 1=1
              {year_filter}
        """).fetchone()
        counts["sources_total"] = result[0]
        counts["sources_mot_total"] = result[1]
        counts["sources_prop_total"] = result[2]
    except duckdb.CatalogException:
        counts["sources_total"] = 0
        counts["sources_mot_total"] = 0
        counts["sources_prop_total"] = 0

    return counts
