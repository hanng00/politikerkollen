-- Int: Source Documents with Party Attribution
-- Enriches int_document_content with signatory/party information.
--
-- This is the canonical source for document metadata used in downstream models.
-- Cognition reads from this for embedding, and marts join to this for display.
--
-- Party attribution logic:
--   - Propositions (prop): Always "Regeringen" (government)
--   - Motions (mot): First signatory's party (partibet from dokumentstatus_intressent)

{{
    config(
        materialized='table'
    )
}}

with signatory_agg as (
    select
        _dlt_root_id as dlt_id,
        arg_min(partibet, (ordning, _dlt_id)) as first_parti,
        list(intressent_id order by ordning nulls last) as intressent_ids
    from {{ ref('stg_dokumentstatus_intressent') }}
    where roll in ('undertecknare', 'huvudman')
    group by _dlt_root_id
)

select
    d.dok_id,
    d.dok_typ,
    d.rm,
    d.riksmote_year,
    d.datum,
    d.titel,
    d.dokument_url,
    case 
        when d.dok_typ = 'prop' then 'Regeringen'
        else sa.first_parti
    end as parti,
    case 
        when d.dok_typ = 'mot' then sa.intressent_ids
        else null
    end as intressent_ids,
    d._dlt_id
from {{ ref('int_document_content') }} d
left join signatory_agg sa on sa.dlt_id = d._dlt_id
