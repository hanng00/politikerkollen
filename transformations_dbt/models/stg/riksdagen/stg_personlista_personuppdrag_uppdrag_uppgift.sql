-- Staging model for personlista__personuppdrag__uppdrag__uppgift (tasks under assignments)
-- Source abstraction layer - 1:1 passthrough from raw
-- _dlt_parent_id links to parent personuppdrag__uppdrag._dlt_id

select
    "value",
    _dlt_parent_id,
    _dlt_list_idx,
    _dlt_id
from {{ source('raw_riksdagen', 'personlista__personuppdrag__uppdrag__uppgift') }}
