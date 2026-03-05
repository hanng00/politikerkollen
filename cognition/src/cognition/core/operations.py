"""Unified LLM operations with automatic Batch API support.

All LLM operations go through this module, which:
1. Uses OpenAI Batch API by default (50% cost savings, 24h SLA)
2. Falls back to real-time API when immediate results needed
3. Provides consistent interface for embeddings and completions

Usage:
    from cognition.core.operations import embed_texts, extract_structured, ExecutionMode

    # Batch mode (default) - 50% cost savings
    results = embed_texts(requests)

    # Real-time mode - immediate results
    results = embed_texts(requests, mode=ExecutionMode.REALTIME)
"""

import json
import time
from dataclasses import dataclass
from enum import Enum
from io import BytesIO
from typing import TYPE_CHECKING, Any, Callable

from cognition.core.llm import get_client

if TYPE_CHECKING:
    from openai import OpenAI

EMBEDDING_MODEL = "text-embedding-3-small"
EMBEDDING_DIMENSIONS = 1536


class ExecutionMode(Enum):
    """Execution mode for LLM operations."""

    BATCH = "batch"  # 50% cost savings, up to 24h completion
    REALTIME = "realtime"  # Immediate results, full price


@dataclass
class EmbeddingRequest:
    """Request to embed a single text."""

    id: str
    text: str


@dataclass
class ExtractionRequest:
    """Request to extract structured data from text."""

    id: str
    text: str


@dataclass
class BatchStatus:
    """Status of a batch job."""

    id: str
    status: str
    total: int
    completed: int
    failed: int
    output_file_id: str | None
    error_file_id: str | None


def _validate_unique_ids(requests: list[EmbeddingRequest] | list[ExtractionRequest]) -> None:
    """Validate that all request IDs are unique.

    Raises:
        ValueError: If duplicate IDs are found, with details about which IDs are duplicated.
    """
    seen: dict[str, int] = {}
    duplicates: dict[str, int] = {}

    for req in requests:
        if req.id in seen:
            duplicates[req.id] = duplicates.get(req.id, 1) + 1
        else:
            seen[req.id] = 1

    if duplicates:
        dup_details = ", ".join(f"'{k}' ({v + 1}x)" for k, v in list(duplicates.items())[:10])
        total_dups = len(duplicates)
        msg = f"Found {total_dups} duplicate ID(s) in batch request: {dup_details}"
        if total_dups > 10:
            msg += f" ... and {total_dups - 10} more"
        raise ValueError(msg)


def _submit_embedding_batch(
    requests: list[EmbeddingRequest],
    client: "OpenAI",
    metadata: dict[str, str] | None = None,
) -> str:
    """Submit embedding batch job to OpenAI."""
    _validate_unique_ids(requests)

    lines = []
    for req in requests:
        request_obj = {
            "custom_id": req.id,
            "method": "POST",
            "url": "/v1/embeddings",
            "body": {
                "model": EMBEDDING_MODEL,
                "input": req.text,
                "dimensions": EMBEDDING_DIMENSIONS,
            },
        }
        lines.append(json.dumps(request_obj))

    jsonl_content = "\n".join(lines).encode("utf-8")
    file_obj = client.files.create(
        file=("batch.jsonl", BytesIO(jsonl_content)),
        purpose="batch",
    )

    batch = client.batches.create(
        input_file_id=file_obj.id,
        endpoint="/v1/embeddings",
        completion_window="24h",
        metadata=metadata,
    )

    return batch.id


def _submit_extraction_batch(
    requests: list[ExtractionRequest],
    model: str,
    system_prompt: str,
    response_format: dict[str, Any],
    client: "OpenAI",
    max_text_length: int = 200000,
    metadata: dict[str, str] | None = None,
) -> str:
    """Submit extraction batch job to OpenAI."""
    _validate_unique_ids(requests)

    lines = []
    for req in requests:
        text = req.text[:max_text_length] if req.text else ""
        prompt = f"Document ID: {req.id}\n\nText:\n{text}"
        request_obj = {
            "custom_id": req.id,
            "method": "POST",
            "url": "/v1/chat/completions",
            "body": {
                "model": model,
                "messages": [
                    {"role": "system", "content": system_prompt},
                    {"role": "user", "content": prompt},
                ],
                "response_format": response_format,
            },
        }
        lines.append(json.dumps(request_obj))

    jsonl_content = "\n".join(lines).encode("utf-8")
    file_obj = client.files.create(
        file=("batch.jsonl", BytesIO(jsonl_content)),
        purpose="batch",
    )

    batch = client.batches.create(
        input_file_id=file_obj.id,
        endpoint="/v1/chat/completions",
        completion_window="24h",
        metadata=metadata,
    )

    return batch.id


def _get_batch_status(batch_id: str, client: "OpenAI") -> BatchStatus:
    """Get current status of a batch."""
    batch = client.batches.retrieve(batch_id)

    return BatchStatus(
        id=batch.id,
        status=batch.status,
        total=batch.request_counts.total,
        completed=batch.request_counts.completed,
        failed=batch.request_counts.failed,
        output_file_id=batch.output_file_id,
        error_file_id=batch.error_file_id,
    )


def _wait_for_batch(
    batch_id: str,
    client: "OpenAI",
    poll_interval: int = 30,
    timeout: int = 86400,
    on_progress: Callable[[BatchStatus], None] | None = None,
) -> BatchStatus:
    """Wait for batch to complete, polling periodically.

    Args:
        batch_id: Batch ID to monitor
        client: OpenAI client
        poll_interval: Seconds between status checks
        timeout: Maximum seconds to wait (default 24h)
        on_progress: Optional callback for progress updates

    Returns:
        Final batch status with output_file_id

    Raises:
        TimeoutError: If batch doesn't complete within timeout
        RuntimeError: If batch fails or expires
    """
    start_time = time.time()

    while True:
        status = _get_batch_status(batch_id, client)

        if on_progress:
            on_progress(status)

        if status.status == "completed":
            return status

        if status.status in ("failed", "expired", "cancelled"):
            raise RuntimeError(f"Batch {batch_id} {status.status}")

        elapsed = time.time() - start_time
        if elapsed > timeout:
            raise TimeoutError(f"Batch {batch_id} did not complete within {timeout}s")

        time.sleep(poll_interval)


def _parse_embedding_results(
    output_file_id: str, client: "OpenAI"
) -> dict[str, list[float]]:
    """Download and parse embedding batch results."""
    content = client.files.content(output_file_id)
    lines = content.text.strip().split("\n")

    results = {}
    for line in lines:
        result = json.loads(line)
        if result.get("error"):
            continue
        custom_id = result["custom_id"]
        embedding = result["response"]["body"]["data"][0]["embedding"]
        results[custom_id] = embedding

    return results


def _parse_extraction_results(
    output_file_id: str, client: "OpenAI"
) -> dict[str, dict[str, Any]]:
    """Download and parse extraction batch results."""
    content = client.files.content(output_file_id)
    lines = content.text.strip().split("\n")

    results = {}
    for line in lines:
        result = json.loads(line)
        if result.get("error"):
            continue
        custom_id = result["custom_id"]
        content_str = result["response"]["body"]["choices"][0]["message"]["content"]
        parsed = json.loads(content_str)
        results[custom_id] = parsed

    return results


def embed_texts(
    requests: list[EmbeddingRequest],
    mode: ExecutionMode = ExecutionMode.BATCH,
    client: "OpenAI | None" = None,
    on_progress: Callable[[BatchStatus], None] | None = None,
    metadata: dict[str, str] | None = None,
) -> dict[str, list[float]]:
    """Generate embeddings for texts.

    Args:
        requests: List of EmbeddingRequest(id, text) to embed
        mode: BATCH (default, 50% savings) or REALTIME
        client: OpenAI client (uses default if not provided)
        on_progress: Progress callback for batch mode
        metadata: Optional metadata for batch tracking

    Returns:
        Dict mapping id -> embedding vector
    """
    if not requests:
        return {}

    if client is None:
        client = get_client()

    if mode == ExecutionMode.BATCH:
        batch_id = _submit_embedding_batch(requests, client, metadata)
        status = _wait_for_batch(batch_id, client, on_progress=on_progress)
        if not status.output_file_id:
            raise RuntimeError(f"Batch {batch_id} completed but no output file")
        return _parse_embedding_results(status.output_file_id, client)

    else:  # REALTIME
        results = {}
        batch_size = 2048  # OpenAI's max per request
        for i in range(0, len(requests), batch_size):
            batch = requests[i : i + batch_size]
            response = client.embeddings.create(
                model=EMBEDDING_MODEL,
                input=[r.text for r in batch],
                dimensions=EMBEDDING_DIMENSIONS,
            )
            for req, data in zip(batch, response.data):
                results[req.id] = data.embedding
        return results


def extract_structured(
    requests: list[ExtractionRequest],
    system_prompt: str,
    response_format: dict[str, Any],
    model: str = "gpt-4o-mini",
    mode: ExecutionMode = ExecutionMode.BATCH,
    client: "OpenAI | None" = None,
    max_text_length: int = 200000,
    on_progress: Callable[[BatchStatus], None] | None = None,
    metadata: dict[str, str] | None = None,
) -> dict[str, dict[str, Any]]:
    """Extract structured data from texts using LLM.

    Args:
        requests: List of ExtractionRequest(id, text)
        system_prompt: System instructions for extraction
        response_format: JSON schema for structured output
        model: Model name (default: gpt-4o-mini)
        mode: BATCH (default, 50% savings) or REALTIME
        client: OpenAI client (uses default if not provided)
        max_text_length: Maximum text length per request
        on_progress: Progress callback for batch mode
        metadata: Optional metadata for batch tracking

    Returns:
        Dict mapping id -> parsed JSON response
    """
    if not requests:
        return {}

    if client is None:
        client = get_client()

    if mode == ExecutionMode.BATCH:
        batch_id = _submit_extraction_batch(
            requests,
            model,
            system_prompt,
            response_format,
            client,
            max_text_length,
            metadata,
        )
        status = _wait_for_batch(batch_id, client, on_progress=on_progress)
        if not status.output_file_id:
            raise RuntimeError(f"Batch {batch_id} completed but no output file")
        return _parse_extraction_results(status.output_file_id, client)

    else:  # REALTIME
        results = {}
        for req in requests:
            text = req.text[:max_text_length] if req.text else ""
            prompt = f"Document ID: {req.id}\n\nText:\n{text}"
            response = client.chat.completions.create(
                model=model,
                messages=[
                    {"role": "system", "content": system_prompt},
                    {"role": "user", "content": prompt},
                ],
                response_format=response_format,
            )
            content_str = response.choices[0].message.content
            results[req.id] = json.loads(content_str)
        return results


def estimate_embedding_cost(
    text_count: int,
    avg_tokens_per_text: int = 100,
    mode: ExecutionMode = ExecutionMode.BATCH,
) -> dict[str, Any]:
    """Estimate the API cost for embedding texts.

    Args:
        text_count: Number of texts to embed
        avg_tokens_per_text: Average tokens per text
        mode: Execution mode (BATCH gets 50% discount)

    Returns:
        Cost estimate dictionary
    """
    total_tokens = text_count * avg_tokens_per_text
    cost_per_million = 0.02

    if mode == ExecutionMode.BATCH:
        cost_per_million *= 0.5

    total_cost = (total_tokens / 1_000_000) * cost_per_million

    return {
        "text_count": text_count,
        "avg_tokens_per_text": avg_tokens_per_text,
        "total_tokens": total_tokens,
        "cost_per_million": cost_per_million,
        "total_cost_usd": total_cost,
        "model": EMBEDDING_MODEL,
        "mode": mode.value,
    }


def estimate_extraction_cost(
    text_count: int,
    avg_input_tokens: int = 5000,
    avg_output_tokens: int = 2000,
    model: str = "gpt-4o-mini",
    mode: ExecutionMode = ExecutionMode.BATCH,
) -> dict[str, Any]:
    """Estimate the API cost for structured extraction.

    Args:
        text_count: Number of texts to process
        avg_input_tokens: Average input tokens per text
        avg_output_tokens: Average output tokens per text
        model: Model name
        mode: Execution mode (BATCH gets 50% discount)

    Returns:
        Cost estimate dictionary
    """
    input_cost_per_million = 0.15
    output_cost_per_million = 0.60

    if mode == ExecutionMode.BATCH:
        input_cost_per_million *= 0.5
        output_cost_per_million *= 0.5

    total_input_tokens = text_count * avg_input_tokens
    total_output_tokens = text_count * avg_output_tokens

    input_cost = (total_input_tokens / 1_000_000) * input_cost_per_million
    output_cost = (total_output_tokens / 1_000_000) * output_cost_per_million
    total_cost = input_cost + output_cost

    return {
        "text_count": text_count,
        "avg_input_tokens": avg_input_tokens,
        "avg_output_tokens": avg_output_tokens,
        "total_input_tokens": total_input_tokens,
        "total_output_tokens": total_output_tokens,
        "input_cost_usd": input_cost,
        "output_cost_usd": output_cost,
        "total_cost_usd": total_cost,
        "model": model,
        "mode": mode.value,
    }
