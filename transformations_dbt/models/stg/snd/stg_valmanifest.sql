-- Staging model for valmanifest (Swedish party programs and election manifestos)
-- Source: SND (Swedish National Data Service) - https://snd.se/vivill
-- DOI: 10.5878/kcsf-k293
--
-- Contains ~370 documents from 1897 to present covering all major Swedish parties.
-- Document types: partiprogram (p), valmanifest (v), handlingsprogram (h), reformagenda (r)

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
from {{ source('raw_snd', 'valmanifest') }}
where document_id is not null
