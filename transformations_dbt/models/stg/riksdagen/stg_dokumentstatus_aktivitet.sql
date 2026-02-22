-- Staging model for dokumentstatus__dokaktivitet__aktivitet (document activities)
-- Source abstraction layer with deduplication
-- _dlt_root_id links to parent dokumentstatus._dlt_id
--
-- Deduplicates: With append-only raw layer, re-ingestion creates duplicate rows.
-- Keep earliest _dlt_id per unique combination.

select
    kod,
    namn,
    datum,
    status,
    ordning,
    process,
    _dlt_root_id,
    _dlt_parent_id,
    _dlt_list_idx,
    _dlt_id
from {{ source('raw_riksdagen', 'dokumentstatus__dokaktivitet__aktivitet') }}
qualify row_number() over (
    partition by _dlt_root_id, kod, datum, ordning
    order by _dlt_id
) = 1
