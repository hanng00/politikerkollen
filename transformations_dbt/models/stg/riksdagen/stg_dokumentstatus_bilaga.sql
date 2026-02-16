-- Staging model for dokumentstatus__dokbilaga__bilaga (document attachments)
-- Source abstraction layer - 1:1 passthrough from raw
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
