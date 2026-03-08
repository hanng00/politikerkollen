"""Unified embedding models and constants.

Single source of truth for embedding configuration across the cognition module.
All embedding-related code should import from here, not define their own constants.
"""

from dataclasses import dataclass, field
from datetime import datetime
from typing import Any, Literal

EMBEDDING_MODEL = "text-embedding-3-small"
EMBEDDING_DIMENSIONS = 1536
MAX_TOKENS = 8191
CHARS_PER_TOKEN = 4

EntityType = Literal["source", "promise"]


@dataclass
class Chunk:
    """A chunk of text from a document."""

    index: int
    text: str
    start_char: int
    end_char: int


@dataclass
class EmbeddingRecord:
    """A single embedding record for storage.

    Unified structure for both source documents and promises.
    Entity-specific fields are stored in metadata as JSON.
    """

    id: str
    entity_type: EntityType
    entity_id: str
    chunk_index: int
    chunk_text: str
    embedding: list[float]
    metadata: dict[str, Any]
    embedded_at: datetime
    model_version: str = EMBEDDING_MODEL

    def to_row(self) -> tuple:
        """Convert to a tuple for database insertion."""
        import json

        return (
            self.id,
            self.entity_type,
            self.entity_id,
            self.chunk_index,
            self.chunk_text,
            self.embedding,
            json.dumps(self.metadata),
            self.embedded_at,
            self.model_version,
        )


@dataclass
class EmbeddingResult:
    """Result from embedding a single text."""

    text: str
    embedding: list[float]
    tokens_used: int


@dataclass
class SearchResult:
    """A single search result with similarity score."""

    id: str
    entity_type: EntityType
    entity_id: str
    chunk_index: int
    chunk_text: str
    metadata: dict[str, Any]
    similarity: float


@dataclass
class AggregatedSearchResult:
    """Search result aggregated across chunks for an entity."""

    entity_type: EntityType
    entity_id: str
    score: float
    best_chunk_text: str
    best_chunk_index: int
    metadata: dict[str, Any]


def get_embeddings_table_ddl(schema: str = "cognition") -> str:
    """Generate DDL for the unified embeddings table."""
    return f"""
        CREATE TABLE IF NOT EXISTS {schema}.embeddings (
            id VARCHAR PRIMARY KEY,
            entity_type VARCHAR NOT NULL,
            entity_id VARCHAR NOT NULL,
            chunk_index INTEGER NOT NULL,
            chunk_text VARCHAR NOT NULL,
            embedding FLOAT[{EMBEDDING_DIMENSIONS}] NOT NULL,
            metadata JSON,
            embedded_at TIMESTAMP NOT NULL,
            model_version VARCHAR NOT NULL,
            UNIQUE (entity_type, entity_id, chunk_index, model_version)
        )
    """
