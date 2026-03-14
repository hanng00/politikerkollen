"""Source document embedding with chunking support.

Source documents (motions and propositions) can be large (avg 26KB for motions,
792KB for propositions). This module uses paragraph-based chunking to preserve
full document content instead of truncating.
"""

import logging
import re
import uuid
from datetime import datetime, timezone
from typing import Any

from cognition.core.chunking import ParagraphChunking
from cognition.core.embedding import (
    EmbeddingService,
)
from cognition.core.embedding import (
    estimate_cost as core_estimate_cost,
)
from cognition.core.models import Chunk, EmbeddingRecord

logger = logging.getLogger(__name__)

DEFAULT_CHUNKING = ParagraphChunking(
    target_tokens=1024,
    max_tokens=2048,
    overlap_tokens=128,
)


def clean_text(text: str) -> str:
    """Clean text for better embedding quality."""
    text = re.sub(r"\s+", " ", text)
    text = re.sub(r"^\s*Riksdagen\s*$", "", text, flags=re.MULTILINE)
    text = text.strip()
    return text


def prepare_source_text(source: dict[str, Any]) -> str:
    """Prepare source document text for embedding.

    Combines title and content, cleans the text.
    """
    title = source.get("titel", "")
    content = source.get("content_text", "")

    combined = f"{title}\n\n{content}" if title else content
    return clean_text(combined)


def embed_source(
    source: dict[str, Any],
    service: EmbeddingService | None = None,
    chunking: ParagraphChunking | None = None,
) -> list[EmbeddingRecord]:
    """Embed a single source document with chunking.

    Args:
        source: Source document dict with dok_id, titel, content_text, etc.
        service: EmbeddingService instance (creates default if not provided)
        chunking: Chunking strategy (uses ParagraphChunking by default)

    Returns:
        List of EmbeddingRecord (one per chunk)
    """
    if service is None:
        service = EmbeddingService()
    if chunking is None:
        chunking = DEFAULT_CHUNKING

    text = prepare_source_text(source)
    chunks = chunking.chunk(text)

    if not chunks:
        logger.warning(f"No chunks generated for source {source.get('dok_id')}")
        return []

    metadata = {
        "dok_typ": source.get("dok_typ"),
        "rm": source.get("rm"),
        "riksmote_year": source.get("riksmote_year"),
        "titel": source.get("titel"),
        "dokument_url": source.get("dokument_url"),
        "parti": source.get("parti"),
        "intressent_ids": source.get("intressent_ids"),
    }

    return service.embed_chunks(
        entity_type="source",
        entity_id=source["dok_id"],
        chunks=chunks,
        metadata=metadata,
    )


def embed_sources(
    sources: list[dict[str, Any]],
    service: EmbeddingService | None = None,
    chunking: ParagraphChunking | None = None,
) -> list[EmbeddingRecord]:
    """Embed multiple source documents with chunking.

    Chunks all sources first, then embeds all chunks in batched API calls.
    This reduces ~2000 API calls to ~20-30 by letting EmbeddingService
    pack chunks across sources into token-optimal batches.

    Args:
        sources: List of source document dicts
        service: EmbeddingService instance (creates default if not provided)
        chunking: Chunking strategy (uses ParagraphChunking by default)

    Returns:
        List of all EmbeddingRecord across all sources
    """
    if not sources:
        return []

    if service is None:
        service = EmbeddingService()
    if chunking is None:
        chunking = DEFAULT_CHUNKING

    seen_ids: set[str] = set()
    unique_sources = []
    for s in sources:
        dok_id = s["dok_id"]
        if dok_id not in seen_ids:
            seen_ids.add(dok_id)
            unique_sources.append(s)

    # Phase 1: Chunk all sources (CPU-only, fast)
    all_texts: list[str] = []
    chunk_map: list[tuple[dict[str, Any], Chunk]] = []

    for source in unique_sources:
        text = prepare_source_text(source)
        chunks = chunking.chunk(text)
        if not chunks:
            logger.warning(f"No chunks generated for source {source.get('dok_id')}")
            continue
        for chunk in chunks:
            all_texts.append(chunk.text)
            chunk_map.append((source, chunk))

    logger.info(
        f"Chunked {len(unique_sources)} sources into {len(all_texts)} chunks, "
        f"sending to embedding API..."
    )

    # Phase 2: Embed all chunks in batched API calls
    embedding_results = service.embed_texts(all_texts)

    # Phase 3: Map results back to EmbeddingRecords
    embedded_at = datetime.now(timezone.utc)
    records: list[EmbeddingRecord] = []

    for (source, chunk), result in zip(chunk_map, embedding_results):
        metadata = {
            "dok_typ": source.get("dok_typ"),
            "rm": source.get("rm"),
            "riksmote_year": source.get("riksmote_year"),
            "titel": source.get("titel"),
            "dokument_url": source.get("dokument_url"),
            "parti": source.get("parti"),
            "intressent_ids": source.get("intressent_ids"),
        }
        records.append(
            EmbeddingRecord(
                id=str(uuid.uuid4()),
                entity_type="source",
                entity_id=source["dok_id"],
                chunk_index=chunk.index,
                chunk_text=chunk.text,
                embedding=result.embedding,
                metadata=metadata,
                embedded_at=embedded_at,
                model_version=service.model,
            )
        )

    logger.info(f"Completed embedding {len(unique_sources)} sources ({len(records)} chunks)")
    return records


def estimate_cost(
    sources: list[dict[str, Any]],
    chunking: ParagraphChunking | None = None,
) -> dict[str, Any]:
    """Estimate the API cost for embedding source documents with chunking.

    Args:
        sources: List of source document dicts
        chunking: Chunking strategy to use for estimation

    Returns:
        Cost estimate dictionary
    """
    if chunking is None:
        chunking = DEFAULT_CHUNKING

    all_chunk_texts: list[str] = []
    total_chunks = 0

    for source in sources:
        text = prepare_source_text(source)
        chunks = chunking.chunk(text)
        all_chunk_texts.extend(chunk.text for chunk in chunks)
        total_chunks += len(chunks)

    base_estimate = core_estimate_cost(all_chunk_texts)

    return {
        "source_count": len(sources),
        "total_chunks": total_chunks,
        "avg_chunks_per_source": total_chunks / len(sources) if sources else 0,
        **base_estimate,
    }
