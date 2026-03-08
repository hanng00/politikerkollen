"""Alignment classifier using OpenAI structured outputs.

Classifies whether a source document (motion/proposition) supports, opposes,
or is tangential to a political promise.

Supports two execution modes:
- BATCH (default): Uses OpenAI Batch API for 50% cost savings
- REALTIME: Uses direct API calls for immediate results
"""

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
from cognition.matching.models import (
    AlignmentResult,
    get_classification_instructions,
)

MODEL_NAME = MODELS["fast"]
MAX_TEXT_LENGTH = 10000

EMBEDDINGS_TABLE = f"{SCHEMA}.embeddings"
PROMISES_TABLE = f"{SCHEMA}.valmanifest_promises"


def _get_response_format() -> dict[str, Any]:
    """Get JSON schema for structured output."""
    return {
        "type": "json_schema",
        "json_schema": {
            "name": "alignment_result",
            "strict": True,
            "schema": AlignmentResult.model_json_schema(),
        },
    }


def _fetch_match_texts(
    conn: duckdb.DuckDBPyConnection,
    matches: list[dict[str, Any]],
) -> list[dict[str, Any]]:
    """Fetch promise text and best chunk text for each match."""
    enriched = []
    
    for match in matches:
        promise_id = match["promise_id"]
        best_chunk_text = match.get("best_chunk_text", "")
        
        promise_query = f"""
            SELECT promise_text
            FROM {PROMISES_TABLE}
            WHERE promise_id = '{promise_id}'
            LIMIT 1
        """
        
        try:
            result = conn.execute(promise_query).fetchone()
            promise_text = result[0] if result else ""
        except duckdb.Error:
            promise_text = ""
        
        if not best_chunk_text:
            source_dok_id = match["source_dok_id"]
            chunk_query = f"""
                SELECT chunk_text
                FROM {EMBEDDINGS_TABLE}
                WHERE entity_type = 'source' AND entity_id = '{source_dok_id}'
                ORDER BY chunk_index
                LIMIT 1
            """
            try:
                result = conn.execute(chunk_query).fetchone()
                best_chunk_text = result[0] if result else ""
            except duckdb.Error:
                best_chunk_text = ""
        
        enriched.append({
            **match,
            "promise_text": promise_text,
            "best_chunk_text": best_chunk_text,
        })
    
    return enriched


def classify_alignments(
    conn: duckdb.DuckDBPyConnection,
    matches: list[dict[str, Any]],
    mode: ExecutionMode = ExecutionMode.BATCH,
    on_progress: Callable[[BatchStatus], None] | None = None,
    metadata: dict[str, str] | None = None,
) -> dict[str, AlignmentResult]:
    """Classify alignment for promise-source matches.

    Args:
        conn: DuckDB connection for fetching texts
        matches: List of match dicts with match_id, promise_id, source_dok_id
        mode: BATCH (default, 50% savings) or REALTIME
        on_progress: Progress callback for batch mode
        metadata: Optional metadata for batch tracking

    Returns:
        Dict mapping match_id -> AlignmentResult
    """
    if not matches:
        return {}
    
    enriched = _fetch_match_texts(conn, matches)
    
    requests = []
    for match in enriched:
        match_id = match.get("match_id") or f"{match['promise_id']}_{match['source_dok_id']}"
        promise_text = match.get("promise_text", "")
        chunk_text = match.get("best_chunk_text", "")
        
        if not promise_text or not chunk_text:
            continue
        
        combined_text = f"""LÖFTE (Promise):
{promise_text}

---

DOKUMENT (Parliamentary document excerpt):
{chunk_text}"""
        
        requests.append(ExtractionRequest(id=match_id, text=combined_text))
    
    if not requests:
        return {}
    
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
    
    results = {}
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
