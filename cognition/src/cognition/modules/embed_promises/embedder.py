"""Promise embedding using the unified embedding system.

Promises are short texts that fit within token limits, so we use
NoChunking (single chunk per promise).
"""

import logging
import uuid
from datetime import datetime, timezone
from typing import Any

from cognition.core.embedding import (
    EmbeddingService,
)
from cognition.core.embedding import (
    estimate_cost as core_estimate_cost,
)
from cognition.core.models import EmbeddingRecord

logger = logging.getLogger(__name__)


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

    results = service.embed_texts([text])
    if not results:
        return []

    metadata = {
        "party": promise.get("party"),
        "year": promise.get("year"),
        "category": promise.get("category"),
        "promise_text": text,
    }

    return [
        EmbeddingRecord(
            id=str(uuid.uuid4()),
            entity_type="promise",
            entity_id=promise["promise_id"],
            chunk_index=0,
            chunk_text=text,
            embedding=results[0].embedding,
            metadata=metadata,
            embedded_at=datetime.now(timezone.utc),
            model_version=service.model,
        )
    ]


def embed_promises(
    promises: list[dict[str, Any]],
    service: EmbeddingService | None = None,
) -> list[EmbeddingRecord]:
    """Embed multiple promises in batched API calls.

    Collects all promise texts and embeds them in one call to embed_texts(),
    which handles token-aware batching internally. For 651 promises at ~35
    tokens each, this is typically a single API call.

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

    valid_promises = []
    texts = []
    for promise in promises:
        text = prepare_promise_text(promise)
        if text:
            valid_promises.append(promise)
            texts.append(text)

    if not texts:
        return []

    logger.info(f"Embedding {len(texts)} promises in batched API calls...")
    embedding_results = service.embed_texts(texts)

    embedded_at = datetime.now(timezone.utc)
    records = []
    for promise, result in zip(valid_promises, embedding_results):
        text = prepare_promise_text(promise)
        metadata = {
            "party": promise.get("party"),
            "year": promise.get("year"),
            "category": promise.get("category"),
            "promise_text": text,
        }
        records.append(
            EmbeddingRecord(
                id=str(uuid.uuid4()),
                entity_type="promise",
                entity_id=promise["promise_id"],
                chunk_index=0,
                chunk_text=text,
                embedding=result.embedding,
                metadata=metadata,
                embedded_at=embedded_at,
                model_version=service.model,
            )
        )

    logger.info(f"Completed embedding {len(records)} promises")
    return records


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
