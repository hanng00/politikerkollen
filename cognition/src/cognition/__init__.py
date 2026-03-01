"""
Cognition module for AI/LLM-based processing of political data.

This module extracts structured information from raw political documents
using OpenAI's Agents SDK. The Pydantic models in each feature module are the
single source of truth for extraction schemas, database columns, and
validation rules.

Features:
- promises: Extract political promises from party manifestos
- embeddings: Generate vector embeddings for semantic search
- matching: Match promises to votes using vector similarity

Usage:
    # CLI
    cognition extract-promises --dry-run --limit 10
    cognition embed-promises --dry-run
    cognition embed-votes --dry-run
    cognition match-promises --dry-run

    # Python
    from cognition.promises import ExtractedPromise, DocumentExtractionResult
    from cognition.embeddings import PromiseEmbedding, VoteEmbedding
    from cognition.matching import PromiseVoteMatch
"""

__version__ = "0.2.0"
