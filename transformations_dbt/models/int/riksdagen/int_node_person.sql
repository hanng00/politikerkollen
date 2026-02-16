-- Graph node: person
-- Source: stg_personlista (already deduplicated)
-- node_id = person:{intressent_id}
-- See docs/RELATIONS.md

select
    'person:' || intressent_id as node_id,
    intressent_id,
    sorteringsnamn,
    parti,
    valkrets,
    status,
    fodd_ar,
    kon
from {{ ref('stg_personlista') }}
