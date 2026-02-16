-- Staging model for personlista__personuppgift__uppgift (person info fields)
-- Source abstraction layer - 1:1 passthrough from raw
-- _dlt_parent_id links to parent personlista._dlt_id

select
    kod,
    typ,
    intressent_id,
    hangar_id,
    _dlt_parent_id,
    _dlt_list_idx,
    _dlt_id
from {{ source('raw_riksdagen', 'personlista__personuppgift__uppgift') }}
