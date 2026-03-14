-- Int: Proposition Party Stance
-- Derives the EFFECTIVE party stance on each proposition by combining:
--   1. The party's vote (Ja/Nej) from int_vote_party_aggregation
--   2. The committee's recommendation from int_punkt_proposition_decisions
--
-- This fixes the Ja/Nej inversion problem (same as for motions):
--   - Ja = "agree with committee" (NOT "support the proposition")
--   - Nej = "disagree with committee" (NOT "oppose the proposition")
--
-- The effective stance tells us whether the party actually supported or
-- opposed the proposition's policy direction, regardless of procedural vote.
--
-- Output: One row per (proposition, betänkande, punkt, party) with effective stance.

with punkt_decisions as (
    select
        prop_dok_id,
        bet_dok_id,
        punkt,
        punkt_rubrik,
        votering_id,
        committee_recommendation,
        proposition_outcome,
        vinnare,
        is_tillkannagivande
    from {{ ref('int_punkt_proposition_decisions') }}
    where votering_id is not null
      and votering_id != ''
),

party_votes as (
    select
        votering_id,
        parti,
        ja,
        nej,
        avstar,
        party_position,
        position_confidence
    from {{ ref('int_vote_party_aggregation') }}
)

select
    pd.prop_dok_id,
    pd.bet_dok_id,
    pd.punkt,
    pd.punkt_rubrik,
    pd.votering_id,
    pd.committee_recommendation,
    pd.proposition_outcome,
    pd.vinnare,
    pd.is_tillkannagivande,
    
    pv.parti,
    pv.ja,
    pv.nej,
    pv.avstar,
    pv.party_position,
    pv.position_confidence,
    
    -- Derive EFFECTIVE stance on the proposition
    -- This is what we actually care about: did the party support or oppose
    -- the proposition's policy direction?
    case
        -- Committee recommends rejection (avslar)
        when pd.committee_recommendation = 'avslar' then
            case pv.party_position
                when 'supported' then 'opposed_proposition'   -- Ja on avslag = opposed proposition
                when 'opposed' then 'supported_proposition'   -- Nej on avslag = supported proposition
                when 'abstained' then 'abstained'
                when 'split' then 'split'
                else 'unknown'
            end
        -- Committee recommends approval (bifaller)
        when pd.committee_recommendation = 'bifaller' then
            case pv.party_position
                when 'supported' then 'supported_proposition' -- Ja on bifall = supported proposition
                when 'opposed' then 'opposed_proposition'     -- Nej on bifall = opposed proposition
                when 'abstained' then 'abstained'
                when 'split' then 'split'
                else 'unknown'
            end
        -- Unknown committee recommendation - assume bifall for propositions
        -- (propositions almost always get committee support)
        else
            case pv.party_position
                when 'supported' then 'supported_proposition'
                when 'opposed' then 'opposed_proposition'
                when 'abstained' then 'abstained'
                when 'split' then 'split'
                else 'unknown'
            end
    end as effective_stance,
    
    -- Did the party's effective stance align with the proposition's outcome?
    -- This tells us if the party "won" or "lost" on this proposition.
    case
        when pd.proposition_outcome = 'bifall' then
            case
                when pd.committee_recommendation = 'avslar' and pv.party_position = 'opposed' then 'won'
                when pd.committee_recommendation = 'bifaller' and pv.party_position = 'supported' then 'won'
                when pd.committee_recommendation = 'avslar' and pv.party_position = 'supported' then 'lost'
                when pd.committee_recommendation = 'bifaller' and pv.party_position = 'opposed' then 'lost'
                -- Unknown recommendation: assume bifall
                when pd.committee_recommendation = 'unknown' and pv.party_position = 'supported' then 'won'
                when pd.committee_recommendation = 'unknown' and pv.party_position = 'opposed' then 'lost'
                else 'neutral'
            end
        when pd.proposition_outcome = 'avslag' then
            case
                when pd.committee_recommendation = 'avslar' and pv.party_position = 'supported' then 'won'
                when pd.committee_recommendation = 'bifaller' and pv.party_position = 'opposed' then 'won'
                when pd.committee_recommendation = 'avslar' and pv.party_position = 'opposed' then 'lost'
                when pd.committee_recommendation = 'bifaller' and pv.party_position = 'supported' then 'lost'
                else 'neutral'
            end
        else 'unknown'
    end as stance_outcome

from punkt_decisions pd
inner join party_votes pv on pv.votering_id = pd.votering_id
