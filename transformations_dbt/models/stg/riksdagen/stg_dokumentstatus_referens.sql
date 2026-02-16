-- Staging model for dokumentstatus__dokreferens__referens (document references)
-- Source abstraction layer - 1:1 passthrough from raw
-- _dlt_root_id links to parent dokumentstatus._dlt_id

select
    referenstyp,
    uppgift,
    ref_dok_id,
    ref_dok_typ,
    ref_dok_rm,
    ref_dok_bet,
    ref_dok_titel,
    ref_dok_subtitel,
    ref_dok_subtyp,
    ref_dok_dokumentnamn,
    _dlt_root_id,
    _dlt_parent_id,
    _dlt_list_idx,
    _dlt_id
from {{ source('raw_riksdagen', 'dokumentstatus__dokreferens__referens') }}
