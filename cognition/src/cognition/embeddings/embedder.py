"""Embedding generator using OpenAI text-embedding-3-small."""

import asyncio
from typing import Any

import openai

from cognition.embeddings.models import EMBEDDING_DIMENSIONS, EMBEDDING_MODEL


def get_client() -> openai.OpenAI:
    """Get OpenAI client (uses OPENAI_API_KEY env var)."""
    return openai.OpenAI()


async def embed_text_async(
    text: str, client: openai.OpenAI | None = None
) -> list[float]:
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
    max_concurrency: int = 1,
) -> list[list[float]]:
    """Generate embeddings for multiple texts in batches.
    
    Args:
        texts: List of texts to embed
        client: OpenAI client
        batch_size: Number of texts per API call (max 2048)
        max_concurrency: Number of concurrent API calls
        
    Returns:
        List of embeddings in same order as input texts
    """
    if client is None:
        client = get_client()

    batches = [texts[i : i + batch_size] for i in range(0, len(texts), batch_size)]
    
    if max_concurrency <= 1:
        all_embeddings = []
        for batch in batches:
            response = await asyncio.to_thread(
                client.embeddings.create,
                model=EMBEDDING_MODEL,
                input=batch,
                dimensions=EMBEDDING_DIMENSIONS,
            )
            all_embeddings.extend([item.embedding for item in response.data])
        return all_embeddings
    
    semaphore = asyncio.Semaphore(max_concurrency)
    
    async def embed_one_batch(batch_idx: int, batch: list[str]) -> tuple[int, list[list[float]]]:
        async with semaphore:
            response = await asyncio.to_thread(
                client.embeddings.create,
                model=EMBEDDING_MODEL,
                input=batch,
                dimensions=EMBEDDING_DIMENSIONS,
            )
            return batch_idx, [item.embedding for item in response.data]
    
    tasks = [embed_one_batch(i, batch) for i, batch in enumerate(batches)]
    results = await asyncio.gather(*tasks)
    
    results.sort(key=lambda x: x[0])
    all_embeddings = []
    for _, embeddings in results:
        all_embeddings.extend(embeddings)
    
    return all_embeddings


def embed_batch(
    texts: list[str],
    client: openai.OpenAI | None = None,
    batch_size: int = 100,
    max_concurrency: int = 1,
) -> list[list[float]]:
    """Synchronous wrapper for embed_batch_async."""
    return asyncio.run(embed_batch_async(texts, client, batch_size, max_concurrency))


def estimate_cost(
    text_count: int,
    avg_tokens_per_text: int = 100,
    use_batch_api: bool = False,
) -> dict[str, Any]:
    """Estimate the API cost for embedding texts.
    
    Args:
        text_count: Number of texts to embed
        avg_tokens_per_text: Average tokens per text
        use_batch_api: If True, apply 50% batch discount
    """
    total_tokens = text_count * avg_tokens_per_text
    cost_per_million = 0.02
    
    if use_batch_api:
        cost_per_million *= 0.5
    
    total_cost = (total_tokens / 1_000_000) * cost_per_million

    return {
        "text_count": text_count,
        "avg_tokens_per_text": avg_tokens_per_text,
        "total_tokens": total_tokens,
        "cost_per_million": cost_per_million,
        "total_cost_usd": total_cost,
        "model": EMBEDDING_MODEL,
        "batch_api": use_batch_api,
    }
