"""Alignment classifier using OpenAI structured outputs.

Classifies whether a source document (motion/proposition) supports, opposes,
or is tangential to a political promise.

Supports two execution modes:
- BATCH (default): Uses OpenAI Batch API for 50% cost savings
- REALTIME: Uses direct API calls for immediate results

Caching:
- Already-classified matches (alignment IS NOT NULL) are skipped by default
- Use reclassify=True to force re-classification of all matches
"""

import logging
from typing import Any, Callable

import duckdb

from cognition.core.config import MODELS, SCHEMA
from cognition.core.operations import (
    BatchStatus,
    ExecutionMode,
    ExtractionRequest,
    estimate_extraction_cost,
    extract_structured,
)
from cognition.modules.match_promises.models import (
    AlignmentResult,
    get_classification_instructions,
)

logger = logging.getLogger("cognition")

MODEL_NAME = MODELS["fast"]
MAX_TEXT_LENGTH = 10000

EMBEDDINGS_TABLE = f"{SCHEMA}.embeddings"
PROMISES_TABLE = f"{SCHEMA}.valmanifest_promises"
MATCHES_TABLE = f"{SCHEMA}.promise_vote_matches"


def _get_response_format() -> dict[str, Any]:
    """Get JSON schema for structured output.

    OpenAI strict mode requires additionalProperties: false on all object schemas.
    """
    schema = AlignmentResult.model_json_schema()
    schema["additionalProperties"] = False
    return {
        "type": "json_schema",
        "json_schema": {
            "name": "alignment_result",
            "strict": True,
            "schema": schema,
        },
    }


def _fetch_match_texts(
    conn: duckdb.DuckDBPyConnection,
    matches: list[dict[str, Any]],
) -> list[dict[str, Any]]:
    """Fetch promise text and best chunk text for each match."""
    if not matches:
        return []

    logger.info(f"Fetching texts for {len(matches)} matches...")

    promise_ids = list({m["promise_id"] for m in matches})
    source_ids_needing_chunks = [
        m["source_dok_id"] for m in matches if not m.get("best_chunk_text")
    ]

    promise_ids_sql = ", ".join(f"'{pid}'" for pid in promise_ids)
    promises_query = f"""
        SELECT promise_id, promise_text
        FROM {PROMISES_TABLE}
        WHERE promise_id IN ({promise_ids_sql})
    """
    promise_texts = {row[0]: row[1] for row in conn.execute(promises_query).fetchall()}
    logger.info(f"  Fetched {len(promise_texts)} promise texts")

    chunk_texts: dict[str, str] = {}
    if source_ids_needing_chunks:
        source_ids_sql = ", ".join(f"'{sid}'" for sid in set(source_ids_needing_chunks))
        chunks_query = f"""
            WITH ranked_chunks AS (
                SELECT 
                    entity_id,
                    chunk_text,
                    ROW_NUMBER() OVER (PARTITION BY entity_id ORDER BY chunk_index) as rn
                FROM {EMBEDDINGS_TABLE}
                WHERE entity_type = 'source' AND entity_id IN ({source_ids_sql})
            )
            SELECT entity_id, chunk_text
            FROM ranked_chunks
            WHERE rn = 1
        """
        chunk_texts = {row[0]: row[1] for row in conn.execute(chunks_query).fetchall()}
        logger.info(
            f"  Fetched {len(chunk_texts)} chunk texts for sources missing best_chunk_text"
        )

    enriched = []
    for match in matches:
        promise_text = promise_texts.get(match["promise_id"], "")
        best_chunk_text = match.get("best_chunk_text") or chunk_texts.get(
            match["source_dok_id"], ""
        )

        enriched.append(
            {
                **match,
                "promise_text": promise_text,
                "best_chunk_text": best_chunk_text,
            }
        )

    return enriched


def _get_already_classified(
    conn: duckdb.DuckDBPyConnection,
    matches: list[dict[str, Any]],
) -> dict[str, AlignmentResult]:
    """Fetch existing classifications from the database.

    Returns:
        Dict mapping "{promise_id}_{source_dok_id}" -> AlignmentResult
    """
    if not matches:
        return {}

    pairs = [(m["promise_id"], m["source_dok_id"]) for m in matches]
    values_sql = ", ".join(f"('{p}', '{s}')" for p, s in pairs)

    query = f"""
        SELECT 
            promise_id,
            source_dok_id,
            alignment,
            alignment_confidence,
            alignment_rationale
        FROM {MATCHES_TABLE}
        WHERE alignment IS NOT NULL
          AND (promise_id, source_dok_id) IN ({values_sql})
    """

    results = {}
    for row in conn.execute(query).fetchall():
        key = f"{row[0]}_{row[1]}"
        results[key] = AlignmentResult(
            alignment=row[2],
            confidence=row[3] or 0.0,
            rationale=row[4] or "",
        )

    return results


def classify_alignments(
    conn: duckdb.DuckDBPyConnection,
    matches: list[dict[str, Any]],
    mode: ExecutionMode = ExecutionMode.BATCH,
    on_progress: Callable[[BatchStatus], None] | None = None,
    metadata: dict[str, str] | None = None,
    reclassify: bool = False,
) -> dict[str, AlignmentResult]:
    """Classify alignment for promise-source matches.

    Args:
        conn: DuckDB connection for fetching texts
        matches: List of match dicts with match_id, promise_id, source_dok_id
        mode: BATCH (default, 50% savings) or REALTIME
        on_progress: Progress callback for batch mode
        metadata: Optional metadata for batch tracking
        reclassify: If True, re-classify all matches even if already classified.
                    If False (default), skip matches that already have alignment.

    Returns:
        Dict mapping match_id -> AlignmentResult (includes both cached and new)
    """
    if not matches:
        return {}

    results: dict[str, AlignmentResult] = {}
    matches_to_classify = matches

    if not reclassify:
        cached = _get_already_classified(conn, matches)
        if cached:
            logger.info(
                f"Found {len(cached)} already-classified matches (skipping LLM)"
            )
            results.update(cached)

            cached_keys = set(cached.keys())
            matches_to_classify = [
                m
                for m in matches
                if f"{m['promise_id']}_{m['source_dok_id']}" not in cached_keys
            ]

    if not matches_to_classify:
        logger.info("All matches already classified, nothing to do")
        return results

    logger.info(f"Classifying {len(matches_to_classify)} new matches...")

    enriched = _fetch_match_texts(conn, matches_to_classify)
    logger.info(f"Fetched texts for {len(enriched)} matches")

    requests = []
    skipped = 0
    for match in enriched:
        match_id = (
            match.get("match_id") or f"{match['promise_id']}_{match['source_dok_id']}"
        )
        promise_text = match.get("promise_text", "")
        chunk_text = match.get("best_chunk_text", "")

        if not promise_text or not chunk_text:
            skipped += 1
            continue

        combined_text = f"""LÖFTE (Promise):
{promise_text}

---

DOKUMENT (Parliamentary document excerpt):
{chunk_text}"""

        requests.append(ExtractionRequest(id=match_id, text=combined_text))

    if skipped > 0:
        logger.warning(f"Skipped {skipped} matches with missing text")

    if not requests:
        logger.warning("No valid requests to classify")
        return results

    logger.info(
        f"Submitting {len(requests)} requests for classification (model: {MODEL_NAME})..."
    )

    raw_results = extract_structured(
        requests,
        system_prompt=get_classification_instructions(),
        response_format=_get_response_format(),
        model=MODEL_NAME,
        mode=mode,
        max_text_length=MAX_TEXT_LENGTH,
        on_progress=on_progress,
        metadata=metadata,
    )

    for match_id, data in raw_results.items():
        try:
            results[match_id] = AlignmentResult(**data)
        except Exception:
            results[match_id] = AlignmentResult(
                alignment="tangential",
                confidence=0.0,
                rationale="Klassificering misslyckades",
            )

    return results


def estimate_cost(
    match_count: int,
    avg_input_tokens: int = 500,
    avg_output_tokens: int = 50,
    use_batch_api: bool = True,
) -> dict[str, Any]:
    """Estimate the API cost for classifying alignments.

    Args:
        match_count: Number of matches to classify
        avg_input_tokens: Average input tokens per match
        avg_output_tokens: Average output tokens per match
        use_batch_api: If True, use batch pricing (50% discount)

    Returns:
        Dictionary with token estimates and cost
    """
    mode = ExecutionMode.BATCH if use_batch_api else ExecutionMode.REALTIME
    result = estimate_extraction_cost(
        text_count=match_count,
        avg_input_tokens=avg_input_tokens,
        avg_output_tokens=avg_output_tokens,
        model=MODEL_NAME,
        mode=mode,
    )

    result["match_count"] = match_count
    result["batch_api"] = use_batch_api

    return result
