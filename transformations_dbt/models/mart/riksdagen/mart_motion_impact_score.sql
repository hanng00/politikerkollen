-- Mart: Motion Impact Score
-- One row per motion with a composite impact score S ∈ [0, 1] and all sub-components.
--
-- S = 0.35·O + 0.20·M + 0.20·C + 0.15·N + 0.10·T
--
-- Components:
--   O  outcome_score      — bifall=1.0, avslag/acklamation=0.3, unresolved=null
--   M  vote_margin_score  — 1 − |Ja−Nej|/(Ja+Nej), null when no roll-call vote
--   C  cross_party_score  — distinct signatory parties / 8
--   N  signatory_score    — min(signatories / 50, 1.0)
--   T  topic_score        — static weight by utskott (organ)
--
-- Motioner without a betänkande outcome (newly filed, withdrawn) are included
-- with only the N and C components scored; O, M, T remain null.
-- Their provisional score uses only the available components, re-weighted.
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

-- Base: all motioner, with outcome data where available
motioner as (
    select
        ds.dokument__dok_id  as mot_dok_id,
        ds.dokument__titel   as mot_titel,
        ds.dokument__rm      as rm,
        ds.dokument__datum   as mot_datum,
        ds.dokument__subtyp  as mot_subtyp
    from {{ ref('stg_dokumentstatus') }} ds
    where ds.dokument__typ = 'mot'
      and ds.dokument__dok_id is not null
),

outcomes as (
    select * from {{ ref('int_motion_outcome') }}
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
    left join outcomes       o   on o.mot_dok_id   = m.mot_dok_id
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
                then 0.35 * outcome_score
                   + 0.20 * vote_margin_score
                   + 0.20 * cross_party_score
                   + 0.15 * signatory_score
                   + 0.10 * topic_score
            when outcome_score is not null and vote_margin_score is null
                -- Acklamation vote: no margin data, redistribute M weight to O
                then 0.55 * outcome_score
                   + 0.20 * cross_party_score
                   + 0.15 * signatory_score
                   + 0.10 * topic_score
            else
                -- No outcome yet (newly filed / pending)
                -- Score only on engagement signals
                0.55 * cross_party_score
                + 0.30 * signatory_score
                + 0.15 * topic_score
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
        'outcome':      {'score': outcome_score,       'label': outcome_label,    'weight': 0.35},
        'vote_margin':  {'score': vote_margin_score,   'ja': ja_count, 'nej': nej_count, 'weight': 0.20},
        'cross_party':  {'score': cross_party_score,   'parties': distinct_parties, 'weight': 0.20},
        'signatories':  {'score': signatory_score,     'count': signatory_count,  'weight': 0.15},
        'topic':        {'score': topic_score,         'organ': organ,            'weight': 0.10}
    }) as score_breakdown

from scored
