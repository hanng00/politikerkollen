-- Staging model for dokumentstatus__dokutskottsforslag__utskottsforslag (committee proposals)
-- Source abstraction layer with deduplication
-- _dlt_root_id links to parent dokumentstatus._dlt_id

select
    punkt,
    rubrik,
    forslag,
    beslutstyp,
    motforslag_nummer,
    motforslag_partier,
    votering_id,
    votering_sammanfattning_html__table,
    votering_url_xml,
    rm,
    bet,
    vinnare,
    voteringskrav,
    beslutsregelkvot,
    beslutsregelparagraf,
    punkttyp,
    _dlt_root_id,
    _dlt_parent_id,
    _dlt_list_idx,
    _dlt_id,
    votering_sammanfattning_html,
    votering_sammanfattning_html__br,
    votering_sammanfattning_html__b
from {{ source('raw_riksdagen', 'dokumentstatus__dokutskottsforslag__utskottsforslag') }}
qualify row_number() over (
    partition by _dlt_root_id, punkt
    order by _dlt_id
) = 1
