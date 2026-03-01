-- Int: Motion Vote Margin
-- One row per votering_id: aggregated Ja/Nej/Avstående counts and the M component.
--
-- M = 1 - |Ja - Nej| / (Ja + Nej)
--   M = 1.0  →  50/50 split (maximally contested)
--   M = 0.0  →  unanimous  (no contest)
--
-- Abstentions (Avstående) and absences (Frånvarande) are excluded from the
-- margin calculation — only deliberate Ja/Nej votes signal contentiousness.
--
-- votering_id joins to int_motion_outcome.votering_id
--
-- PERFORMANCE: Reads from materialized stg_voteringlista (already deduplicated).

with vote_counts as (
    select
        lower(votering_id) as votering_id,
        countif(rost = 'Ja')          as ja_count,
        countif(rost = 'Nej')         as nej_count,
        countif(rost = 'Avstående')   as abstain_count,
        countif(rost = 'Frånvarande') as absent_count,
        count(*)                      as total_count,
        -- Distinct parties that voted Ja (for cross-party signal later)
        count(distinct case when rost = 'Ja'  then parti end) as parties_ja,
        count(distinct case when rost = 'Nej' then parti end) as parties_nej
    from {{ ref('stg_voteringlista') }}
    where rost is not null
    group by lower(votering_id)
)

select
    votering_id,
    ja_count,
    nej_count,
    abstain_count,
    absent_count,
    total_count,
    parties_ja,
    parties_nej,

    -- M component: contentiousness
    case
        when (ja_count + nej_count) = 0 then 0.0
        else 1.0 - abs(ja_count - nej_count)::double / (ja_count + nej_count)
    end as vote_margin_score

from vote_counts
