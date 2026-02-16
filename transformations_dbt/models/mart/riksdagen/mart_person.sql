-- Mart: Person (politicians)
-- One row per politician with aggregated stats from their timeline.
-- Designed for the /politicians API endpoint.
--
-- Query patterns:
--   - List all: SELECT * FROM mart_person ORDER BY namn
--   - Search: SELECT * FROM mart_person WHERE jaro_winkler_similarity('query', namn) > 0.8
--   - By party: SELECT * FROM mart_person WHERE parti = 'S'

with persons as (
    select
        intressent_id,
        tilltalsnamn,
        efternamn,
        tilltalsnamn || ' ' || efternamn as namn,
        sorteringsnamn,
        parti,
        valkrets,
        status,
        fodd_ar,
        kon,
        bild_url_80,
        bild_url_192,
        bild_url_max
    from {{ ref('stg_personlista') }}
),

-- Aggregate stats from timeline
timeline_stats as (
    select
        intressent_id,
        count(*) as total_actions,
        count(*) filter (where action_type = 'vote') as total_votes,
        count(*) filter (where action_type = 'speech') as total_speeches,
        count(*) filter (where action_type = 'authored') as total_authored,
        min(action_date) as first_action_date,
        max(action_date) as last_action_date
    from {{ ref('mart_person_timeline') }}
    group by intressent_id
)

select
    p.intressent_id,
    p.tilltalsnamn,
    p.efternamn,
    p.namn,
    p.sorteringsnamn,
    p.parti,
    p.valkrets,
    p.status,
    p.fodd_ar,
    p.kon,
    p.bild_url_80,
    p.bild_url_192,
    p.bild_url_max,
    
    -- Stats
    coalesce(s.total_actions, 0) as total_actions,
    coalesce(s.total_votes, 0) as total_votes,
    coalesce(s.total_speeches, 0) as total_speeches,
    coalesce(s.total_authored, 0) as total_authored,
    s.first_action_date,
    s.last_action_date

from persons p
left join timeline_stats s on s.intressent_id = p.intressent_id
