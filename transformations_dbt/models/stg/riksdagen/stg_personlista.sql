-- Staging model for personlista (members)
-- Source abstraction layer with deduplication
-- intressent_id is the natural key - keep most recent record per intressent_id
-- Note: personuppdrag and personuppgift are nested JSON structures
--       They will be extracted/flattened in intermediate models as needed

select
    hangar_guid,
    sourceid,
    intressent_id,
    hangar_id,
    fodd_ar,
    kon,
    efternamn,
    tilltalsnamn,
    sorteringsnamn,
    iort,
    parti,
    valkrets,
    status,
    person_url_xml,
    bild_url_80,
    bild_url_192,
    bild_url_max,
    _dlt_load_id,
    _dlt_id,
    personuppdrag,  -- JSON: { "uppdrag": [...] }
    personuppgift   -- JSON: nested structure
from {{ source('raw_riksdagen', 'personlista') }}
where intressent_id is not null
qualify row_number() over (
    partition by intressent_id 
    order by _dlt_load_id desc nulls last
) = 1
