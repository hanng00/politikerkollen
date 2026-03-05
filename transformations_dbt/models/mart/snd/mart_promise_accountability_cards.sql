-- Mart: Promise Accountability Cards
-- Joins promises with their matched source documents and voting outcomes.
-- Designed for the viral "accountability card" feature showing how parties
-- voted on issues related to their promises.
--
-- Join path:
--   promise → stg_promise_vote_matches → source_dok_id
--   source_dok_id → int_vote_source_links → votering_id
--   votering_id → stg_voteringlista → party votes
--
-- Note: One promise-source match may have multiple votes (different punkter).
-- This is intentional - shows all relevant voting activity.

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
        source_dok_id,
        similarity_score
    from {{ ref('stg_promise_vote_matches') }}
),

source_docs as (
    select
        dok_id,
        dok_typ,
        titel,
        parti as source_parti,
        dokument_url
    from {{ ref('stg_source_embeddings') }}
),

-- Link sources to votes
vote_links as (
    select
        source_dok_id,
        votering_id,
        bet_dok_id,
        punkt,
        punkt_rubrik,
        vote_outcome
    from {{ ref('int_vote_source_links') }}
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
vote_totals as (
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
        end as riksdag_outcome
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

    -- Source document info
    m.source_dok_id,
    sd.dok_typ as source_dok_typ,
    sd.titel as source_titel,
    sd.source_parti,
    sd.dokument_url as source_url,

    -- Vote link info
    vl.votering_id,
    vl.bet_dok_id,
    vl.punkt,
    vl.punkt_rubrik,
    vl.vote_outcome as source_outcome,

    -- How the promising party voted
    pmv.party_vote as promise_party_vote,
    pmv.vote_count as promise_party_vote_count,

    -- Overall vote outcome
    vt.ja_count,
    vt.nej_count,
    vt.avstar_count,
    vt.riksdag_outcome,

    -- Accountability indicator
    case
        when pmv.party_vote = 'Ja' and vt.riksdag_outcome = 'Bifall' then 'supported_passed'
        when pmv.party_vote = 'Ja' and vt.riksdag_outcome = 'Avslag' then 'supported_failed'
        when pmv.party_vote = 'Nej' and vt.riksdag_outcome = 'Bifall' then 'opposed_passed'
        when pmv.party_vote = 'Nej' and vt.riksdag_outcome = 'Avslag' then 'opposed_failed'
        when pmv.party_vote = 'Avstår' then 'abstained'
        else 'unknown'
    end as accountability_status

from promises p
inner join matches m on m.promise_id = p.promise_id
inner join source_docs sd on sd.dok_id = m.source_dok_id
inner join vote_links vl on vl.source_dok_id = m.source_dok_id
left join party_majority_votes pmv
    on pmv.votering_id = vl.votering_id
    and pmv.voting_party = p.party_id
left join vote_totals vt on vt.votering_id = vl.votering_id
