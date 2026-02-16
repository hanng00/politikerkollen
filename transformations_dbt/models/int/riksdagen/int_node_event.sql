-- Graph node: event (votering, anförande)
-- Sources: stg_voteringlista, stg_anforande
-- node_id = event:vot_{votering_id} | event:anf_{systemnyckel}
-- See docs/RELATIONS.md

-- Votering events
select
    'event:vot_' || votering_id as node_id,
    votering_id as event_id,
    'votering' as event_typ,
    null as kammaraktivitet,
    min(systemdatum) as datum
from {{ ref('stg_voteringlista') }}
where votering_id is not null
group by votering_id

union all

-- Anförande (speech) events (stg already deduplicated on systemnyckel)
select
    'event:anf_' || systemnyckel as node_id,
    systemnyckel as event_id,
    'anforande' as event_typ,
    kammaraktivitet,
    systemdatum as datum
from {{ ref('stg_anforande') }}
