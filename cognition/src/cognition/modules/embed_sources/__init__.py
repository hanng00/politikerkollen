"""Source document embeddings module.

This module handles embedding of source documents (motions and propositions)
for semantic matching against manifesto promises.
"""

from cognition.core.models import (
    EMBEDDING_DIMENSIONS,
    EMBEDDING_MODEL,
    EmbeddingRecord,
)

__all__ = [
    "EMBEDDING_DIMENSIONS",
    "EMBEDDING_MODEL",
    "EmbeddingRecord",
]
