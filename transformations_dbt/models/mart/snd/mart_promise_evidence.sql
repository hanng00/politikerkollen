-- Mart: Promise Evidence
-- One row per (promise, source document) with evidence signals.
--
-- This is the foundation for promise accountability assessment.
-- Each row represents a piece of evidence about whether a party
-- acted on their promise.
--
-- Signal types (ordered by strength):
--   Propositions (government bills):
--   - proposition_supported: Party voted FOR a proposition that aligns with promise
--   - proposition_opposed: Party voted AGAINST a proposition that aligns with promise
--   - proposition_passed: Proposition passed but no vote data for party (weak signal)
--   - proposition_rejected_*: Rare cases where propositions are rejected
--
--   Motions (parliamentary motions):
--   - motion_bifall_supported: Motion approved, party supported it
--   - motion_bifall_opposed: Motion approved, party opposed it
--   - motion_supported: Party supported an aligned motion (even if rejected)
--   - motion_opposed: Party opposed an aligned motion
--   - party_filed: Party filed a motion aligned with their promise (shows intent)
--
-- The effective_stance is derived from int_motion_party_stance and
-- int_proposition_party_stance which correctly handle the Ja/Nej inversion
-- (Ja = agree with committee, not support the document).

with matches as (
    select
        match_id,
        promise_id,
        source_dok_id,
        similarity_score,
        alignment,
        alignment_confidence,
        alignment_rationale
    from {{ ref('stg_promise_vote_matches') }}
    where coalesce(alignment, '') != 'irrelevant'
),

promises as (
    select
        promise_id,
        document_id,
        party_id,
        year,
        promise_text,
        source_quote,
        category
    from {{ ref('stg_valmanifest_promises') }}
),

source_docs as (
    select
        dok_id,
        dok_typ,
        titel,
        parti as source_parti,
        dokument_url
    from {{ ref('int_source_documents') }}
),

-- Get motion decisions with correct punkt-level lineage
motion_decisions as (
    select
        mot_dok_id,
        bet_dok_id,
        punkt,
        punkt_rubrik,
        votering_id,
        motion_outcome,
        committee_recommendation,
        vinnare,
        is_tillkannagivande
    from {{ ref('int_punkt_motion_decisions') }}
),

-- Get party stances with Ja/Nej inversion fix (for motions)
party_stances as (
    select
        mot_dok_id,
        bet_dok_id,
        punkt,
        parti,
        effective_stance,
        stance_outcome,
        ja,
        nej,
        position_confidence
    from {{ ref('int_motion_party_stance') }}
),

-- Get proposition decisions with punkt-level lineage
proposition_decisions as (
    select
        prop_dok_id,
        bet_dok_id,
        punkt,
        punkt_rubrik,
        votering_id,
        proposition_outcome,
        committee_recommendation,
        vinnare,
        is_tillkannagivande
    from {{ ref('int_punkt_proposition_decisions') }}
),

-- Get party stances on propositions
proposition_party_stances as (
    select
        prop_dok_id,
        bet_dok_id,
        punkt,
        parti,
        effective_stance,
        stance_outcome,
        ja,
        nej,
        position_confidence
    from {{ ref('int_proposition_party_stance') }}
),

-- Join matches to source docs
matches_with_sources as (
    select
        m.match_id,
        m.promise_id,
        m.source_dok_id,
        m.similarity_score,
        m.alignment,
        m.alignment_confidence,
        m.alignment_rationale,
        p.party_id as promise_party,
        p.year as promise_year,
        p.promise_text,
        p.category,
        sd.dok_typ as source_dok_typ,
        sd.titel as source_titel,
        sd.source_parti,
        sd.dokument_url as source_url
    from matches m
    inner join promises p on p.promise_id = m.promise_id
    inner join source_docs sd on sd.dok_id = m.source_dok_id
),

-- For motions: join to decisions and party stances
motion_evidence as (
    select
        mws.match_id,
        mws.promise_id,
        mws.source_dok_id,
        mws.similarity_score,
        mws.alignment,
        mws.alignment_confidence,
        mws.alignment_rationale,
        mws.promise_party,
        mws.promise_year,
        mws.promise_text,
        mws.category,
        mws.source_dok_typ,
        mws.source_titel,
        mws.source_parti,
        mws.source_url,
        
        md.bet_dok_id,
        md.punkt,
        md.punkt_rubrik,
        md.votering_id,
        md.motion_outcome,
        md.committee_recommendation,
        md.vinnare,
        md.is_tillkannagivande,
        
        ps.effective_stance,
        ps.stance_outcome,
        ps.ja as party_ja_votes,
        ps.nej as party_nej_votes,
        ps.position_confidence,
        
        -- Derive signal type for motions
        case
            -- Motion was approved (bifall)
            when md.motion_outcome = 'bifall' then
                case ps.effective_stance
                    when 'supported_motion' then 'motion_bifall_supported'
                    when 'opposed_motion' then 'motion_bifall_opposed'
                    else 'motion_bifall'
                end
            -- Motion was rejected but party supported it
            when md.motion_outcome = 'avslag' and ps.effective_stance = 'supported_motion' then 'motion_supported'
            -- Motion was rejected and party opposed it
            when md.motion_outcome = 'avslag' and ps.effective_stance = 'opposed_motion' then 'motion_opposed'
            -- Party abstained or split
            when ps.effective_stance in ('abstained', 'split') then 'motion_abstained'
            else 'motion_unknown'
        end as signal_type,
        
        -- Did the party file this motion themselves?
        case when lower(mws.source_parti) = mws.promise_party then true else false end as party_filed_motion,
        
        -- Row number to pick best punkt per match (prefer ones with votes)
        row_number() over (
            partition by mws.match_id
            order by
                case when md.votering_id is not null and md.votering_id != '' then 0 else 1 end,
                case when ps.effective_stance is not null then 0 else 1 end,
                coalesce(try_cast(md.punkt as integer), 999)
        ) as punkt_rank
        
    from matches_with_sources mws
    left join motion_decisions md on md.mot_dok_id = mws.source_dok_id
    left join party_stances ps 
        on ps.mot_dok_id = md.mot_dok_id 
        and ps.bet_dok_id = md.bet_dok_id
        and ps.punkt = md.punkt
        and ps.parti = mws.promise_party
    where mws.source_dok_typ = 'mot'
),

-- For propositions: join to decisions and party stances (like motions)
proposition_evidence as (
    select
        mws.match_id,
        mws.promise_id,
        mws.source_dok_id,
        mws.similarity_score,
        mws.alignment,
        mws.alignment_confidence,
        mws.alignment_rationale,
        mws.promise_party,
        mws.promise_year,
        mws.promise_text,
        mws.category,
        mws.source_dok_typ,
        mws.source_titel,
        mws.source_parti,
        mws.source_url,
        
        pd.bet_dok_id,
        pd.punkt,
        pd.punkt_rubrik,
        pd.votering_id,
        pd.proposition_outcome as motion_outcome,
        pd.committee_recommendation,
        pd.vinnare,
        pd.is_tillkannagivande,
        
        pps.effective_stance,
        pps.stance_outcome,
        pps.ja as party_ja_votes,
        pps.nej as party_nej_votes,
        pps.position_confidence,
        
        -- Derive signal type for propositions based on party stance
        case
            -- Proposition was approved (bifall) - the normal case
            when coalesce(pd.proposition_outcome, 'bifall') = 'bifall' then
                case pps.effective_stance
                    when 'supported_proposition' then 'proposition_supported'
                    when 'opposed_proposition' then 'proposition_opposed'
                    else 'proposition_passed'  -- No vote data, fallback
                end
            -- Proposition was rejected (rare)
            when pd.proposition_outcome = 'avslag' then
                case pps.effective_stance
                    when 'supported_proposition' then 'proposition_rejected_supported'
                    when 'opposed_proposition' then 'proposition_rejected_opposed'
                    else 'proposition_rejected'
                end
            else 'proposition_passed'  -- Default fallback
        end as signal_type,
        
        false as party_filed_motion,
        
        -- Row number to pick best punkt per match (prefer ones with votes)
        row_number() over (
            partition by mws.match_id
            order by
                case when pd.votering_id is not null and pd.votering_id != '' then 0 else 1 end,
                case when pps.effective_stance is not null then 0 else 1 end,
                coalesce(try_cast(pd.punkt as integer), 999)
        ) as punkt_rank
        
    from matches_with_sources mws
    left join proposition_decisions pd on pd.prop_dok_id = mws.source_dok_id
    left join proposition_party_stances pps 
        on pps.prop_dok_id = pd.prop_dok_id 
        and pps.bet_dok_id = pd.bet_dok_id
        and pps.punkt = pd.punkt
        and pps.parti = mws.promise_party
    where mws.source_dok_typ = 'prop'
),

-- Combine motion and proposition evidence
all_evidence as (
    select * from motion_evidence where punkt_rank = 1
    union all
    select * from proposition_evidence where punkt_rank = 1
)

select
    match_id,
    promise_id,
    source_dok_id,
    similarity_score,
    alignment,
    alignment_confidence,
    alignment_rationale,
    promise_party,
    promise_year,
    promise_text,
    category,
    source_dok_typ,
    source_titel,
    source_parti,
    source_url,
    bet_dok_id,
    punkt,
    punkt_rubrik,
    votering_id,
    motion_outcome,
    committee_recommendation,
    vinnare,
    is_tillkannagivande,
    effective_stance,
    stance_outcome,
    party_ja_votes,
    party_nej_votes,
    position_confidence,
    signal_type,
    party_filed_motion,
    
    -- Derive signal weight based on type and alignment
    -- Base weight from signal type + bonus for party filing their own motion
    (case
        -- Proposition passed + party SUPPORTED it = strong positive signal
        -- This is the key fix: only parties who voted FOR the proposition get credit
        when signal_type = 'proposition_supported' and alignment = 'supports' then 0.4
        when signal_type = 'proposition_supported' and alignment = 'opposes' then -0.3
        
        -- Proposition passed but party OPPOSED it = negative signal
        -- Party voted against something that aligns with their promise
        when signal_type = 'proposition_opposed' and alignment = 'supports' then -0.2
        when signal_type = 'proposition_opposed' and alignment = 'opposes' then 0.1
        
        -- Proposition passed but no vote data (fallback - weaker signal)
        -- We can't verify party stance, so give minimal credit
        when signal_type = 'proposition_passed' and alignment = 'supports' then 0.1
        when signal_type = 'proposition_passed' and alignment = 'opposes' then -0.1
        
        -- Proposition rejected (rare) - party supported it
        when signal_type = 'proposition_rejected_supported' and alignment = 'supports' then 0.1
        when signal_type = 'proposition_rejected_supported' and alignment = 'opposes' then -0.1
        
        -- Proposition rejected - party opposed it
        when signal_type = 'proposition_rejected_opposed' and alignment = 'supports' then -0.1
        when signal_type = 'proposition_rejected_opposed' and alignment = 'opposes' then 0.1
        
        -- Motion approved + party supported + supports promise
        when signal_type = 'motion_bifall_supported' and alignment = 'supports' then 0.3
        when signal_type = 'motion_bifall_supported' and alignment = 'opposes' then -0.2
        
        -- Motion approved but party opposed
        when signal_type = 'motion_bifall_opposed' and alignment = 'supports' then -0.1
        when signal_type = 'motion_bifall_opposed' and alignment = 'opposes' then 0.1
        
        -- Party supported aligned motion (even if rejected)
        when signal_type = 'motion_supported' and alignment = 'supports' then 0.1
        when signal_type = 'motion_supported' and alignment = 'opposes' then -0.1
        
        -- Party opposed aligned motion
        when signal_type = 'motion_opposed' and alignment = 'supports' then -0.1
        when signal_type = 'motion_opposed' and alignment = 'opposes' then 0.1
        
        -- Tangential or unknown - no base weight
        else 0.0
    end
    -- Add bonus for party filing their own motion (shows intent even without vote)
    + case
        when party_filed_motion and alignment = 'supports' then 0.15
        when party_filed_motion and alignment = 'opposes' then -0.1
        else 0.0
    end) as signal_weight,
    
    -- Human-readable signal description
    case
        when signal_type = 'proposition_supported' then 'Regeringsförslag antaget, partiet röstade för'
        when signal_type = 'proposition_opposed' then 'Regeringsförslag antaget, partiet röstade emot'
        when signal_type = 'proposition_passed' then 'Regeringsf?rslag antaget'
        when signal_type = 'proposition_rejected_supported' then 'Regeringsförslag avslaget, partiet stödde'
        when signal_type = 'proposition_rejected_opposed' then 'Regeringsförslag avslaget, partiet motsatte sig'
        when signal_type = 'proposition_rejected' then 'Regeringsförslag avslaget'
        when signal_type = 'motion_bifall_supported' then 'Motion bifallen, partiet stödde'
        when signal_type = 'motion_bifall_opposed' then 'Motion bifallen, partiet motsatte sig'
        when signal_type = 'motion_bifall' then 'Motion bifallen'
        when signal_type = 'motion_supported' then 'Partiet stödde motionen'
        when signal_type = 'motion_opposed' then 'Partiet motsatte sig motionen'
        when signal_type = 'motion_abstained' then 'Partiet avstod'
        else 'Okänt'
    end as signal_description

from all_evidence
