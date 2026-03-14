-- Int: Punkt Motion Decisions
-- Links each motion to the specific punkt(er) where it was decided.
--
-- This is the CORRECT lineage for motion → vote tracing:
--   motion ──[forslag text parsing]──> punkt ──> votering_id ──> party votes
--
-- The forslag text on each utskottsforslag explicitly names which motions
-- that punkt decides on (e.g., "avslår motion 2024/25:3440 yrkandena 1-4").
-- We parse these references to create a proper junction table.
--
-- This replaces the broken cross-join approach in int_vote_source_links
-- which linked every motion to ALL punkter in a betänkande.
--
-- Output: One row per (motion, betänkande, punkt) with:
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

-- Extract motion references from ALL forslag text (not just bifall)
-- Pattern matches: 2021/22:1234, 2024/25:567, etc.
motion_refs_extracted as (
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
        
        -- Extract all motion references as array
        regexp_extract_all(forslag, '(\d{4}/\d{2}:\d+)') as motion_refs,
        
        -- Determine the committee's recommendation for motions in this punkt
        -- The forslag text tells us if motions are being approved or rejected
        case
            when forslag like '%bifaller riksdagen motion%' 
                 or forslag like '%bifaller%proposition%' then 'bifaller'
            when forslag like '%avslår motion%' 
                 or forslag like '%avslår%proposition%' then 'avslar'
            else 'unknown'
        end as committee_recommendation,
        
        -- Is this a partial approval?
        case
            when forslag like '%delvis%bifaller%' 
                 or forslag like '%bifaller%delvis%' then true
            else false
        end as is_delvis,
        
        -- Is this a tillkännagivande (parliamentary directive)?
        case
            when forslag like '%tillkännager%' then true
            else false
        end as is_tillkannagivande
        
    from utskottsforslag
),

-- Unnest to get one row per motion reference per punkt
motion_refs_unnested_raw as (
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
        unnest(motion_refs) as motion_beteckning
        
    from motion_refs_extracted
    where len(motion_refs) > 0
),

-- Deduplicate: same motion can be referenced multiple times in forslag text
-- (e.g., "avslår motion X yrkande 1 och X yrkande 2")
motion_refs_unnested as (
    select
        bet_dlt_id,
        punkt,
        motion_beteckning,
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
    from motion_refs_unnested_raw
    group by bet_dlt_id, punkt, motion_beteckning
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

-- Join to motioner to convert rm:nummer to dok_id
-- Forslag text format: "2021/22:1234" (rm:nummer)
-- Motion dok_id format: "H9021234" (where H902 encodes 2021/22)
motioner as (
    select
        dokument__dok_id     as mot_dok_id,
        dokument__rm         as rm,
        dokument__nummer     as nummer,
        dokument__rm || ':' || dokument__nummer as rm_nummer,
        dokument__titel      as mot_titel
    from {{ ref('stg_dokumentstatus') }}
    where dokument__typ = 'mot'
      and dokument__dok_id is not null
      and dokument__nummer is not null
)

select
    m.mot_dok_id,
    m.mot_titel,
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
    r.motion_beteckning,
    
    -- Derive the actual outcome for this motion under this punkt
    -- vinnare tells us who won the vote:
    --   'utskottet' = committee recommendation adopted
    --   'motförslaget' = counter-proposal won (motion approved)
    --   'reservation X' = a reservation won
    case
        -- If committee recommended bifall and won, motion approved
        when r.committee_recommendation = 'bifaller' and r.vinnare = 'utskottet' then 'bifall'
        -- If committee recommended avslag and won, motion rejected
        when r.committee_recommendation = 'avslar' and r.vinnare = 'utskottet' then 'avslag'
        -- If motförslaget won, the counter-proposal (often the motion) was approved
        when r.vinnare = 'motförslaget' then 'bifall'
        -- If a reservation won and it contains bifall language, motion approved
        when r.vinnare like 'reservation%' and r.forslag like '%bifaller%motion%' then 'bifall'
        -- Acklamation typically means committee line passed without vote
        when r.beslutstyp = 'acklamation' and r.committee_recommendation = 'avslar' then 'avslag'
        when r.beslutstyp = 'acklamation' and r.committee_recommendation = 'bifaller' then 'bifall'
        else 'unknown'
    end as motion_outcome,
    
    -- Score for ranking: bifall > delvis bifall > avslag
    case
        when r.vinnare = 'motförslaget' then 1.0
        when r.committee_recommendation = 'bifaller' and r.vinnare = 'utskottet' then 
            case when r.is_delvis then 0.7 else 1.0 end
        when r.vinnare like 'reservation%' and r.forslag like '%bifaller%motion%' then
            case when r.is_delvis then 0.7 else 1.0 end
        when r.committee_recommendation = 'avslar' then 0.0
        else 0.0
    end as outcome_score

from motion_refs_unnested r
inner join betanden b on b.bet_dlt_id = r.bet_dlt_id
inner join motioner m on m.rm_nummer = r.motion_beteckning
