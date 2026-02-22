-- Int: Motion Outcome
-- One row per (motion, betänkande) pair.
-- A motion can be treated in multiple betänkanden when it spans multiple policy areas.
-- Resolves the mot → bet → utskottsforslag chain using dlt join keys.
--
-- Join strategy:
--   1. Motion links to betänkande via stg_dokumentstatus_referens (referenstyp='behandlar')
--   2. Betänkande links to utskottsforslag via _dlt_root_id
--   Note: We do NOT filter on forslag text - it uses rm:beteckning format (e.g. "2024/25:3322")
--   which differs from dok_id (e.g. "HC023322"), and doesn't reliably list all related motions.
--
-- A motion is considered:
--   - approved (bifall)  when vinnare = 'motförslaget'
--   - rejected (avslag)  when vinnare = 'utskottet'
--   - acklamation        when beslutstyp = 'acklamation' (no roll-call vote)
--
-- One motion may appear in multiple utskottsforslag punkter within a betänkande.
-- We keep the best outcome per betänkande: bifall > acklamation > avslag.

with motioner as (
    select
        _dlt_id          as mot_dlt_id,
        dokument__dok_id as mot_dok_id,
        dokument__titel  as mot_titel,
        dokument__rm     as rm
    from {{ ref('stg_dokumentstatus') }}
    where dokument__typ = 'mot'
      and dokument__dok_id is not null
),

-- referens rows live on the bet side; ref_dok_id points to the motion
bet_referens as (
    select
        ref_dok_id,                -- = mot_dok_id
        _dlt_root_id as bet_dlt_id -- parent bet
    from {{ ref('stg_dokumentstatus_referens') }}
    where referenstyp = 'behandlar'
      and ref_dok_typ  = 'mot'
),

-- betänkanden: organ drives the T (topic) component
betanden as (
    select
        _dlt_id              as bet_dlt_id,
        dokument__dok_id     as bet_dok_id,
        dokument__organ      as organ,
        dokument__rm         as bet_rm
    from {{ ref('stg_dokumentstatus') }}
    where dokument__typ = 'bet'
      and dokument__dok_id is not null
),

-- utskottsforslag: one row per punkt per bet
-- forslag text names the motion dok_ids that punkt resolves
utskottsforslag as (
    select
        _dlt_root_id  as bet_dlt_id,
        punkt,
        rubrik,
        forslag,
        beslutstyp,
        vinnare,
        votering_id,
        motforslag_partier
    from {{ ref('stg_dokumentstatus_utskottsforslag') }}
    where forslag is not null
),

-- Join chain: mot → referens → bet → utskottsforslag
-- The referens table links motion to betänkande via _dlt_root_id.
-- We do NOT filter on forslag text since it uses a different ID format (rm:beteckning)
-- and doesn't reliably contain the specific motion's reference.
motion_to_punkt as (
    select
        m.mot_dok_id,
        m.mot_titel,
        m.rm,
        b.organ,
        b.bet_dok_id,
        u.punkt,
        u.rubrik        as punkt_rubrik,
        u.beslutstyp,
        u.vinnare,
        u.votering_id,
        u.motforslag_partier,

        -- Outcome score component O
        case u.vinnare
            when 'motförslaget' then 1.0
            when 'utskottet'    then 0.3
            else case u.beslutstyp
                when 'acklamation' then 0.3  -- typically utskottets line passes without vote
                else null
            end
        end as outcome_score

    from motioner m
    inner join bet_referens   br on br.ref_dok_id  = m.mot_dok_id
    inner join betanden        b  on b.bet_dlt_id   = br.bet_dlt_id
    inner join utskottsforslag u  on u.bet_dlt_id   = br.bet_dlt_id
),

-- When one motion is linked to a betänkande, we get ALL punkter in that betänkande.
-- We keep only the best outcome per (mot_dok_id, bet_dok_id) pair.
motion_best_outcome as (
    select
        mot_dok_id,
        -- Use any_value for non-aggregated columns (they're the same per motion)
        any_value(mot_titel)                                       as mot_titel,
        any_value(rm)                                              as rm,
        any_value(organ)                                           as organ,
        bet_dok_id,
        -- Best outcome wins (bifall=1.0 > acklamation/avslag=0.3)
        max(outcome_score)                                         as outcome_score,
        -- votering_id for the highest-stakes punkt (prefer voted over acklamation)
        arg_max(votering_id, coalesce(outcome_score, 0))           as votering_id,
        arg_max(punkt, coalesce(outcome_score, 0))                 as punkt,
        arg_max(punkt_rubrik, coalesce(outcome_score, 0))          as punkt_rubrik,
        arg_max(motforslag_partier, coalesce(outcome_score, 0))    as motforslag_partier,
        count(*)                                                   as punkt_count
    from motion_to_punkt
    group by mot_dok_id, bet_dok_id
)

select
    mot_dok_id,
    mot_titel,
    rm,
    organ,
    bet_dok_id,
    outcome_score,
    votering_id,
    punkt,
    punkt_rubrik,
    motforslag_partier,
    punkt_count,

    -- Human-readable outcome label
    case
        when outcome_score = 1.0 then 'bifall'
        when outcome_score = 0.3 then 'avslag'
        else 'unknown'
    end as outcome_label

from motion_best_outcome
