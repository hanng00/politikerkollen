-- Staging model for valmanifest_promises (LLM-extracted political promises)
-- Source: cognition module using OpenAI Agents SDK
--
-- Schema derived from cognition.models.promise.ExtractedPromise Pydantic model.
-- This is the SINGLE SOURCE OF TRUTH - any schema changes should be made there first.

select
    promise_id,
    document_id,
    party_id,
    year,
    
    -- Fields from ExtractedPromise Pydantic model
    promise_text,
    source_quote,
    category,
    specificity,
    target_group,
    measurable,
    
    -- Extraction metadata
    extracted_at,
    model_version

from {{ source('cognition', 'valmanifest_promises') }}
