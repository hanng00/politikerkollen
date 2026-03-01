"""Promise extractor using OpenAI Agents SDK."""

import asyncio
from typing import Any, Callable

from agents import Agent, Runner

from cognition.promises.models import (
    DocumentExtractionResult,
    get_extraction_instructions,
)

MODEL_NAME = "gpt-5.1-codex-mini"
MAX_TEXT_LENGTH = 200000


def create_agent() -> Agent:
    """
    Create the promise extraction agent.

    Instructions are generated dynamically from the Pydantic model,
    ensuring the LLM always receives schema-consistent guidance.
    """
    return Agent(
        name="Promise Extractor",
        model=MODEL_NAME,
        instructions=get_extraction_instructions(),
        output_type=DocumentExtractionResult,
    )


async def extract_promises_async(
    document_id: str,
    text: str,
    agent: Agent | None = None,
) -> DocumentExtractionResult:
    """
    Extract promises from a document using the LLM.

    Args:
        document_id: Unique identifier for the document
        text: Full text content of the document
        agent: Optional pre-created agent (for reuse)

    Returns:
        DocumentExtractionResult with extracted promises
    """
    if agent is None:
        agent = create_agent()

    truncated_text = text[:MAX_TEXT_LENGTH]
    if len(text) > MAX_TEXT_LENGTH:
        truncation_note = f"\n\n[Note: Document truncated from {len(text)} to {MAX_TEXT_LENGTH} characters]"
    else:
        truncation_note = ""

    prompt = f"Document ID: {document_id}{truncation_note}\n\nText:\n{truncated_text}"

    result = await Runner.run(agent, prompt)
    return result.final_output


async def extract_batch_async(
    documents: list[dict[str, Any]],
    agent: Agent | None = None,
    max_concurrency: int = 1,
    on_progress: Callable[[int, int, str], None] | None = None,
) -> list[tuple[dict[str, Any], DocumentExtractionResult | Exception]]:
    """
    Extract promises from multiple documents concurrently.

    Args:
        documents: List of dicts with document_id, text_content, party_id, year
        agent: Optional pre-created agent (for reuse)
        max_concurrency: Maximum concurrent extractions
        on_progress: Optional callback(completed, total, doc_id) for progress

    Returns:
        List of (document, result_or_exception) tuples
    """
    if agent is None:
        agent = create_agent()

    semaphore = asyncio.Semaphore(max_concurrency)
    completed = 0
    total = len(documents)

    async def extract_one(doc: dict[str, Any]) -> tuple[dict[str, Any], DocumentExtractionResult | Exception]:
        nonlocal completed
        async with semaphore:
            try:
                result = await extract_promises_async(
                    doc["document_id"],
                    doc.get("text_content", "") or "",
                    agent,
                )
                completed += 1
                if on_progress:
                    on_progress(completed, total, doc["document_id"])
                return (doc, result)
            except Exception as e:
                completed += 1
                if on_progress:
                    on_progress(completed, total, doc["document_id"])
                return (doc, e)

    tasks = [extract_one(doc) for doc in documents]
    return await asyncio.gather(*tasks)


def extract_promises(
    document_id: str,
    text: str,
    agent: Agent | None = None,
) -> DocumentExtractionResult:
    """
    Synchronous wrapper for extract_promises_async.

    Args:
        document_id: Unique identifier for the document
        text: Full text content of the document
        agent: Optional pre-created agent (for reuse)

    Returns:
        DocumentExtractionResult with extracted promises
    """
    return asyncio.run(extract_promises_async(document_id, text, agent))


def extract_batch(
    documents: list[dict[str, Any]],
    agent: Agent | None = None,
    max_concurrency: int = 1,
    on_progress: Callable[[int, int, str], None] | None = None,
) -> list[tuple[dict[str, Any], DocumentExtractionResult | Exception]]:
    """Synchronous wrapper for extract_batch_async."""
    return asyncio.run(extract_batch_async(documents, agent, max_concurrency, on_progress))


def estimate_cost(
    text_length: int,
    estimated_output_tokens: int = 2000,
    use_batch_api: bool = False,
) -> dict[str, Any]:
    """
    Estimate the API cost for extracting promises from a document.

    Args:
        text_length: Length of input text in characters
        estimated_output_tokens: Estimated output tokens (default 2000)
        use_batch_api: If True, apply 50% batch discount

    Returns:
        Dictionary with token estimates and cost
    """
    input_tokens = text_length // 4
    input_tokens = min(input_tokens, MAX_TEXT_LENGTH // 4)

    input_cost_per_million = 0.15
    output_cost_per_million = 0.60

    if use_batch_api:
        input_cost_per_million *= 0.5
        output_cost_per_million *= 0.5

    input_cost = (input_tokens / 1_000_000) * input_cost_per_million
    output_cost = (estimated_output_tokens / 1_000_000) * output_cost_per_million
    total_cost = input_cost + output_cost

    return {
        "input_tokens": input_tokens,
        "output_tokens": estimated_output_tokens,
        "input_cost_usd": input_cost,
        "output_cost_usd": output_cost,
        "total_cost_usd": total_cost,
        "model": MODEL_NAME,
        "batch_api": use_batch_api,
    }
