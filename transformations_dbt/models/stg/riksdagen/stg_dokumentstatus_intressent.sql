-- Staging model for dokumentstatus__dokintressent__intressent (document stakeholders)
-- Source abstraction layer - 1:1 passthrough from raw
-- _dlt_root_id links to parent dokumentstatus._dlt_id

select
    intressent_id,
    namn,
    partibet,
    ordning,
    roll,
    _dlt_root_id,
    _dlt_parent_id,
    _dlt_list_idx,
    _dlt_id
from {{ source('raw_riksdagen', 'dokumentstatus__dokintressent__intressent') }}
