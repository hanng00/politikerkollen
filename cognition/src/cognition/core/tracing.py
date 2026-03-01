"""Langfuse tracing setup for OpenAI Agents SDK."""

import logging
import os

logger = logging.getLogger(__name__)

_instrumented = False


def setup_tracing() -> bool:
    """
    Initialize Langfuse tracing for OpenAI Agents SDK.

    Uses OpenInference instrumentation to automatically capture agent operations
    and export OpenTelemetry spans to Langfuse.

    Returns:
        True if tracing was successfully initialized, False otherwise.
    """
    global _instrumented

    if _instrumented:
        return True

    public_key = os.getenv("LANGFUSE_PUBLIC_KEY")
    secret_key = os.getenv("LANGFUSE_SECRET_KEY")

    if not public_key or not secret_key:
        logger.warning(
            "Langfuse credentials not found. Set LANGFUSE_PUBLIC_KEY and "
            "LANGFUSE_SECRET_KEY environment variables to enable tracing."
        )
        return False

    try:
        from langfuse import get_client
        from openinference.instrumentation.openai_agents import OpenAIAgentsInstrumentor

        OpenAIAgentsInstrumentor().instrument()

        langfuse = get_client()
        langfuse.auth_check()

        _instrumented = True
        logger.info("Langfuse tracing initialized successfully")
        return True

    except ImportError as e:
        logger.warning(f"Langfuse dependencies not installed: {e}")
        return False
    except Exception as e:
        logger.warning(f"Failed to initialize Langfuse tracing: {e}")
        return False


def is_tracing_enabled() -> bool:
    """Check if tracing is currently enabled."""
    return _instrumented
