-- Staging model for dokumentstatus__dokmotforslag__motforslag (counter-proposals)
-- Source abstraction layer with deduplication
-- _dlt_root_id links to parent dokumentstatus._dlt_id

select
    nummer,
    rubrik,
    partier,
    typ,
    utskottsforslag_punkt,
    _dlt_root_id,
    _dlt_parent_id,
    _dlt_list_idx,
    _dlt_id
from {{ source('raw_riksdagen', 'dokumentstatus__dokmotforslag__motforslag') }}
qualify row_number() over (
    partition by _dlt_root_id, nummer
    order by _dlt_id
) = 1
