-- Staging model for promise_embeddings (vector embeddings for promises)
-- Source: cognition module using OpenAI text-embedding-3-small
--
-- Schema derived from cognition.models.embedding.PromiseEmbedding Pydantic model.
-- This is the SINGLE SOURCE OF TRUTH - any schema changes should be made there first.

select
    promise_id,
    embedding,
    embedded_at,
    model_version

from {{ source('processed_snd', 'promise_embeddings') }}
