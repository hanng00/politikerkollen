-- Staging model for anforande (full speech text)
-- Source abstraction layer with deduplication
-- systemnyckel is the natural key - keep most recent record per systemnyckel
-- This source provides full anforandetext (vs truncated in anforandelista)

select
    systemnyckel,
    dok_datum,
    dok_rm,
    dok_id,
    nullif(trim(dok_id), '') as dok_id_normalized,
    dok_titel,
    dok_nummer,
    dok_hangar_id,
    anforande_id,
    anforande_nummer,
    talare,
    parti,
    intressent_id,
    -- Full speech text (HTML)
    anforandetext,
    -- Cleaned speech text (HTML tags stripped)
    regexp_replace(anforandetext, '<[^>]+>', '', 'g') as anforandetext_clean,
    -- Related document being debated (e.g., interpellation, motion)
    rel_dok_id,
    nullif(trim(rel_dok_id), '') as rel_dok_id_normalized,
    avsnittsrubrik,
    underrubrik,
    kammaraktivitet,
    replik,
    systemdatum,
    protokoll_url_www,
    _dlt_load_id,
    _dlt_id
from {{ source('raw_riksdagen', 'anforande') }}
where systemnyckel is not null
qualify row_number() over (
    partition by systemnyckel 
    order by _dlt_load_id desc nulls last
) = 1
