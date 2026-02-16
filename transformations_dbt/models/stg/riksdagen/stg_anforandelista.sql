-- Staging model for anforandelista (speeches)
-- Source abstraction layer with deduplication
-- systemnyckel is the natural key - keep most recent record per systemnyckel

select
    systemnyckel,
    dok_datum,
    dok_rm,
    dok_id,
    nullif(trim(dok_id), '') as dok_id_normalized,
    dok_titel,
    anforande_id,
    anforande_nummer,
    talare,
    parti,
    anforandetext,
    intressent_id,
    nullif(trim(rel_dok_id), '') as rel_dok_id,
    avsnittsrubrik,
    underrubrik,
    kammaraktivitet,
    replik,
    systemdatum,
    _dlt_load_id,
    _dlt_id
from {{ source('raw_riksdagen', 'anforandelista') }}
where systemnyckel is not null
qualify row_number() over (
    partition by systemnyckel 
    order by _dlt_load_id desc nulls last
) = 1
