-- Staging model for dokumentstatus__dokforslag__forslag (document proposals)
-- Source abstraction layer with deduplication
-- _dlt_root_id links to parent dokumentstatus._dlt_id

select
    nummer,
    beteckning,
    lydelse,
    lydelse2,
    utskottet,
    kammaren,
    behandlas_i,
    behandlas_i_punkt,
    kammarbeslutstyp,
    intressent,
    avsnitt,
    grundforfattning,
    andringsforfattning,
    _dlt_root_id,
    _dlt_parent_id,
    _dlt_list_idx,
    _dlt_id
from {{ source('raw_riksdagen', 'dokumentstatus__dokforslag__forslag') }}
qualify row_number() over (
    partition by _dlt_root_id, nummer
    order by _dlt_id
) = 1
