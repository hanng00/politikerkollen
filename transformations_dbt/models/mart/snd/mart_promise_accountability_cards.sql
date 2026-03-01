-- Mart: Promise Accountability Cards
-- Joins promises with their matched votes and party voting outcomes.
-- Designed for the viral "accountability card" feature showing how parties
-- voted on issues related to their promises.
--
-- Query patterns:
--   - By party: SELECT * FROM mart_promise_accountability_cards WHERE party_id = 's'
--   - By category: SELECT * FROM mart_promise_accountability_cards WHERE category = 'skatt'
--   - High similarity: SELECT * FROM mart_promise_accountability_cards WHERE similarity_score > 0.8

with promises as (
    select
        promise_id,
        document_id,
        party_id,
        year,
        promise_text,
        source_quote,
        category,
        specificity,
        target_group,
        measurable
    from {{ ref('stg_valmanifest_promises') }}
),

matches as (
    select
        match_id,
        promise_id,
        votering_id,
        similarity_score
    from {{ ref('stg_promise_vote_matches') }}
),

vote_embeddings as (
    select
        votering_id,
        dok_id,
        forslag_text
    from {{ ref('stg_vote_embeddings') }}
),

-- Get vote outcomes per party for each votering_id
party_vote_outcomes as (
    select
        votering_id,
        parti as voting_party,
        rost as vote_value,
        count(*) as vote_count
    from {{ ref('stg_voteringlista') }}
    where rost in ('Ja', 'Nej', 'Avstår')
    group by votering_id, parti, rost
),

-- Determine majority vote per party per votering
party_majority_votes as (
    select
        votering_id,
        voting_party,
        vote_value as party_vote,
        vote_count
    from (
        select
            votering_id,
            voting_party,
            vote_value,
            vote_count,
            row_number() over (
                partition by votering_id, voting_party
                order by vote_count desc
            ) as rn
        from party_vote_outcomes
    )
    where rn = 1
),

-- Get overall vote outcome (passed/rejected)
vote_outcomes as (
    select
        votering_id,
        sum(case when rost = 'Ja' then 1 else 0 end) as ja_count,
        sum(case when rost = 'Nej' then 1 else 0 end) as nej_count,
        sum(case when rost = 'Avstår' then 1 else 0 end) as avstar_count,
        case
            when sum(case when rost = 'Ja' then 1 else 0 end) >
                 sum(case when rost = 'Nej' then 1 else 0 end)
            then 'Bifall'
            else 'Avslag'
        end as vote_outcome
    from {{ ref('stg_voteringlista') }}
    where rost in ('Ja', 'Nej', 'Avstår')
    group by votering_id
)

select
    -- Promise info
    p.promise_id,
    p.document_id,
    p.party_id as promise_party,
    p.year as promise_year,
    p.promise_text,
    p.source_quote,
    p.category,
    p.specificity,
    p.target_group,
    p.measurable,

    -- Match info
    m.match_id,
    m.similarity_score,

    -- Vote info
    m.votering_id,
    ve.dok_id,
    ve.forslag_text as vote_proposal_text,

    -- How the promising party voted
    pmv.party_vote as promise_party_vote,
    pmv.vote_count as promise_party_vote_count,

    -- Overall vote outcome
    vo.ja_count,
    vo.nej_count,
    vo.avstar_count,
    vo.vote_outcome,

    -- Accountability indicator
    case
        when pmv.party_vote = 'Ja' and vo.vote_outcome = 'Bifall' then 'supported_passed'
        when pmv.party_vote = 'Ja' and vo.vote_outcome = 'Avslag' then 'supported_failed'
        when pmv.party_vote = 'Nej' and vo.vote_outcome = 'Bifall' then 'opposed_passed'
        when pmv.party_vote = 'Nej' and vo.vote_outcome = 'Avslag' then 'opposed_failed'
        when pmv.party_vote = 'Avstår' then 'abstained'
        else 'unknown'
    end as accountability_status

from promises p
inner join matches m on m.promise_id = p.promise_id
inner join vote_embeddings ve on ve.votering_id = m.votering_id
left join party_majority_votes pmv
    on pmv.votering_id = m.votering_id
    and pmv.voting_party = p.party_id
left join vote_outcomes vo on vo.votering_id = m.votering_id
