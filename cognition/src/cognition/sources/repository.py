"""Database operations for source document embeddings.

Reads from int_source_documents (pre-filtered mot/prop with party attribution).

Uses the unified embeddings table via core.repository.EmbeddingRepository.
"""

from typing import Any

import duckdb

from cognition.core.config import INT_SOURCE_DOCUMENTS
from cognition.core.models import EmbeddingRecord
from cognition.core.repository import EmbeddingRepository
from cognition.sources.parser import extract_text_from_html


def get_all_source_ids(
    conn: duckdb.DuckDBPyConnection,
    riksmote_year: int | None = None,
    dok_typ: str | None = None,
    start_date: str | None = None,
    end_date: str | None = None,
) -> list[str]:
    """Get all source document IDs from int_source_documents.

    Args:
        conn: DuckDB connection
        riksmote_year: Filter by riksmöte year
        dok_typ: Filter by document type
        start_date: Filter sources from this date (YYYY-MM-DD)
        end_date: Filter sources until this date (YYYY-MM-DD)
    """
    filters = []
    if riksmote_year:
        filters.append(f"riksmote_year = {riksmote_year}")
    if dok_typ:
        filters.append(f"dok_typ = '{dok_typ}'")
    if start_date:
        filters.append(f"datum >= '{start_date}'")
    if end_date:
        filters.append(f"datum <= '{end_date}'")

    where_clause = " AND ".join(filters) if filters else "1=1"

    result = conn.execute(
        f"SELECT dok_id FROM {INT_SOURCE_DOCUMENTS} WHERE {where_clause}"
    ).fetchall()

    return [row[0] for row in result]


def get_unembedded_sources(
    conn: duckdb.DuckDBPyConnection,
    limit: int | None = None,
    riksmote_year: int | None = None,
    dok_typ: str | None = None,
    start_date: str | None = None,
    end_date: str | None = None,
) -> list[dict[str, Any]]:
    """Get source documents that haven't been embedded yet.

    Args:
        conn: DuckDB connection
        limit: Maximum number of sources to return
        riksmote_year: Filter by riksmöte year (e.g., 2024 for riksmöte 2024/25)
        dok_typ: Filter by document type ('mot' or 'prop')
        start_date: Filter sources from this date (YYYY-MM-DD)
        end_date: Filter sources until this date (YYYY-MM-DD)
    """
    repo = EmbeddingRepository(conn)

    all_ids = get_all_source_ids(
        conn,
        riksmote_year=riksmote_year,
        dok_typ=dok_typ,
        start_date=start_date,
        end_date=end_date,
    )
    unembedded_ids = repo.get_unembedded_entity_ids("source", all_ids)

    if not unembedded_ids:
        return []

    ids_str = ", ".join(f"'{id}'" for id in unembedded_ids)

    query = f"""
        SELECT
            s.dok_id,
            s.dok_typ,
            s.rm,
            s.riksmote_year,
            s.titel,
            c.html,
            s.dokument_url,
            s.parti,
            s.intressent_ids
        FROM {INT_SOURCE_DOCUMENTS} s
        JOIN main_int.int_document_content c ON c.dok_id = s.dok_id
        WHERE s.dok_id IN ({ids_str})
    """

    if limit:
        query += f"\n        LIMIT {limit}"

    result = conn.execute(query).fetchall()

    sources = []
    for row in result:
        html = row[5]
        content_text = extract_text_from_html(html)

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
    records: list[EmbeddingRecord],
) -> int:
    """Save source embeddings to the unified embeddings table.

    Args:
        conn: DuckDB connection
        records: List of EmbeddingRecord from embed_sources()

    Returns:
        Number of records saved
    """
    repo = EmbeddingRepository(conn)
    return repo.save(records)


def get_counts(
    conn: duckdb.DuckDBPyConnection,
    riksmote_year: int | None = None,
    dok_typ: str | None = None,
) -> dict[str, int]:
    """Get counts of source embeddings and available documents.

    Args:
        conn: DuckDB connection
        riksmote_year: Filter by riksmöte year
        dok_typ: Filter by document type ('mot' or 'prop')
    """
    repo = EmbeddingRepository(conn)

    metadata_filter = {}
    if riksmote_year:
        metadata_filter["riksmote_year"] = riksmote_year
    if dok_typ:
        metadata_filter["dok_typ"] = dok_typ

    embedding_counts = repo.get_counts(
        entity_type="source",
        metadata_filter=metadata_filter if metadata_filter else None,
    )

    filters = []
    if riksmote_year:
        filters.append(f"riksmote_year = {riksmote_year}")
    if dok_typ:
        filters.append(f"dok_typ = '{dok_typ}'")

    where_clause = " AND ".join(filters) if filters else "1=1"

    try:
        result = conn.execute(f"""
            SELECT
                COUNT(*) AS total,
                COUNT(*) FILTER (WHERE dok_typ = 'mot') AS mot,
                COUNT(*) FILTER (WHERE dok_typ = 'prop') AS prop
            FROM {INT_SOURCE_DOCUMENTS}
            WHERE {where_clause}
        """).fetchone()
        sources_total = result[0]
        sources_mot = result[1]
        sources_prop = result[2]
    except Exception:
        sources_total = 0
        sources_mot = 0
        sources_prop = 0

    return {
        "source_embeddings": embedding_counts["embeddings"],
        "source_entities": embedding_counts["entities"],
        "sources_total": sources_total,
        "sources_mot_total": sources_mot,
        "sources_prop_total": sources_prop,
    }
