"""Unified embedding service with token-aware batching.

Provides a single interface for embedding text with automatic batching
to stay within OpenAI's token limits per request.
"""

import logging
import uuid
from datetime import datetime, timezone
from typing import TYPE_CHECKING, Any

from cognition.core.llm import get_client
from cognition.core.models import (
    CHARS_PER_TOKEN,
    EMBEDDING_DIMENSIONS,
    EMBEDDING_MODEL,
    Chunk,
    EmbeddingRecord,
    EmbeddingResult,
    EntityType,
)

if TYPE_CHECKING:
    from openai import OpenAI

logger = logging.getLogger(__name__)

MAX_TOKENS_PER_REQUEST = 250_000


class EmbeddingService:
    """Service for embedding text with automatic batching.

    Handles token-aware batching to stay within OpenAI's limits,
    and provides convenience methods for embedding chunks with metadata.
    """

    def __init__(
        self,
        model: str = EMBEDDING_MODEL,
        dimensions: int = EMBEDDING_DIMENSIONS,
        max_tokens_per_request: int = MAX_TOKENS_PER_REQUEST,
        client: "OpenAI | None" = None,
    ):
        self.model = model
        self.dimensions = dimensions
        self.max_tokens_per_request = max_tokens_per_request
        self._client = client

    @property
    def client(self) -> "OpenAI":
        if self._client is None:
            self._client = get_client()
        return self._client

    def embed_texts(self, texts: list[str]) -> list[EmbeddingResult]:
        """Embed a list of texts with automatic batching.

        Args:
            texts: List of texts to embed

        Returns:
            List of EmbeddingResult with text, embedding, and token count
        """
        if not texts:
            return []

        results: list[EmbeddingResult] = []
        batch_texts: list[str] = []
        batch_tokens = 0

        def flush_batch() -> None:
            nonlocal batch_texts, batch_tokens
            if not batch_texts:
                return

            logger.debug(f"Embedding batch of {len(batch_texts)} texts (~{batch_tokens} tokens)")
            response = self.client.embeddings.create(
                model=self.model,
                input=batch_texts,
                dimensions=self.dimensions,
            )

            for text, data in zip(batch_texts, response.data):
                results.append(
                    EmbeddingResult(
                        text=text,
                        embedding=data.embedding,
                        tokens_used=len(text) // CHARS_PER_TOKEN,
                    )
                )

            batch_texts = []
            batch_tokens = 0

        for text in texts:
            text_tokens = len(text) // CHARS_PER_TOKEN

            if batch_tokens + text_tokens > self.max_tokens_per_request and batch_texts:
                flush_batch()

            batch_texts.append(text)
            batch_tokens += text_tokens

        flush_batch()
        return results

    def embed_chunks(
        self,
        entity_type: EntityType,
        entity_id: str,
        chunks: list[Chunk],
        metadata: dict[str, Any],
    ) -> list[EmbeddingRecord]:
        """Embed chunks and return records ready for storage.

        Args:
            entity_type: Type of entity ('source' or 'promise')
            entity_id: ID of the entity (dok_id or promise_id)
            chunks: List of Chunk objects to embed
            metadata: Entity-specific metadata to store with each record

        Returns:
            List of EmbeddingRecord ready for database insertion
        """
        if not chunks:
            return []

        texts = [chunk.text for chunk in chunks]
        embedding_results = self.embed_texts(texts)
        embedded_at = datetime.now(timezone.utc)

        records = []
        for chunk, result in zip(chunks, embedding_results):
            records.append(
                EmbeddingRecord(
                    id=str(uuid.uuid4()),
                    entity_type=entity_type,
                    entity_id=entity_id,
                    chunk_index=chunk.index,
                    chunk_text=chunk.text,
                    embedding=result.embedding,
                    metadata=metadata,
                    embedded_at=embedded_at,
                    model_version=self.model,
                )
            )

        return records

    def embed_single(self, text: str) -> list[float]:
        """Embed a single text and return just the embedding vector.

        Convenience method for query embedding.
        """
        results = self.embed_texts([text])
        if not results:
            raise ValueError("Failed to embed text")
        return results[0].embedding


def estimate_cost(
    texts: list[str],
    model: str = EMBEDDING_MODEL,
) -> dict[str, Any]:
    """Estimate the API cost for embedding texts.

    Args:
        texts: List of texts to estimate
        model: Embedding model to use

    Returns:
        Cost estimate dictionary
    """
    total_chars = sum(len(t) for t in texts)
    total_tokens = total_chars // CHARS_PER_TOKEN

    cost_per_million = 0.02 if model == "text-embedding-3-small" else 0.13
    total_cost = (total_tokens / 1_000_000) * cost_per_million

    return {
        "text_count": len(texts),
        "total_chars": total_chars,
        "total_tokens": total_tokens,
        "cost_per_million": cost_per_million,
        "total_cost_usd": total_cost,
        "model": model,
    }
