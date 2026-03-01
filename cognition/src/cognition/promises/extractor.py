"""Promise extractor using OpenAI Agents SDK."""

import asyncio
from typing import Any

from agents import Agent, Runner

from cognition.promises.models import (
    DocumentExtractionResult,
    get_extraction_instructions,
)

MODEL_NAME = "gpt-5.1-codex-mini"
MAX_TEXT_LENGTH = 50000


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


def estimate_cost(
    text_length: int, estimated_output_tokens: int = 2000
) -> dict[str, Any]:
    """
    Estimate the API cost for extracting promises from a document.

    Args:
        text_length: Length of input text in characters
        estimated_output_tokens: Estimated output tokens (default 2000)

    Returns:
        Dictionary with token estimates and cost
    """
    input_tokens = text_length // 4
    input_tokens = min(input_tokens, MAX_TEXT_LENGTH // 4)

    input_cost_per_million = 0.15
    output_cost_per_million = 0.60

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
    }
