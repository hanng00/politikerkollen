-- Staging model for promise_vote_matches (semantic matches between promises and votes)
-- Source: cognition module using DuckDB array_cosine_similarity
--
-- Schema derived from cognition.models.embedding.PromiseVoteMatch Pydantic model.
-- This is the SINGLE SOURCE OF TRUTH - any schema changes should be made there first.

select
    match_id,
    promise_id,
    votering_id,
    similarity_score,
    matched_at

from {{ source('cognition', 'promise_vote_matches') }}
