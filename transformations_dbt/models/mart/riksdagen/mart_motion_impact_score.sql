-- Mart: Motion Impact Score
-- One row per motion with a composite impact score S ∈ [0, 1] and all sub-components.
--
-- Formula (v2):
--   S = 0.40·O + 0.25·M + 0.15·C + 0.10·N + 0.10·T
--
-- Components:
--   O  outcome_score      — bifall=1.0, avslag=0.3 (boosted by M if close vote)
--   M  vote_margin_score  — 1 − |Ja−Nej|/(Ja+Nej), null when no roll-call vote
--   C  cross_party_score  — sqrt(distinct_parties / 8) — diminishing returns
--   N  signatory_score    — ln(1 + signatories) / ln(51) — diminishing returns
--   T  topic_score        — static weight by utskott (organ)
--
-- Design principles:
--   1. Outcome + vote margin (65% combined) dominate when available — actual
--      parliamentary treatment is the strongest signal of impact.
--   2. Signatories and cross-party use log/sqrt transforms for diminishing
--      marginal returns (5→15 signatories matters more than 35→45).
--   3. Provisional motions (no outcome yet) are scored only on engagement
--      signals (C, N, T) with re-weighted formula. These scores are NOT
--      comparable to resolved motions and are flagged with is_provisional=true.
--
-- The display_breakdown JSON column enables the UI to render per-component tooltips.

-- Topic weight by organ (utskott)
-- Source: riksdagen.se committee definitions
with topic_weights as (
    select * from (values
        ('FiU',  1.0),
        ('KU',   0.9),
        ('FöU',  0.8),
        ('JuU',  0.8),
        ('SoU',  0.7),
        ('UU',   0.7),
        ('SkU',  0.7),
        ('AU',   0.6),
        ('CU',   0.6),
        ('MJU',  0.6),
        ('TU',   0.6),
        ('UbU',  0.6),
        ('KrU',  0.5),
        ('NU',   0.5),
        ('SfU',  0.5),
        ('EU',   0.5)
    ) t(organ, topic_score)
),

-- Base: all motioner (unique by dok_id from stg_dokumentstatus)
motioner as (
    select
        dokument__dok_id  as mot_dok_id,
        dokument__titel   as mot_titel,
        dokument__rm      as rm,
        dokument__datum   as mot_datum,
        dokument__subtyp  as mot_subtyp
    from {{ ref('stg_dokumentstatus') }}
    where dokument__typ = 'mot'
      and dokument__dok_id is not null
),

outcomes as (
    select * from {{ ref('int_motion_outcome') }}
),

-- Aggregate outcomes: a motion can be treated in multiple betänkanden
-- Keep the best outcome (bifall > avslag) with its associated metadata
outcomes_best as (
    select
        mot_dok_id,
        max(outcome_score)                           as outcome_score,
        arg_max(outcome_label, outcome_score)        as outcome_label,
        arg_max(organ, outcome_score)                as organ,
        arg_max(bet_dok_id, outcome_score)           as bet_dok_id,
        arg_max(votering_id, outcome_score)          as votering_id,
        arg_max(punkt_rubrik, outcome_score)         as punkt_rubrik,
        arg_max(bifall_typ, outcome_score)           as bifall_typ,
        arg_max(is_delvis_bifall, outcome_score)     as is_delvis_bifall,
        arg_max(is_tillkannagivande, outcome_score)  as is_tillkannagivande,
        count(*)                                     as bet_count
    from outcomes
    group by mot_dok_id
),

vote_margins as (
    select * from {{ ref('int_motion_vote_margin') }}
),

signatories as (
    select * from {{ ref('int_motion_signatories') }}
),

-- Assemble all components per motion
assembled as (
    select
        m.mot_dok_id,
        m.mot_titel,
        m.rm,
        m.mot_datum,
        m.mot_subtyp,

        -- Outcome
        o.outcome_score,
        o.outcome_label,
        o.organ,
        o.bet_dok_id,
        o.votering_id,
        o.punkt_rubrik,
        o.bifall_typ,
        o.is_delvis_bifall,
        o.is_tillkannagivande,

        -- Vote margin (null if acklamation or unresolved)
        vm.vote_margin_score,
        vm.ja_count,
        vm.nej_count,
        vm.abstain_count,

        -- Signatories
        coalesce(s.signatory_score,   0.0) as signatory_score,
        coalesce(s.cross_party_score, 0.0) as cross_party_score,
        coalesce(s.signatory_count,   0)   as signatory_count,
        coalesce(s.distinct_parties,  0)   as distinct_parties,
        s.signatory_parties,

        -- Topic
        coalesce(tw.topic_score, 0.3) as topic_score

    from motioner m
    left join outcomes_best  o   on o.mot_dok_id   = m.mot_dok_id
    left join vote_margins   vm  on lower(vm.votering_id) = lower(o.votering_id)
    left join signatories    s   on s.mot_dok_id   = m.mot_dok_id
    left join topic_weights  tw  on tw.organ        = o.organ
),

-- Compute S with available components
-- When O or M is null (unresolved motion), re-weight across available components
scored as (
    select
        *,

        -- Effective weights depend on data availability
        case
            when outcome_score is not null and vote_margin_score is not null
                -- All components available: full formula
                -- S = 0.40·O + 0.25·M + 0.15·C + 0.10·N + 0.10·T
                then 0.40 * outcome_score
                   + 0.25 * vote_margin_score
                   + 0.15 * cross_party_score
                   + 0.10 * signatory_score
                   + 0.10 * topic_score
            when outcome_score is not null and vote_margin_score is null
                -- Acklamation vote: no margin data
                -- Redistribute M weight to O (0.40 + 0.25 = 0.65)
                then 0.65 * outcome_score
                   + 0.15 * cross_party_score
                   + 0.10 * signatory_score
                   + 0.10 * topic_score
            else
                -- No outcome yet (newly filed / pending)
                -- Score only on engagement signals, re-weighted to sum to 1.0
                -- C: 0.15 → 0.43, N: 0.10 → 0.29, T: 0.10 → 0.29
                0.43 * cross_party_score
                + 0.29 * signatory_score
                + 0.28 * topic_score
        end as impact_score,

        -- Flag so consumers know if score is provisional
        case
            when outcome_score is null then true
            else false
        end as is_provisional

    from assembled
)

select
    mot_dok_id,
    mot_titel,
    rm,
    mot_datum,
    mot_subtyp,

    -- Final score
    round(impact_score, 4)  as impact_score,
    is_provisional,

    -- Raw components (for breakdown display)
    outcome_score,
    outcome_label,
    vote_margin_score,
    cross_party_score,
    signatory_score,
    topic_score,

    -- Bifall metadata
    bifall_typ,
    is_delvis_bifall,
    is_tillkannagivande,

    -- Supporting detail (for breakdown tooltip)
    ja_count,
    nej_count,
    abstain_count,
    signatory_count,
    distinct_parties,
    signatory_parties,
    organ,
    bet_dok_id,
    votering_id,
    punkt_rubrik,

    -- Machine-readable breakdown for UI rendering
    to_json({
        'outcome':      {'score': outcome_score,       'label': outcome_label,    'weight': 0.40},
        'vote_margin':  {'score': vote_margin_score,   'ja': ja_count, 'nej': nej_count, 'weight': 0.25},
        'cross_party':  {'score': cross_party_score,   'parties': distinct_parties, 'weight': 0.15},
        'signatories':  {'score': signatory_score,     'count': signatory_count,  'weight': 0.10},
        'topic':        {'score': topic_score,         'organ': organ,            'weight': 0.10}
    }) as score_breakdown

from scored
