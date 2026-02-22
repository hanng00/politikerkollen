-- Staging model for dokumentstatus__dokuppgift__uppgift (document info fields)
-- Source abstraction layer with deduplication
-- _dlt_root_id links to parent dokumentstatus._dlt_id

select
    kod,
    namn,
    "text",
    dok_id,
    systemdatum,
    _dlt_root_id,
    _dlt_parent_id,
    _dlt_list_idx,
    _dlt_id
from {{ source('raw_riksdagen', 'dokumentstatus__dokuppgift__uppgift') }}
qualify row_number() over (
    partition by _dlt_root_id, kod
    order by _dlt_id
) = 1
