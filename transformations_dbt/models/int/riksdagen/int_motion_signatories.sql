-- Int: Motion Signatories
-- One row per motion: signatory count, party breadth, and derived N + C components.
--
-- Source: stg_dokumentstatus_intressent where parent document is a motion (typ='mot').
-- Each intressent row has a roll (undertecknare = co-signer, huvudman = lead author).
-- Both roles count as signatories for N; partibet gives party for C.
--
-- Transforms (diminishing returns):
--   N = ln(1 + signatory_count) / ln(51)   — log scale, capped at 50 signatories
--   C = sqrt(distinct_parties / 8.0)       — sqrt scale for cross-party support
--
-- Rationale: The difference between 5 and 15 signatories is more meaningful than
-- between 35 and 45. Similarly, going from 1 to 3 parties is more significant
-- than going from 6 to 8 parties.

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

    -- N component: signatory breadth with log transform (diminishing returns)
    -- ln(1 + count) / ln(51) gives 0 at 0 signatories, 1.0 at 50 signatories
    least(ln(1.0 + signatory_count) / ln(51.0), 1.0) as signatory_score,

    -- C component: cross-party support with sqrt transform (diminishing returns)
    -- sqrt(parties/8) gives 0.35 at 1 party, 0.71 at 4 parties, 1.0 at 8 parties
    sqrt(least(distinct_parties / 8.0, 1.0)) as cross_party_score

from motion_signatories
