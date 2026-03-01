-- Int: Motion Outcome
-- One row per (motion, betänkande) pair.
-- A motion can be treated in multiple betänkanden when it spans multiple policy areas.
-- Resolves the mot → bet → utskottsforslag chain using dlt join keys.
--
-- Join strategy:
--   1. Motion links to betänkande via stg_dokumentstatus_referens (referenstyp='behandlar')
--   2. Betänkande links to utskottsforslag via _dlt_root_id
--   3. Explicit bifall from int_motion_bifall (parsed from forslag text) overrides default outcome
--
-- A motion is considered:
--   - approved (bifall)  when explicitly approved in int_motion_bifall OR vinnare = 'motförslaget'
--   - rejected (avslag)  when vinnare = 'utskottet' (and not explicitly approved)
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

-- Explicit bifall from parsed forslag text (reservation wins, etc.)
-- This is the authoritative source for motion approvals
explicit_bifall as (
    select
        mot_dok_id,
        bet_dok_id,
        outcome_score as bifall_score,
        bifall_typ,
        is_delvis_bifall,
        is_tillkannagivande,
        votering_id as bifall_votering_id,
        punkt as bifall_punkt,
        punkt_rubrik as bifall_punkt_rubrik,
        motforslag_partier as bifall_motforslag_partier
    from {{ ref('int_motion_bifall') }}
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
-- Explicit bifall from int_motion_bifall takes precedence.
motion_best_outcome as (
    select
        mtp.mot_dok_id,
        -- Use any_value for non-aggregated columns (they're the same per motion)
        any_value(mtp.mot_titel)                                       as mot_titel,
        any_value(mtp.rm)                                              as rm,
        any_value(mtp.organ)                                           as organ,
        mtp.bet_dok_id,
        
        -- Check if this motion has explicit bifall in this betänkande
        max(eb.bifall_score)                                           as explicit_bifall_score,
        any_value(eb.bifall_typ)                                       as bifall_typ,
        any_value(eb.is_delvis_bifall)                                 as is_delvis_bifall,
        any_value(eb.is_tillkannagivande)                              as is_tillkannagivande,
        
        -- Best outcome: explicit bifall > inferred outcome
        coalesce(
            max(eb.bifall_score),
            max(mtp.outcome_score)
        )                                                              as outcome_score,
        
        -- votering_id: prefer explicit bifall's votering_id, else best inferred
        coalesce(
            any_value(eb.bifall_votering_id),
            arg_max(mtp.votering_id, coalesce(mtp.outcome_score, 0))
        )                                                              as votering_id,
        
        -- punkt: prefer explicit bifall's punkt, else best inferred
        coalesce(
            any_value(eb.bifall_punkt),
            arg_max(mtp.punkt, coalesce(mtp.outcome_score, 0))
        )                                                              as punkt,
        
        coalesce(
            any_value(eb.bifall_punkt_rubrik),
            arg_max(mtp.punkt_rubrik, coalesce(mtp.outcome_score, 0))
        )                                                              as punkt_rubrik,
        
        coalesce(
            any_value(eb.bifall_motforslag_partier),
            arg_max(mtp.motforslag_partier, coalesce(mtp.outcome_score, 0))
        )                                                              as motforslag_partier,
        
        count(distinct mtp.punkt)                                      as punkt_count
        
    from motion_to_punkt mtp
    left join explicit_bifall eb 
        on eb.mot_dok_id = mtp.mot_dok_id 
        and eb.bet_dok_id = mtp.bet_dok_id
    group by mtp.mot_dok_id, mtp.bet_dok_id
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
    bifall_typ,
    is_delvis_bifall,
    is_tillkannagivande,

    -- Human-readable outcome label
    -- Score thresholds: 1.0 = full bifall, 0.7 = delvis bifall, 0.3 = avslag
    case
        when outcome_score >= 0.7 then 'bifall'
        when outcome_score = 0.3 then 'avslag'
        else 'unknown'
    end as outcome_label

from motion_best_outcome
