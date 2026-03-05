"""Langfuse tracing setup for OpenAI Agents SDK.

Note: Direct OpenAI API calls (embeddings, batch API) are automatically traced
via the Langfuse-wrapped client in cognition.core.llm. This module only handles
the OpenAI Agents SDK instrumentation which requires separate setup.
"""

import logging
import os

logger = logging.getLogger(__name__)

_agents_instrumented = False


def setup_agents_tracing() -> bool:
    """Initialize Langfuse tracing for OpenAI Agents SDK.

    This instruments the Agents SDK to capture agent operations.
    Direct OpenAI calls are traced automatically via core.llm.

    Returns:
        True if tracing was successfully initialized, False otherwise.
    """
    global _agents_instrumented

    if _agents_instrumented:
        return True

    public_key = os.getenv("LANGFUSE_PUBLIC_KEY")
    secret_key = os.getenv("LANGFUSE_SECRET_KEY")

    if not public_key or not secret_key:
        logger.debug("Langfuse credentials not set, skipping Agents SDK instrumentation")
        return False

    try:
        from langfuse import get_client
        from openinference.instrumentation.openai_agents import OpenAIAgentsInstrumentor

        OpenAIAgentsInstrumentor().instrument()

        langfuse = get_client()
        langfuse.auth_check()

        _agents_instrumented = True
        logger.info("OpenAI Agents SDK instrumentation enabled")
        return True

    except ImportError as e:
        logger.warning(f"Agents SDK instrumentation dependencies not installed: {e}")
        return False
    except Exception as e:
        logger.warning(f"Failed to initialize Agents SDK instrumentation: {e}")
        return False


def is_agents_tracing_enabled() -> bool:
    """Check if Agents SDK tracing is enabled."""
    return _agents_instrumented


# Backwards compatibility alias
setup_tracing = setup_agents_tracing
is_tracing_enabled = is_agents_tracing_enabled
