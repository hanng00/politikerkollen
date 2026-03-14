-- Int: Punkt Proposition Decisions
-- Links each proposition to the specific punkt(er) where it was decided.
--
-- This mirrors int_punkt_motion_decisions but for propositions (prop).
-- Propositions are referenced in utskottsforslag.forslag text similar to motions.
--
-- The forslag text explicitly names which propositions that punkt decides on
-- (e.g., "bifaller proposition 2024/25:1 punkt 1-5").
--
-- Output: One row per (proposition, betänkande, punkt) with:
--   - The committee's recommendation (bifaller/avslar)
--   - The votering_id (if a roll-call vote occurred)
--   - The vinnare (who won: utskottet, reservation, motförslaget)

with utskottsforslag as (
    select
        _dlt_root_id as bet_dlt_id,
        punkt,
        rubrik as punkt_rubrik,
        forslag,
        beslutstyp,
        vinnare,
        votering_id,
        motforslag_partier,
        rm,
        bet
    from {{ ref('stg_dokumentstatus_utskottsforslag') }}
    where forslag is not null
),

-- Extract proposition references from forslag text
-- Pattern matches: "proposition 2024/25:1" or "prop. 2024/25:1"
proposition_refs_extracted as (
    select
        bet_dlt_id,
        punkt,
        punkt_rubrik,
        forslag,
        beslutstyp,
        vinnare,
        votering_id,
        motforslag_partier,
        rm,
        bet,
        
        -- Extract all proposition references as array
        -- Matches patterns like "proposition 2024/25:1" or "prop. 2024/25:1"
        regexp_extract_all(lower(forslag), 'prop(?:osition|\.)\s*(\d{4}/\d{2}:\d+)') as prop_refs,
        
        -- Determine the committee's recommendation for propositions in this punkt
        case
            when lower(forslag) like '%bifaller%proposition%' 
                 or lower(forslag) like '%bifaller%prop.%' then 'bifaller'
            when lower(forslag) like '%avslår%proposition%' 
                 or lower(forslag) like '%avslår%prop.%' then 'avslar'
            else 'unknown'
        end as committee_recommendation,
        
        -- Is this a partial approval?
        case
            when lower(forslag) like '%delvis%bifaller%' 
                 or lower(forslag) like '%bifaller%delvis%' then true
            else false
        end as is_delvis,
        
        -- Is this a tillkännagivande (parliamentary directive)?
        case
            when lower(forslag) like '%tillkännager%' then true
            else false
        end as is_tillkannagivande
        
    from utskottsforslag
),

-- Unnest to get one row per proposition reference per punkt
proposition_refs_unnested_raw as (
    select
        bet_dlt_id,
        punkt,
        punkt_rubrik,
        forslag,
        beslutstyp,
        vinnare,
        votering_id,
        motforslag_partier,
        rm,
        bet,
        committee_recommendation,
        is_delvis,
        is_tillkannagivande,
        unnest(prop_refs) as prop_beteckning
        
    from proposition_refs_extracted
    where len(prop_refs) > 0
),

-- Deduplicate: same proposition can be referenced multiple times in forslag text
proposition_refs_unnested as (
    select
        bet_dlt_id,
        punkt,
        prop_beteckning,
        any_value(punkt_rubrik) as punkt_rubrik,
        any_value(forslag) as forslag,
        any_value(beslutstyp) as beslutstyp,
        any_value(vinnare) as vinnare,
        any_value(votering_id) as votering_id,
        any_value(motforslag_partier) as motforslag_partier,
        any_value(rm) as rm,
        any_value(bet) as bet,
        any_value(committee_recommendation) as committee_recommendation,
        any_value(is_delvis) as is_delvis,
        any_value(is_tillkannagivande) as is_tillkannagivande
    from proposition_refs_unnested_raw
    group by bet_dlt_id, punkt, prop_beteckning
),

-- Join to betänkanden to get bet_dok_id
betanden as (
    select
        _dlt_id          as bet_dlt_id,
        dokument__dok_id as bet_dok_id,
        dokument__organ  as organ
    from {{ ref('stg_dokumentstatus') }}
    where dokument__typ = 'bet'
      and dokument__dok_id is not null
),

-- Join to propositioner to convert rm:nummer to dok_id
-- Forslag text format: "2021/22:1" (rm:nummer)
-- Proposition dok_id format: "H9031" (where H903 encodes 2021/22)
propositioner as (
    select
        dokument__dok_id     as prop_dok_id,
        dokument__rm         as rm,
        dokument__nummer     as nummer,
        dokument__rm || ':' || dokument__nummer as rm_nummer,
        dokument__titel      as prop_titel
    from {{ ref('stg_dokumentstatus') }}
    where dokument__typ = 'prop'
      and dokument__dok_id is not null
      and dokument__nummer is not null
)

select
    p.prop_dok_id,
    p.prop_titel,
    b.bet_dok_id,
    b.organ,
    r.punkt,
    r.punkt_rubrik,
    r.beslutstyp,
    r.vinnare,
    lower(r.votering_id) as votering_id,
    r.motforslag_partier,
    r.rm as bet_rm,
    r.bet,
    r.committee_recommendation,
    r.is_delvis,
    r.is_tillkannagivande,
    r.prop_beteckning,
    
    -- Derive the actual outcome for this proposition under this punkt
    -- vinnare tells us who won the vote:
    --   'utskottet' = committee recommendation adopted
    --   'motförslaget' = counter-proposal won
    --   'reservation X' = a reservation won
    case
        -- If committee recommended bifall and won, proposition approved
        when r.committee_recommendation = 'bifaller' and r.vinnare = 'utskottet' then 'bifall'
        -- If committee recommended avslag and won, proposition rejected
        when r.committee_recommendation = 'avslar' and r.vinnare = 'utskottet' then 'avslag'
        -- If motförslaget won, the counter-proposal was approved
        when r.vinnare = 'motförslaget' then 'avslag'  -- Counter-proposal usually opposes prop
        -- If a reservation won, check if it supports or opposes the proposition
        when r.vinnare like 'reservation%' and lower(r.forslag) like '%bifaller%prop%' then 'bifall'
        when r.vinnare like 'reservation%' and lower(r.forslag) like '%avslår%prop%' then 'avslag'
        -- Acklamation typically means committee line passed without vote
        when r.beslutstyp = 'acklamation' and r.committee_recommendation = 'avslar' then 'avslag'
        when r.beslutstyp = 'acklamation' and r.committee_recommendation = 'bifaller' then 'bifall'
        -- Default: propositions almost always pass
        else 'bifall'
    end as proposition_outcome

from proposition_refs_unnested r
inner join betanden b on b.bet_dlt_id = r.bet_dlt_id
inner join propositioner p on p.rm_nummer = r.prop_beteckning
