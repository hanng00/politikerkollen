-- Int: Vote Party Aggregation
-- Aggregates individual votes to party-level positions per votering_id.
-- This is pure SQL transformation with no LLM involvement.
--
-- Output: One row per (votering_id, parti) with vote counts.
-- Used by cognition module to determine party positions on specific votes.
--
-- Vote types:
--   - Ja: In favor
--   - Nej: Against
--   - Avstående: Abstain
--   - Frånvarande: Absent (not counted in position)

with vote_counts as (
    select
        lower(votering_id) as votering_id,
        parti,
        countif(rost = 'Ja') as ja,
        countif(rost = 'Nej') as nej,
        countif(rost = 'Avstående') as avstar,
        countif(rost = 'Frånvarande') as franvarande,
        count(*) as total_members
    from {{ ref('stg_voteringlista') }}
    where votering_id is not null
      and parti is not null
    group by lower(votering_id), parti
)

select
    votering_id,
    parti,
    ja,
    nej,
    avstar,
    franvarande,
    total_members,
    
    -- Determine party position based on majority vote
    -- A party "supported" if majority voted Ja, "opposed" if majority voted Nej
    case
        when ja > nej and ja > avstar then 'supported'
        when nej > ja and nej > avstar then 'opposed'
        when avstar > ja and avstar > nej then 'abstained'
        when ja = nej and ja > 0 then 'split'
        else 'absent'
    end as party_position,
    
    -- Confidence: how unified was the party?
    -- 1.0 = unanimous, lower = more split
    case
        when (ja + nej + avstar) = 0 then 0.0
        else greatest(ja, nej, avstar)::double / (ja + nej + avstar)
    end as position_confidence

from vote_counts
