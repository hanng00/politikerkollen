-- Staging model for personlista__personuppgift__uppgift__uppgift (nested values under uppgift)
-- Source abstraction layer - 1:1 passthrough from raw
-- _dlt_parent_id links to parent personuppgift__uppgift._dlt_id

select
    "value",
    _dlt_parent_id,
    _dlt_list_idx,
    _dlt_id
from {{ source('raw_riksdagen', 'personlista__personuppgift__uppgift__uppgift') }}
