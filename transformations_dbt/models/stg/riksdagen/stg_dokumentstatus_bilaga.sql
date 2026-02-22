-- Staging model for dokumentstatus__dokbilaga__bilaga (document attachments)
-- Source abstraction layer with deduplication
-- _dlt_root_id links to parent dokumentstatus._dlt_id

select
    dok_id,
    subtitel,
    filnamn,
    filstorlek,
    filtyp,
    titel,
    fil_url,
    _dlt_root_id,
    _dlt_parent_id,
    _dlt_list_idx,
    _dlt_id
from {{ source('raw_riksdagen', 'dokumentstatus__dokbilaga__bilaga') }}
qualify row_number() over (
    partition by _dlt_root_id, dok_id, filnamn
    order by _dlt_id
) = 1
