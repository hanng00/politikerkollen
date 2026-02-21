-- Int: Motion Signatories
-- One row per motion: signatory count, party breadth, and derived N + C components.
--
-- Source: stg_dokumentstatus_intressent where parent document is a motion (typ='mot').
-- Each intressent row has a roll (undertecknare = co-signer, huvudman = lead author).
-- Both roles count as signatories for N; partibet gives party for C.
--
-- N = min(signatory_count / 50, 1.0)
-- C = distinct_signatory_parties / 8.0   (8 parties in riksdagen)

with motioner as (
    select
        _dlt_id          as mot_dlt_id,
        dokument__dok_id as mot_dok_id
    from {{ ref('stg_dokumentstatus') }}
    where dokument__typ = 'mot'
      and dokument__dok_id is not null
),

-- stg_dokumentstatus_intressent is already deduplicated at staging layer
signatories as (
    select
        i._dlt_root_id as mot_dlt_id,
        i.intressent_id,
        i.partibet,
        i.roll
    from {{ ref('stg_dokumentstatus_intressent') }} i
    where i.roll in ('undertecknare', 'huvudman')
      and i.intressent_id is not null
),

motion_signatories as (
    select
        m.mot_dok_id,
        count(s.intressent_id)            as signatory_count,
        count(distinct s.partibet)        as distinct_parties,
        -- JSON list of signatories for display breakdown
        to_json(list(distinct s.partibet)) as signatory_parties

    from motioner m
    left join signatories s on s.mot_dlt_id = m.mot_dlt_id
    group by m.mot_dok_id
)

select
    mot_dok_id,
    signatory_count,
    distinct_parties,
    signatory_parties,

    -- N component: signatory breadth, capped at 50
    least(signatory_count / 50.0, 1.0) as signatory_score,

    -- C component: cross-party support (8 parties in riksdagen)
    least(distinct_parties / 8.0, 1.0) as cross_party_score

from motion_signatories
