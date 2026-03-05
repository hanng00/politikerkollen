-- Mart: Promise Accountability Cards
-- Groups promises with their matched source documents and voting outcomes.
-- Designed for the viral "accountability card" feature showing how parties
-- voted on issues related to their promises.
--
-- Output: One row per promise, with an array of related motions and their votes.
-- This enables the UI to show one card per promise with multiple motions listed.
--
-- Join path:
--   promise → stg_promise_vote_matches → source_dok_id
--   source_dok_id → int_vote_source_links → votering_id (best matching punkt only)
--   votering_id → stg_voteringlista → party votes

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
        lower(votering_id) as votering_id,
        lower(parti) as voting_party,
        rost as vote_value,
        count(*) as vote_count
    from {{ ref('stg_voteringlista') }}
    where rost in ('Ja', 'Nej', 'Avstår')
    group by lower(votering_id), lower(parti), rost
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
        lower(votering_id) as votering_id,
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
    group by lower(votering_id)
),

-- Join everything and rank to pick best punkt per promise-source match
ranked_matches as (
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
        end as accountability_status,

        -- Rank to pick best punkt per match: prefer rows with vote data
        row_number() over (
            partition by m.match_id
            order by
                case when vl.votering_id is not null and vl.votering_id != '' then 0 else 1 end,
                case when pmv.party_vote is not null then 0 else 1 end,
                case when pmv.party_vote = 'Nej' then 0 else 1 end,
                coalesce(try_cast(vl.punkt as integer), 999)
        ) as punkt_rank

    from promises p
    inner join matches m on m.promise_id = p.promise_id
    inner join source_docs sd on sd.dok_id = m.source_dok_id
    inner join vote_links vl on vl.source_dok_id = m.source_dok_id
    left join party_majority_votes pmv
        on pmv.votering_id = vl.votering_id
        and pmv.voting_party = p.party_id
    left join vote_totals vt on vt.votering_id = vl.votering_id
),

-- Deduplicate to one row per promise-source match (best punkt only)
deduped_matches as (
    select *
    from ranked_matches
    where punkt_rank = 1
),

-- Aggregate motions into array per promise
promise_motions as (
    select
        promise_id,
        list({
            'match_id': match_id,
            'similarity_score': similarity_score,
            'source_dok_id': source_dok_id,
            'source_dok_typ': source_dok_typ,
            'source_titel': source_titel,
            'source_parti': source_parti,
            'source_url': source_url,
            'votering_id': votering_id,
            'bet_dok_id': bet_dok_id,
            'punkt': punkt,
            'punkt_rubrik': punkt_rubrik,
            'promise_party_vote': promise_party_vote,
            'ja_count': ja_count,
            'nej_count': nej_count,
            'riksdag_outcome': riksdag_outcome,
            'accountability_status': accountability_status
        } order by similarity_score desc) as motions
    from deduped_matches
    group by promise_id
)

select
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
    
    -- Aggregated motions array
    pm.motions,
    
    -- Summary stats for filtering/sorting
    len(pm.motions) as motion_count,
    
    -- Best match info (for sorting in feed)
    pm.motions[1].similarity_score as best_similarity_score,
    pm.motions[1].accountability_status as best_accountability_status,
    
    -- Has any contradiction?
    list_contains(
        list_transform(pm.motions, x -> x.accountability_status),
        'opposed_passed'
    ) or list_contains(
        list_transform(pm.motions, x -> x.accountability_status),
        'opposed_failed'
    ) as has_contradiction

from promises p
inner join promise_motions pm on pm.promise_id = p.promise_id
