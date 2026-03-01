-- Int: Motion Bifall (Approved Motions)
-- Extracts explicit motion approvals from utskottsforslag decision text.
--
-- Swedish parliament rarely approves motions via vinnare='motförslaget'.
-- Instead, motions are approved through:
--   1. Reservation wins (vinnare LIKE 'reservation%') where forslag text
--      explicitly states "bifaller riksdagen motion(erna) X"
--   2. Direct bifall (vinnare='bifall') - rare, usually constitutional matters
--
-- This model parses the forslag text to extract specific motion dok_ids
-- that were approved, enabling accurate attribution of wins to motions.
--
-- Output: One row per (approved motion, betänkande, punkt) with approval type.
-- Downstream: Joins to int_motion_outcome to set outcome_label='bifall'.

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

-- Identify winning decisions that approve motions
-- Look for "bifaller riksdagen motion" pattern in forslag text
winning_decisions as (
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
        
        -- Classify the type of approval
        case
            when vinnare = 'bifall' then 'direkt_bifall'
            when vinnare like 'reservation%' 
                 and forslag like '%bifaller riksdagen motion%' then 'reservation_bifall'
            when vinnare = 'utskottet' 
                 and forslag like '%bifaller riksdagen motion%' then 'utskott_bifall'
            else null
        end as bifall_typ,
        
        -- Check for partial approval
        case
            when forslag like '%delvis%bifaller%motion%' 
                 or forslag like '%bifaller%delvis%motion%' then true
            else false
        end as is_delvis_bifall,
        
        -- Check if this is a tillkännagivande (parliamentary directive)
        case
            when forslag like '%tillkännager%' then true
            else false
        end as is_tillkannagivande
        
    from utskottsforslag
    where 
        -- Include decisions that approve motions
        (vinnare = 'bifall')
        or (vinnare like 'reservation%' and forslag like '%bifaller riksdagen motion%')
        or (vinnare = 'utskottet' and forslag like '%bifaller riksdagen motion%')
),

-- Extract motion references from forslag text using regex
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
        bifall_typ,
        is_delvis_bifall,
        is_tillkannagivande,
        
        -- Extract all motion references as array
        regexp_extract_all(forslag, '(\d{4}/\d{2}:\d+)') as motion_refs
        
    from winning_decisions
    where bifall_typ is not null
),

-- Unnest to get one row per approved motion reference
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
        bifall_typ,
        is_delvis_bifall,
        is_tillkannagivande,
        unnest(motion_refs) as motion_beteckning
        
    from motion_refs_extracted
    where len(motion_refs) > 0
),

-- Deduplicate: same motion can be referenced multiple times in forslag text
-- (e.g., "bifaller motion X yrkande 1 och X yrkande 2")
motion_refs_unnested as (
    select
        bet_dlt_id,
        punkt,
        any_value(punkt_rubrik) as punkt_rubrik,
        any_value(forslag) as forslag,
        any_value(beslutstyp) as beslutstyp,
        any_value(vinnare) as vinnare,
        any_value(votering_id) as votering_id,
        any_value(motforslag_partier) as motforslag_partier,
        any_value(rm) as rm,
        any_value(bet) as bet,
        any_value(bifall_typ) as bifall_typ,
        any_value(is_delvis_bifall) as is_delvis_bifall,
        any_value(is_tillkannagivande) as is_tillkannagivande,
        motion_beteckning
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
    r.votering_id,
    r.motforslag_partier,
    r.rm as bet_rm,
    r.bet,
    r.bifall_typ,
    r.is_delvis_bifall,
    r.is_tillkannagivande,
    r.motion_beteckning,
    
    -- Outcome score: full bifall = 1.0, delvis bifall = 0.7
    case
        when r.is_delvis_bifall then 0.7
        else 1.0
    end as outcome_score

from motion_refs_unnested r
inner join betanden b on b.bet_dlt_id = r.bet_dlt_id
inner join motioner m on m.rm_nummer = r.motion_beteckning
