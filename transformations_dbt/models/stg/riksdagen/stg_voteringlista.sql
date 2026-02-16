-- Staging model for voteringlista (voting records)
-- Raw passthrough - only source abstraction layer
-- Business logic belongs in int layer

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
