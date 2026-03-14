"""Centralized LLM client with Langfuse observability.

This module provides a single source of truth for all OpenAI client instances.
All LLM calls in the cognition module should use get_client() from here.

The Langfuse integration is automatic via the drop-in replacement import.
When LANGFUSE_PUBLIC_KEY and LANGFUSE_SECRET_KEY are set, all OpenAI calls
are traced automatically. When not set, it falls back to standard OpenAI.
"""

import logging
import os

logger = logging.getLogger(__name__)

_client: "OpenAI | None" = None
_async_client: "AsyncOpenAI | None" = None


def _langfuse_available() -> bool:
    """Check if Langfuse credentials are configured."""
    return bool(os.getenv("LANGFUSE_PUBLIC_KEY") and os.getenv("LANGFUSE_SECRET_KEY"))


def get_client() -> "OpenAI":
    """Get the OpenAI client with Langfuse tracing.

    Returns a singleton client instance. When Langfuse credentials are set,
    all API calls are automatically traced.
    """
    global _client

    if _client is not None:
        return _client

    if _langfuse_available():
        from langfuse.openai import OpenAI

        logger.info("Using Langfuse-wrapped OpenAI client")
    else:
        from openai import OpenAI

        logger.debug("Langfuse credentials not set, using standard OpenAI client")

    _client = OpenAI()
    return _client


def get_async_client() -> "AsyncOpenAI":
    """Get the async OpenAI client with Langfuse tracing.

    Returns a singleton async client instance. When Langfuse credentials are set,
    all API calls are automatically traced.
    """
    global _async_client

    if _async_client is not None:
        return _async_client

    if _langfuse_available():
        from langfuse.openai import AsyncOpenAI

        logger.info("Using Langfuse-wrapped AsyncOpenAI client")
    else:
        from openai import AsyncOpenAI

        logger.debug("Langfuse credentials not set, using standard AsyncOpenAI client")

    _async_client = AsyncOpenAI()
    return _async_client


def get_langfuse():
    """Get the Langfuse client instance, or None if not available."""
    if not _langfuse_available():
        return None
    try:
        from langfuse import get_client as get_langfuse_client

        return get_langfuse_client()
    except Exception:
        return None


def flush() -> None:
    """Flush any pending Langfuse events.

    Call this before exiting short-lived applications to ensure
    all traces are sent to Langfuse.
    """
    if _langfuse_available():
        try:
            from langfuse import get_client as get_langfuse_client

            get_langfuse_client().flush()
        except Exception as e:
            logger.warning(f"Failed to flush Langfuse: {e}")
