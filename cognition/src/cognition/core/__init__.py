"""Core infrastructure for cognition module."""

from cognition.core.chunking import (
    Chunk,
    ChunkingStrategy,
    NoChunking,
    ParagraphChunking,
    SlidingWindowChunking,
)
from cognition.core.config import get_root_path, load_env, setup_logging
from cognition.core.db import get_connection, python_type_to_sql
from cognition.core.embedding import EmbeddingService, estimate_cost
from cognition.core.models import (
    CHARS_PER_TOKEN,
    EMBEDDING_DIMENSIONS,
    EMBEDDING_MODEL,
    MAX_TOKENS,
    AggregatedSearchResult,
    EmbeddingRecord,
    EmbeddingResult,
    EntityType,
    SearchResult,
    get_embeddings_columns,
    get_embeddings_table_ddl,
)
from cognition.core.operations import (
    BatchStatus,
    EmbeddingRequest,
    ExecutionMode,
    ExtractionRequest,
    embed_texts,
    estimate_embedding_cost,
    estimate_extraction_cost,
    extract_structured,
)
from cognition.core.repository import EmbeddingRepository

__all__ = [
    # Chunking
    "Chunk",
    "ChunkingStrategy",
    "NoChunking",
    "ParagraphChunking",
    "SlidingWindowChunking",
    # Embedding
    "EmbeddingService",
    "estimate_cost",
    # Models
    "CHARS_PER_TOKEN",
    "EMBEDDING_DIMENSIONS",
    "EMBEDDING_MODEL",
    "MAX_TOKENS",
    "AggregatedSearchResult",
    "EmbeddingRecord",
    "EmbeddingResult",
    "EntityType",
    "SearchResult",
    "get_embeddings_columns",
    "get_embeddings_table_ddl",
    # Repository
    "EmbeddingRepository",
    # Legacy operations
    "BatchStatus",
    "EmbeddingRequest",
    "ExecutionMode",
    "ExtractionRequest",
    "embed_texts",
    "estimate_embedding_cost",
    "estimate_extraction_cost",
    "extract_structured",
    # Config/DB
    "get_connection",
    "get_root_path",
    "load_env",
    "python_type_to_sql",
    "setup_logging",
]
