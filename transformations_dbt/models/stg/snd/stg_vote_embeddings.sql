-- Staging model for vote_embeddings (vector embeddings for vote proposals)
-- Source: cognition module using OpenAI text-embedding-3-small
--
-- Schema derived from cognition.models.embedding.VoteEmbedding Pydantic model.
-- This is the SINGLE SOURCE OF TRUTH - any schema changes should be made there first.

select
    votering_id,
    dok_id,
    forslag_text,
    embedding,
    embedded_at,
    model_version

from {{ source('processed_snd', 'vote_embeddings') }}
