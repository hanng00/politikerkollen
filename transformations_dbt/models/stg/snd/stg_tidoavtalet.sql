-- Staging model for Tidöavtalet (coalition agreement between M, KD, L, SD 2022-2026)
-- Source: https://kristdemokraterna.se/arkiv/nyheter/2022/2022-10-14-overenskommelse-for-sverige---tidoavtalet
--
-- One row per coalition party (M, KD, L, SD) - same document text, different party attribution.
-- This allows the cognition pipeline to attribute promises to each party.

select
    document_id,
    year,
    party_id,
    parti,
    type_id,
    document_type,
    title,
    source,
    text_content,
    text_length,
    _dlt_load_id,
    _dlt_id
from {{ source('raw_snd', 'tidoavtalet') }}
where document_id is not null
