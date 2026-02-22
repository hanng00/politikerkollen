-- Staging model for dokumentstatus__dokumentuppgift__uppgift (document metadata fields)
-- Source abstraction layer with deduplication
-- _dlt_root_id links to parent dokumentstatus._dlt_id

select
    kod,
    namn,
    "text",
    _dlt_root_id,
    _dlt_parent_id,
    _dlt_list_idx,
    _dlt_id
from {{ source('raw_riksdagen', 'dokumentstatus__dokumentuppgift__uppgift') }}
qualify row_number() over (
    partition by _dlt_root_id, kod
    order by _dlt_id
) = 1
