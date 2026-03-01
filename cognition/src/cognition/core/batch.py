"""OpenAI Batch API utilities for async processing with 50% cost savings.

The Batch API processes requests asynchronously within 24 hours at half the cost.
Supports both embeddings and chat completions (structured outputs).

Usage:
    batch_id = submit_embedding_batch(items, "promise_id", "promise_text")
    status = wait_for_batch(batch_id)
    results = get_embedding_results(status["output_file_id"])
"""

import json
import time
from io import BytesIO
from typing import Any, Callable

import openai

from cognition.embeddings.models import EMBEDDING_DIMENSIONS, EMBEDDING_MODEL
from cognition.promises.extractor import MAX_TEXT_LENGTH


def get_client() -> openai.OpenAI:
    """Get OpenAI client."""
    return openai.OpenAI()


def submit_embedding_batch(
    items: list[dict[str, Any]],
    id_field: str,
    text_field: str,
    client: openai.OpenAI | None = None,
    metadata: dict[str, str] | None = None,
) -> str:
    """Submit embedding batch job directly to OpenAI.
    
    Args:
        items: List of dicts containing id and text fields
        id_field: Name of the field containing unique ID
        text_field: Name of the field containing text to embed
        client: OpenAI client
        metadata: Optional metadata for tracking
        
    Returns:
        Batch ID for status tracking
    """
    if client is None:
        client = get_client()
    
    lines = []
    for item in items:
        request = {
            "custom_id": str(item[id_field]),
            "method": "POST",
            "url": "/v1/embeddings",
            "body": {
                "model": EMBEDDING_MODEL,
                "input": item[text_field],
                "dimensions": EMBEDDING_DIMENSIONS,
            },
        }
        lines.append(json.dumps(request))
    
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


def submit_extraction_batch(
    documents: list[dict[str, Any]],
    model: str,
    system_prompt: str,
    response_format: dict[str, Any],
    client: openai.OpenAI | None = None,
    metadata: dict[str, str] | None = None,
) -> str:
    """Submit structured extraction batch job.
    
    Args:
        documents: List of dicts with document_id and text_content
        model: Chat model name
        system_prompt: System instructions for extraction
        response_format: JSON schema for structured output
        client: OpenAI client
        metadata: Optional metadata for tracking
        
    Returns:
        Batch ID
    """
    if client is None:
        client = get_client()
    
    lines = []
    for doc in documents:
        text = doc.get("text_content", "") or ""
        prompt = f"Document ID: {doc['document_id']}\n\nText:\n{text[:MAX_TEXT_LENGTH]}"
        request = {
            "custom_id": str(doc["document_id"]),
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
        lines.append(json.dumps(request))
    
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


def get_batch_status(batch_id: str, client: openai.OpenAI | None = None) -> dict[str, Any]:
    """Get current status of a batch."""
    if client is None:
        client = get_client()
    
    batch = client.batches.retrieve(batch_id)
    
    return {
        "id": batch.id,
        "status": batch.status,
        "total": batch.request_counts.total,
        "completed": batch.request_counts.completed,
        "failed": batch.request_counts.failed,
        "output_file_id": batch.output_file_id,
        "error_file_id": batch.error_file_id,
    }


def wait_for_batch(
    batch_id: str,
    client: openai.OpenAI | None = None,
    poll_interval: int = 30,
    timeout: int = 86400,
    on_progress: Callable[[dict[str, Any]], None] | None = None,
) -> dict[str, Any]:
    """Wait for batch to complete, polling periodically.
    
    Args:
        batch_id: Batch ID to monitor
        client: OpenAI client
        poll_interval: Seconds between status checks
        timeout: Maximum seconds to wait (default 24h)
        on_progress: Optional callback(status_dict) for progress updates
        
    Returns:
        Final batch status with output_file_id
        
    Raises:
        TimeoutError: If batch doesn't complete within timeout
        RuntimeError: If batch fails or expires
    """
    if client is None:
        client = get_client()
    
    start_time = time.time()
    
    while True:
        status = get_batch_status(batch_id, client)
        
        if on_progress:
            on_progress(status)
        
        if status["status"] == "completed":
            return status
        
        if status["status"] in ("failed", "expired", "cancelled"):
            raise RuntimeError(f"Batch {batch_id} {status['status']}")
        
        elapsed = time.time() - start_time
        if elapsed > timeout:
            raise TimeoutError(f"Batch {batch_id} did not complete within {timeout}s")
        
        time.sleep(poll_interval)


def get_embedding_results(
    output_file_id: str,
    client: openai.OpenAI | None = None,
) -> list[tuple[str, list[float]]]:
    """Download and parse embedding batch results.
    
    Returns:
        List of (custom_id, embedding) tuples
    """
    if client is None:
        client = get_client()
    
    content = client.files.content(output_file_id)
    lines = content.text.strip().split("\n")
    
    results = []
    for line in lines:
        result = json.loads(line)
        if result.get("error"):
            continue
        custom_id = result["custom_id"]
        embedding = result["response"]["body"]["data"][0]["embedding"]
        results.append((custom_id, embedding))
    
    return results


def get_extraction_results(
    output_file_id: str,
    client: openai.OpenAI | None = None,
) -> list[tuple[str, dict[str, Any]]]:
    """Download and parse extraction batch results.
    
    Returns:
        List of (document_id, parsed_json) tuples
    """
    if client is None:
        client = get_client()
    
    content = client.files.content(output_file_id)
    lines = content.text.strip().split("\n")
    
    results = []
    for line in lines:
        result = json.loads(line)
        if result.get("error"):
            continue
        custom_id = result["custom_id"]
        content_str = result["response"]["body"]["choices"][0]["message"]["content"]
        parsed = json.loads(content_str)
        results.append((custom_id, parsed))
    
    return results
