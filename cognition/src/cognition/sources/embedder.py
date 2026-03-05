"""Source document embedding - text preparation and embedding operations.

Source documents (motions and propositions) can be large (avg 26KB for motions,
792KB for propositions). This module handles:
1. Text truncation to fit within token limits
2. HTML cleaning for better embedding quality
"""

import re
from typing import TYPE_CHECKING, Any

from cognition.core.llm import get_client
from cognition.sources.models import EMBEDDING_MODEL

if TYPE_CHECKING:
    from openai import OpenAI

EMBEDDING_DIMENSIONS = 1536
MAX_TOKENS = 8191
CHARS_PER_TOKEN = 4


def clean_text(text: str) -> str:
    """Clean text for better embedding quality."""
    text = re.sub(r"\s+", " ", text)
    text = re.sub(r"^\s*Riksdagen\s*$", "", text, flags=re.MULTILINE)
    text = text.strip()
    return text


def truncate_text(text: str, max_chars: int | None = None) -> str:
    """Truncate text to fit within token limits."""
    if max_chars is None:
        max_chars = MAX_TOKENS * CHARS_PER_TOKEN

    if len(text) <= max_chars:
        return text

    return text[:max_chars]


def prepare_source_text(source: dict[str, Any]) -> str:
    """Prepare source document text for embedding.

    Combines title and content, cleans, and truncates.
    """
    title = source.get("titel", "")
    content = source.get("content_text", "")

    combined = f"{title}\n\n{content}" if title else content
    cleaned = clean_text(combined)
    truncated = truncate_text(cleaned)

    return truncated


def embed_sources(
    sources: list[dict[str, Any]],
    client: "OpenAI | None" = None,
) -> dict[str, list[float]]:
    """Embed source documents.

    Args:
        sources: List of source document dicts with dok_id, titel, content_text
        client: OpenAI client (uses default if not provided)

    Returns:
        Dict mapping dok_id -> embedding vector
    """
    if not sources:
        return {}

    if client is None:
        client = get_client()

    # Deduplicate by dok_id
    seen_ids: set[str] = set()
    unique_sources = []
    for s in sources:
        dok_id = s["dok_id"]
        if dok_id not in seen_ids:
            seen_ids.add(dok_id)
            unique_sources.append(s)

    texts = [prepare_source_text(s) for s in unique_sources]
    ids = [s["dok_id"] for s in unique_sources]

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


def estimate_cost(sources: list[dict[str, Any]]) -> dict[str, Any]:
    """Estimate the API cost for embedding source documents.

    Args:
        sources: List of source document dicts

    Returns:
        Cost estimate dictionary
    """
    total_chars = sum(len(prepare_source_text(s)) for s in sources)
    total_tokens = total_chars // CHARS_PER_TOKEN
    avg_tokens = total_tokens // len(sources) if sources else 0

    cost_per_million = 0.02
    total_cost = (total_tokens / 1_000_000) * cost_per_million

    return {
        "source_count": len(sources),
        "total_chars": total_chars,
        "avg_tokens_per_source": avg_tokens,
        "total_tokens": total_tokens,
        "cost_per_million": cost_per_million,
        "total_cost_usd": total_cost,
        "model": EMBEDDING_MODEL,
    }
