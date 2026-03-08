-- Staging model for promise_vote_matches (semantic matches between promises and sources)
-- Source: cognition module using hybrid retrieval + LLM alignment classification
--
-- Matches promises to source documents (motions/propositions) based on semantic
-- similarity. Includes alignment classification (supports/opposes/tangential).
-- To get actual votes, join via int_vote_source_links.

select
    match_id,
    promise_id,
    source_dok_id,
    similarity_score,
    matched_at,
    alignment,
    alignment_confidence,
    alignment_rationale

from {{ source('cognition', 'promise_vote_matches') }}
