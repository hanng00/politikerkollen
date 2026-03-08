"""Promise embedding using the unified embedding system.

Promises are short texts that fit within token limits, so we use
NoChunking (single chunk per promise).
"""

import logging
from typing import Any

from cognition.core.chunking import NoChunking
from cognition.core.embedding import EmbeddingService, estimate_cost as core_estimate_cost
from cognition.core.models import EMBEDDING_MODEL, EmbeddingRecord

logger = logging.getLogger(__name__)

DEFAULT_CHUNKING = NoChunking()


def prepare_promise_text(promise: dict[str, Any]) -> str:
    """Prepare promise text for embedding."""
    return promise.get("promise_text", "") or ""


def embed_promise(
    promise: dict[str, Any],
    service: EmbeddingService | None = None,
) -> list[EmbeddingRecord]:
    """Embed a single promise.

    Args:
        promise: Promise dict with promise_id and promise_text
        service: EmbeddingService instance (creates default if not provided)

    Returns:
        List with single EmbeddingRecord (promises are single-chunk)
    """
    if service is None:
        service = EmbeddingService()

    text = prepare_promise_text(promise)
    if not text:
        logger.warning(f"Empty text for promise {promise.get('promise_id')}")
        return []

    chunks = DEFAULT_CHUNKING.chunk(text)
    if not chunks:
        return []

    metadata = {
        "party": promise.get("party"),
        "year": promise.get("year"),
        "category": promise.get("category"),
        "promise_text": text,
    }

    return service.embed_chunks(
        entity_type="promise",
        entity_id=promise["promise_id"],
        chunks=chunks,
        metadata=metadata,
    )


def embed_promises(
    promises: list[dict[str, Any]],
    service: EmbeddingService | None = None,
) -> list[EmbeddingRecord]:
    """Embed multiple promises.

    Args:
        promises: List of promise dicts with promise_id and promise_text
        service: EmbeddingService instance (creates default if not provided)

    Returns:
        List of EmbeddingRecord (one per promise)
    """
    if not promises:
        return []

    if service is None:
        service = EmbeddingService()

    all_records: list[EmbeddingRecord] = []

    for promise in promises:
        records = embed_promise(promise, service=service)
        all_records.extend(records)

    return all_records


def estimate_cost(
    promises: list[dict[str, Any]],
) -> dict[str, Any]:
    """Estimate the API cost for embedding promises.

    Args:
        promises: List of promise dicts

    Returns:
        Cost estimate dictionary
    """
    texts = [prepare_promise_text(p) for p in promises]
    base_estimate = core_estimate_cost(texts)

    return {
        "promise_count": len(promises),
        **base_estimate,
    }
