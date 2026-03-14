"""Database operations for source document embeddings.

Reads plain text from cognition.source_texts (populated by build_source_texts).

Uses the unified embeddings table via core.repository.EmbeddingRepository.
"""

from typing import Any

import duckdb

from cognition.core.config import INT_SOURCE_DOCUMENTS
from cognition.core.models import EmbeddingRecord
from cognition.core.repository import EmbeddingRepository
from cognition.modules.build_source_texts.repository import SOURCE_TEXTS_TABLE


def get_all_source_ids(
    conn: duckdb.DuckDBPyConnection,
    riksmote_year: int | None = None,
    dok_typ: str | None = None,
    start_date: str | None = None,
    end_date: str | None = None,
) -> list[str]:
    """Get all source document IDs that have text extracted.

    Only returns IDs present in source_texts (upstream dependency).
    """
    filters = ["1=1"]
    if riksmote_year:
        filters.append(f"st.riksmote_year = {riksmote_year}")
    if dok_typ:
        filters.append(f"st.dok_typ = '{dok_typ}'")
    if start_date:
        filters.append(f"s.datum >= '{start_date}'")
    if end_date:
        filters.append(f"s.datum <= '{end_date}'")

    where_clause = " AND ".join(filters)

    result = conn.execute(f"""
        SELECT st.dok_id
        FROM {SOURCE_TEXTS_TABLE} st
        JOIN {INT_SOURCE_DOCUMENTS} s ON s.dok_id = st.dok_id
        WHERE {where_clause}
    """).fetchall()

    return [row[0] for row in result]


def get_unembedded_sources(
    conn: duckdb.DuckDBPyConnection,
    limit: int | None = None,
    riksmote_year: int | None = None,
    dok_typ: str | None = None,
    start_date: str | None = None,
    end_date: str | None = None,
    batch_size: int = 500,
) -> list[dict[str, Any]]:
    """Get source documents that haven't been embedded yet.

    Reads plain text from cognition.source_texts instead of parsing HTML.
    Fetches in batches to avoid MotherDuck timeouts.
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

    if limit:
        unembedded_ids = unembedded_ids[:limit]

    sources = []
    for i in range(0, len(unembedded_ids), batch_size):
        batch_ids = unembedded_ids[i : i + batch_size]
        ids_str = ", ".join(f"'{id}'" for id in batch_ids)

        query = f"""
            SELECT
                st.dok_id,
                st.dok_typ,
                s.rm,
                st.riksmote_year,
                st.titel,
                st.full_text,
                s.dokument_url,
                st.parti,
                s.intressent_ids
            FROM {SOURCE_TEXTS_TABLE} st
            JOIN {INT_SOURCE_DOCUMENTS} s ON s.dok_id = st.dok_id
            WHERE st.dok_id IN ({ids_str})
        """

        result = conn.execute(query).fetchall()

        for row in result:
            sources.append({
                "dok_id": row[0],
                "dok_typ": row[1],
                "rm": row[2],
                "riksmote_year": row[3],
                "titel": row[4],
                "content_text": row[5],
                "dokument_url": row[6],
                "parti": row[7],
                "intressent_ids": row[8],
            })

    return sources


def save_source_embeddings(
    conn: duckdb.DuckDBPyConnection,
    records: list[EmbeddingRecord],
) -> int:
    """Save source embeddings to the unified embeddings table."""
    repo = EmbeddingRepository(conn)
    return repo.save(records)


def get_counts(
    conn: duckdb.DuckDBPyConnection,
    riksmote_year: int | None = None,
    dok_typ: str | None = None,
) -> dict[str, int]:
    """Get counts of source embeddings and available documents."""
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
            FROM {SOURCE_TEXTS_TABLE}
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
