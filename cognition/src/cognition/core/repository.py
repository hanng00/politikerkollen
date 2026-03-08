"""Unified embedding repository for storage and retrieval.

Provides a single interface for storing and querying embeddings
from the unified embeddings table.
"""

import json
import logging
from typing import Any, Literal

import duckdb

from cognition.core.config import SCHEMA
from cognition.core.db import ensure_schema_exists, table_exists
from cognition.core.models import (
    EMBEDDING_DIMENSIONS,
    AggregatedSearchResult,
    EmbeddingRecord,
    EntityType,
    SearchResult,
    get_embeddings_table_ddl,
)

logger = logging.getLogger(__name__)

EMBEDDINGS_TABLE = f"{SCHEMA}.embeddings"


class EmbeddingRepository:
    """Repository for unified embedding storage and retrieval."""

    def __init__(self, conn: duckdb.DuckDBPyConnection):
        self.conn = conn
        self._table_ensured = False

    def ensure_table_exists(self) -> None:
        """Create the embeddings table if it doesn't exist."""
        if self._table_ensured:
            return

        ensure_schema_exists(self.conn, SCHEMA)
        ddl = get_embeddings_table_ddl(SCHEMA)
        self.conn.execute(ddl)
        self._table_ensured = True

    def save(self, records: list[EmbeddingRecord]) -> int:
        """Save embedding records to the database.

        Args:
            records: List of EmbeddingRecord to save

        Returns:
            Number of records saved
        """
        if not records:
            return 0

        self.ensure_table_exists()

        rows = [record.to_row() for record in records]

        self.conn.executemany(
            f"""
            INSERT INTO {EMBEDDINGS_TABLE}
            (id, entity_type, entity_id, chunk_index, chunk_text, embedding,
             metadata, embedded_at, model_version)
            VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
            """,
            rows,
        )

        return len(records)

    def get_by_entity(
        self,
        entity_type: EntityType,
        entity_id: str,
    ) -> list[EmbeddingRecord]:
        """Get all embedding records for an entity.

        Args:
            entity_type: Type of entity ('source' or 'promise')
            entity_id: ID of the entity

        Returns:
            List of EmbeddingRecord for the entity
        """
        if not table_exists(self.conn, EMBEDDINGS_TABLE):
            return []

        result = self.conn.execute(
            f"""
            SELECT id, entity_type, entity_id, chunk_index, chunk_text,
                   embedding, metadata, embedded_at, model_version
            FROM {EMBEDDINGS_TABLE}
            WHERE entity_type = ? AND entity_id = ?
            ORDER BY chunk_index
            """,
            [entity_type, entity_id],
        ).fetchall()

        return [self._row_to_record(row) for row in result]

    def delete_by_entity(
        self,
        entity_type: EntityType,
        entity_id: str,
    ) -> int:
        """Delete all embedding records for an entity.

        Args:
            entity_type: Type of entity
            entity_id: ID of the entity

        Returns:
            Number of records deleted
        """
        if not table_exists(self.conn, EMBEDDINGS_TABLE):
            return 0

        result = self.conn.execute(
            f"""
            DELETE FROM {EMBEDDINGS_TABLE}
            WHERE entity_type = ? AND entity_id = ?
            """,
            [entity_type, entity_id],
        )

        return result.rowcount if hasattr(result, "rowcount") else 0

    def search(
        self,
        query_embedding: list[float],
        entity_type: EntityType | None = None,
        limit: int = 20,
        threshold: float = 0.0,
        metadata_filter: dict[str, Any] | None = None,
    ) -> list[SearchResult]:
        """Search for similar embeddings.

        Args:
            query_embedding: Query embedding vector
            entity_type: Filter by entity type (optional)
            limit: Maximum number of results
            threshold: Minimum similarity threshold
            metadata_filter: Filter by metadata fields (optional)

        Returns:
            List of SearchResult ordered by similarity
        """
        if not table_exists(self.conn, EMBEDDINGS_TABLE):
            return []

        embedding_literal = f"[{','.join(str(x) for x in query_embedding)}]::FLOAT[{EMBEDDING_DIMENSIONS}]"

        where_clauses = [f"array_cosine_similarity(embedding, {embedding_literal}) >= {threshold}"]

        if entity_type:
            where_clauses.append(f"entity_type = '{entity_type}'")

        if metadata_filter:
            for key, value in metadata_filter.items():
                if isinstance(value, str):
                    where_clauses.append(f"metadata->>'$.{key}' = '{value}'")
                elif isinstance(value, (int, float)):
                    where_clauses.append(f"CAST(metadata->>'$.{key}' AS INTEGER) = {value}")
                elif isinstance(value, list):
                    values_str = ", ".join(str(v) for v in value)
                    where_clauses.append(f"CAST(metadata->>'$.{key}' AS INTEGER) IN ({values_str})")

        where_sql = " AND ".join(where_clauses)

        sql = f"""
            SELECT
                id,
                entity_type,
                entity_id,
                chunk_index,
                chunk_text,
                metadata,
                array_cosine_similarity(embedding, {embedding_literal}) as similarity
            FROM {EMBEDDINGS_TABLE}
            WHERE {where_sql}
            ORDER BY similarity DESC
            LIMIT {limit}
        """

        result = self.conn.execute(sql).fetchall()

        return [
            SearchResult(
                id=row[0],
                entity_type=row[1],
                entity_id=row[2],
                chunk_index=row[3],
                chunk_text=row[4],
                metadata=json.loads(row[5]) if row[5] else {},
                similarity=row[6],
            )
            for row in result
        ]

    def search_and_aggregate(
        self,
        query_embedding: list[float],
        entity_type: EntityType,
        aggregation: Literal["max", "mean", "sum"] = "max",
        limit: int = 20,
        threshold: float = 0.0,
        metadata_filter: dict[str, Any] | None = None,
    ) -> list[AggregatedSearchResult]:
        """Search and aggregate chunk scores by entity.

        Args:
            query_embedding: Query embedding vector
            entity_type: Entity type to search
            aggregation: How to aggregate chunk scores ('max', 'mean', 'sum')
            limit: Maximum number of entities to return
            threshold: Minimum similarity threshold for chunks
            metadata_filter: Filter by metadata fields (optional)

        Returns:
            List of AggregatedSearchResult ordered by aggregated score
        """
        if not table_exists(self.conn, EMBEDDINGS_TABLE):
            return []

        embedding_literal = f"[{','.join(str(x) for x in query_embedding)}]::FLOAT[{EMBEDDING_DIMENSIONS}]"

        where_clauses = [
            f"entity_type = '{entity_type}'",
            f"array_cosine_similarity(embedding, {embedding_literal}) >= {threshold}",
        ]

        if metadata_filter:
            for key, value in metadata_filter.items():
                if isinstance(value, str):
                    where_clauses.append(f"metadata->>'$.{key}' = '{value}'")
                elif isinstance(value, (int, float)):
                    where_clauses.append(f"CAST(metadata->>'$.{key}' AS INTEGER) = {value}")
                elif isinstance(value, list):
                    values_str = ", ".join(str(v) for v in value)
                    where_clauses.append(f"CAST(metadata->>'$.{key}' AS INTEGER) IN ({values_str})")

        where_sql = " AND ".join(where_clauses)

        agg_func = {"max": "MAX", "mean": "AVG", "sum": "SUM"}[aggregation]

        sql = f"""
            WITH chunk_scores AS (
                SELECT
                    entity_id,
                    chunk_index,
                    chunk_text,
                    metadata,
                    array_cosine_similarity(embedding, {embedding_literal}) as similarity
                FROM {EMBEDDINGS_TABLE}
                WHERE {where_sql}
            ),
            best_chunks AS (
                SELECT
                    entity_id,
                    chunk_index,
                    chunk_text,
                    metadata,
                    similarity,
                    ROW_NUMBER() OVER (PARTITION BY entity_id ORDER BY similarity DESC) as rn
                FROM chunk_scores
            )
            SELECT
                '{entity_type}' as entity_type,
                bc.entity_id,
                {agg_func}(cs.similarity) as score,
                bc.chunk_text as best_chunk_text,
                bc.chunk_index as best_chunk_index,
                bc.metadata
            FROM chunk_scores cs
            JOIN best_chunks bc ON cs.entity_id = bc.entity_id AND bc.rn = 1
            GROUP BY bc.entity_id, bc.chunk_text, bc.chunk_index, bc.metadata
            ORDER BY score DESC
            LIMIT {limit}
        """

        result = self.conn.execute(sql).fetchall()

        return [
            AggregatedSearchResult(
                entity_type=row[0],
                entity_id=row[1],
                score=row[2],
                best_chunk_text=row[3],
                best_chunk_index=row[4],
                metadata=json.loads(row[5]) if row[5] else {},
            )
            for row in result
        ]

    def get_counts(
        self,
        entity_type: EntityType | None = None,
        metadata_filter: dict[str, Any] | None = None,
    ) -> dict[str, int]:
        """Get counts of embeddings and entities.

        Args:
            entity_type: Filter by entity type (optional)
            metadata_filter: Filter by metadata fields (optional)

        Returns:
            Dict with 'embeddings' (chunk count) and 'entities' (unique entity count)
        """
        if not table_exists(self.conn, EMBEDDINGS_TABLE):
            return {"embeddings": 0, "entities": 0}

        where_clauses = []

        if entity_type:
            where_clauses.append(f"entity_type = '{entity_type}'")

        if metadata_filter:
            for key, value in metadata_filter.items():
                if isinstance(value, str):
                    where_clauses.append(f"metadata->>'$.{key}' = '{value}'")
                elif isinstance(value, (int, float)):
                    where_clauses.append(f"CAST(metadata->>'$.{key}' AS INTEGER) = {value}")
                elif isinstance(value, list):
                    values_str = ", ".join(str(v) for v in value)
                    where_clauses.append(f"CAST(metadata->>'$.{key}' AS INTEGER) IN ({values_str})")

        where_sql = " AND ".join(where_clauses) if where_clauses else "1=1"

        result = self.conn.execute(
            f"""
            SELECT
                COUNT(*) as embeddings,
                COUNT(DISTINCT entity_id) as entities
            FROM {EMBEDDINGS_TABLE}
            WHERE {where_sql}
            """
        ).fetchone()

        return {
            "embeddings": result[0],
            "entities": result[1],
        }

    def get_unembedded_entity_ids(
        self,
        entity_type: EntityType,
        all_entity_ids: list[str],
    ) -> list[str]:
        """Get entity IDs that haven't been embedded yet.

        Args:
            entity_type: Entity type to check
            all_entity_ids: List of all entity IDs to check

        Returns:
            List of entity IDs that don't have embeddings
        """
        if not all_entity_ids:
            return []

        if not table_exists(self.conn, EMBEDDINGS_TABLE):
            return all_entity_ids

        ids_str = ", ".join(f"'{id}'" for id in all_entity_ids)

        result = self.conn.execute(
            f"""
            SELECT DISTINCT entity_id
            FROM {EMBEDDINGS_TABLE}
            WHERE entity_type = '{entity_type}'
              AND entity_id IN ({ids_str})
            """
        ).fetchall()

        embedded_ids = {row[0] for row in result}
        return [id for id in all_entity_ids if id not in embedded_ids]

    def _row_to_record(self, row: tuple) -> EmbeddingRecord:
        """Convert a database row to an EmbeddingRecord."""
        return EmbeddingRecord(
            id=row[0],
            entity_type=row[1],
            entity_id=row[2],
            chunk_index=row[3],
            chunk_text=row[4],
            embedding=row[5],
            metadata=json.loads(row[6]) if row[6] else {},
            embedded_at=row[7],
            model_version=row[8],
        )
