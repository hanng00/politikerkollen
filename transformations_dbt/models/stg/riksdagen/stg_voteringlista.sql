-- Staging model for voteringlista (voting records)
-- Source abstraction layer with deduplication
-- (votering_id, intressent_id) is the natural key - one vote per person per voting event
-- Keep most recent record per key

select
    votering_id,
    intressent_id,
    namn,
    fornamn,
    efternamn,
    parti,
    valkrets,
    iort,
    kon,
    fodd,
    rost,
    avser,
    votering,
    dok_id,
    beteckning,
    punkt,
    rm,
    systemdatum,
    _dlt_load_id,
    _dlt_id
from {{ source('raw_riksdagen', 'voteringlista') }}
where intressent_id is not null
qualify row_number() over (
    partition by votering_id, intressent_id 
    order by _dlt_load_id desc nulls last
) = 1
