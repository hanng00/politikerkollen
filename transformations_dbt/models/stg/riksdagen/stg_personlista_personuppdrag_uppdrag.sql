-- Staging model for personlista__personuppdrag__uppdrag (parliamentary assignments)
-- Source abstraction layer - 1:1 passthrough from raw
-- _dlt_parent_id links to parent personlista._dlt_id

select
    organ_kod,
    roll_kod,
    ordningsnummer,
    status,
    typ,
    "from",
    tom,
    intressent_id,
    hangar_id,
    sortering,
    organ_sortering,
    uppdrag_rollsortering,
    uppdrag_statussortering,
    _dlt_parent_id,
    _dlt_list_idx,
    _dlt_id
from {{ source('raw_riksdagen', 'personlista__personuppdrag__uppdrag') }}
