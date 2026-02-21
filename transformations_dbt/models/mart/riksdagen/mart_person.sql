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
),

-- Calculate party majority vote per votering_id and party
party_votes as (
    select
        action_id as votering_id,
        parti,
        vote_value,
        count(*) as vote_count
    from {{ ref('mart_person_timeline') }}
    where action_type = 'vote'
      and vote_value in ('Ja', 'Nej', 'Avstår')
    group by action_id, parti, vote_value
),

party_majority as (
    select votering_id, parti, vote_value as majority_vote
    from (
        select 
            votering_id, 
            parti, 
            vote_value,
            row_number() over (
                partition by votering_id, parti 
                order by vote_count desc
            ) as rn
        from party_votes
    )
    where rn = 1
),

-- Count rebel votes per person (votes against party majority)
rebel_stats as (
    select
        t.intressent_id,
        count(*) filter (where t.vote_value != pm.majority_vote) as rebel_vote_count
    from {{ ref('mart_person_timeline') }} t
    inner join party_majority pm 
        on pm.votering_id = t.action_id 
        and pm.parti = t.parti
    where t.action_type = 'vote'
      and t.vote_value in ('Ja', 'Nej', 'Avstår')
    group by t.intressent_id
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
    coalesce(r.rebel_vote_count, 0) as rebel_vote_count,
    s.first_action_date,
    s.last_action_date

from persons p
left join timeline_stats s on s.intressent_id = p.intressent_id
left join rebel_stats r on r.intressent_id = p.intressent_id
