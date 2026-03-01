"""Embedding generator using OpenAI text-embedding-3-small."""

import asyncio
from typing import Any

import openai

from cognition.embeddings.models import EMBEDDING_DIMENSIONS, EMBEDDING_MODEL


def get_client() -> openai.OpenAI:
    """Get OpenAI client (uses OPENAI_API_KEY env var)."""
    return openai.OpenAI()


async def embed_text_async(text: str, client: openai.OpenAI | None = None) -> list[float]:
    """Generate embedding for a single text string."""
    if client is None:
        client = get_client()

    response = await asyncio.to_thread(
        client.embeddings.create,
        model=EMBEDDING_MODEL,
        input=text,
        dimensions=EMBEDDING_DIMENSIONS,
    )
    return response.data[0].embedding


def embed_text(text: str, client: openai.OpenAI | None = None) -> list[float]:
    """Synchronous wrapper for embed_text_async."""
    return asyncio.run(embed_text_async(text, client))


async def embed_batch_async(
    texts: list[str],
    client: openai.OpenAI | None = None,
    batch_size: int = 100,
) -> list[list[float]]:
    """Generate embeddings for multiple texts in batches."""
    if client is None:
        client = get_client()

    all_embeddings = []
    for i in range(0, len(texts), batch_size):
        batch = texts[i : i + batch_size]
        response = await asyncio.to_thread(
            client.embeddings.create,
            model=EMBEDDING_MODEL,
            input=batch,
            dimensions=EMBEDDING_DIMENSIONS,
        )
        batch_embeddings = [item.embedding for item in response.data]
        all_embeddings.extend(batch_embeddings)

    return all_embeddings


def embed_batch(
    texts: list[str],
    client: openai.OpenAI | None = None,
    batch_size: int = 100,
) -> list[list[float]]:
    """Synchronous wrapper for embed_batch_async."""
    return asyncio.run(embed_batch_async(texts, client, batch_size))


def estimate_cost(text_count: int, avg_tokens_per_text: int = 100) -> dict[str, Any]:
    """Estimate the API cost for embedding texts."""
    total_tokens = text_count * avg_tokens_per_text
    cost_per_million = 0.02
    total_cost = (total_tokens / 1_000_000) * cost_per_million

    return {
        "text_count": text_count,
        "avg_tokens_per_text": avg_tokens_per_text,
        "total_tokens": total_tokens,
        "cost_per_million": cost_per_million,
        "total_cost_usd": total_cost,
        "model": EMBEDDING_MODEL,
    }
