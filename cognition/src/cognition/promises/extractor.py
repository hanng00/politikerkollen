"""Promise extractor using OpenAI structured outputs.

Supports two execution modes:
- BATCH (default): Uses OpenAI Batch API for 50% cost savings
- REALTIME: Uses OpenAI Agents SDK for immediate results

All LLM operations are delegated to core.operations for consistent
batch handling and cost optimization.
"""

from typing import Any, Callable

from cognition.core.operations import (
    BatchStatus,
    ExecutionMode,
    ExtractionRequest,
    estimate_extraction_cost,
    extract_structured,
)
from cognition.promises.models import (
    DocumentExtractionResult,
    ExtractedPromise,
    get_extraction_instructions,
)

MODEL_NAME = "gpt-5.1-codex-mini"
MAX_TEXT_LENGTH = 200000


def _get_response_format() -> dict[str, Any]:
    """Get JSON schema for structured output."""
    return {
        "type": "json_schema",
        "json_schema": {
            "name": "document_extraction_result",
            "strict": True,
            "schema": DocumentExtractionResult.model_json_schema(),
        },
    }


def extract_promises(
    documents: list[dict[str, Any]],
    mode: ExecutionMode = ExecutionMode.BATCH,
    on_progress: Callable[[BatchStatus], None] | None = None,
    metadata: dict[str, str] | None = None,
) -> dict[str, DocumentExtractionResult]:
    """Extract promises from documents.

    Args:
        documents: List of dicts with document_id and text_content
        mode: BATCH (default, 50% savings) or REALTIME
        on_progress: Progress callback for batch mode
        metadata: Optional metadata for batch tracking

    Returns:
        Dict mapping document_id -> DocumentExtractionResult
    """
    requests = [
        ExtractionRequest(
            id=doc["document_id"],
            text=doc.get("text_content", "") or "",
        )
        for doc in documents
    ]

    raw_results = extract_structured(
        requests,
        system_prompt=get_extraction_instructions(),
        response_format=_get_response_format(),
        model=MODEL_NAME,
        mode=mode,
        max_text_length=MAX_TEXT_LENGTH,
        on_progress=on_progress,
        metadata=metadata,
    )

    results = {}
    for doc_id, data in raw_results.items():
        promises = [ExtractedPromise(**p) for p in data.get("promises", [])]
        results[doc_id] = DocumentExtractionResult(
            document_id=data.get("document_id", doc_id),
            promises=promises,
            extraction_notes=data.get("extraction_notes"),
        )

    return results


def estimate_cost(
    text_length: int,
    estimated_output_tokens: int = 2000,
    use_batch_api: bool = True,
) -> dict[str, Any]:
    """Estimate the API cost for extracting promises from a document.

    Args:
        text_length: Length of input text in characters
        estimated_output_tokens: Estimated output tokens (default 2000)
        use_batch_api: If True, use batch pricing (50% discount)

    Returns:
        Dictionary with token estimates and cost
    """
    input_tokens = text_length // 4
    input_tokens = min(input_tokens, MAX_TEXT_LENGTH // 4)

    mode = ExecutionMode.BATCH if use_batch_api else ExecutionMode.REALTIME
    result = estimate_extraction_cost(
        text_count=1,
        avg_input_tokens=input_tokens,
        avg_output_tokens=estimated_output_tokens,
        model=MODEL_NAME,
        mode=mode,
    )

    result["input_tokens"] = input_tokens
    result["output_tokens"] = estimated_output_tokens
    result["batch_api"] = use_batch_api

    return result
