-- Staging model for dokumentstatus__dokintressent__intressent (document stakeholders)
-- _dlt_root_id links to parent dokumentstatus._dlt_id
--
-- Deduplicates at source: dlt re-ingestion appends duplicate intressent rows with
-- new _dlt_id values but identical (intressent_id, _dlt_root_id, roll, ordning).
-- Keeping the earliest _dlt_id per unique combination ensures clean downstream models.

select
    intressent_id,
    namn,
    lower(partibet) as partibet,
    ordning,
    roll,
    _dlt_root_id,
    _dlt_parent_id,
    _dlt_list_idx,
    _dlt_id
from {{ source('raw_riksdagen', 'dokumentstatus__dokintressent__intressent') }}
qualify row_number() over (
    partition by intressent_id, _dlt_root_id, roll, ordning
    order by _dlt_id
) = 1
