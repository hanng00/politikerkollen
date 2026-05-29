-- Staging model for valmanifest_promises (LLM-extracted political promises)
-- Source: cognition module using OpenAI Agents SDK
--
-- Schema derived from cognition.models.promise.ExtractedPromise Pydantic model.
-- This is the SINGLE SOURCE OF TRUTH - any schema changes should be made there first.

with manifests as (
    -- Union valmanifest and tidoavtalet to get source metadata
    select document_id, type_id from {{ ref('stg_valmanifest') }}
    union all
    select document_id, type_id from {{ ref('stg_tidoavtalet') }}
)

select
    p.promise_id,
    p.document_id,
    p.party_id,
    p.year,
    
    -- Fields from ExtractedPromise Pydantic model
    p.promise_text,
    p.source_quote,
    p.category,
    p.specificity,
    p.target_group,
    p.measurable,
    
    -- Source type derived from manifest metadata
    case
        when m.type_id = 't' then 'tidoavtalet'
        else 'valmanifest'
    end as source_type,
    
    -- Extraction metadata
    p.extracted_at,
    p.model_version

from {{ source('cognition', 'valmanifest_promises') }} p
left join manifests m on p.document_id = m.document_id
