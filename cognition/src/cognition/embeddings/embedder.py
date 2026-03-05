"""Promise embedding - text preparation and embedding operations."""

from typing import TYPE_CHECKING, Any

from cognition.core.llm import get_client
from cognition.embeddings.models import EMBEDDING_MODEL

if TYPE_CHECKING:
    from openai import OpenAI

EMBEDDING_DIMENSIONS = 1536


def prepare_promise_text(promise: dict[str, Any]) -> str:
    """Prepare promise text for embedding."""
    return promise.get("promise_text", "") or ""


def embed_promises(
    promises: list[dict[str, Any]],
    client: "OpenAI | None" = None,
) -> dict[str, list[float]]:
    """Embed promises.

    Args:
        promises: List of dicts with promise_id and promise_text
        client: OpenAI client (uses default if not provided)

    Returns:
        Dict mapping promise_id -> embedding vector
    """
    if not promises:
        return {}

    if client is None:
        client = get_client()

    texts = [prepare_promise_text(p) for p in promises]
    ids = [p["promise_id"] for p in promises]

    results = {}
    batch_size = 2048  # OpenAI's max per request
    for i in range(0, len(texts), batch_size):
        batch_texts = texts[i : i + batch_size]
        batch_ids = ids[i : i + batch_size]
        response = client.embeddings.create(
            model=EMBEDDING_MODEL,
            input=batch_texts,
            dimensions=EMBEDDING_DIMENSIONS,
        )
        for id_, data in zip(batch_ids, response.data):
            results[id_] = data.embedding

    return results


def estimate_cost(text_count: int, avg_tokens_per_text: int = 100) -> dict[str, Any]:
    """Estimate the API cost for embedding promises.

    Args:
        text_count: Number of promises to embed
        avg_tokens_per_text: Average tokens per promise text

    Returns:
        Cost estimate dictionary
    """
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
