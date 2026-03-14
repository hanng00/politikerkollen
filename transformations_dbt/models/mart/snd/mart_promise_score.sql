-- Mart: Promise Score
-- One row per promise with aggregated evidence and composite score.
--
-- This is the top-level view for promise accountability assessment.
-- Aggregates all evidence from mart_promise_evidence into:
--   - A composite score (-1.0 to +1.0)
--   - Evidence strength (strong/moderate/weak/none)
--   - Evidence direction (acted/mixed/inaction/contradiction)
--   - Top evidence items for display
--
-- Scoring method: weighted average of non-zero signals (not sum).
-- This prevents score inflation from many weak signals.
--
-- Score interpretation (balanced thresholds):
--   >= 0.35:  "Starkt stöd" (strong evidence of action)
--   0.15-0.35: "Visst stöd" (some evidence of action)
--   -0.15-0.15: "Oklart" (mixed or insufficient evidence)
--   -0.35--0.15: "Svagt stöd" (some evidence of inaction)
--   <= -0.35: "Motsägelse" (strong evidence of contradiction)

with evidence as (
    select
        promise_id,
        promise_party,
        promise_year,
        promise_text,
        category,
        match_id,
        source_dok_id,
        source_dok_typ,
        source_titel,
        source_url,
        alignment,
        alignment_confidence,
        alignment_rationale,
        signal_type,
        signal_weight,
        signal_description,
        effective_stance,
        party_filed_motion,
        bet_dok_id,
        punkt,
        punkt_rubrik,
        motion_outcome,
        similarity_score
    from {{ ref('mart_promise_evidence') }}
),

-- Aggregate evidence per promise
promise_aggregates as (
    select
        promise_id,
        any_value(promise_party) as promise_party,
        any_value(promise_year) as promise_year,
        any_value(promise_text) as promise_text,
        any_value(category) as category,
        
        -- Composite score: weighted average of non-zero signals, capped at [-1, 1]
        -- Using average prevents score inflation from many weak signals
        case 
            when countif(signal_weight != 0) = 0 then 0.0
            else greatest(-1.0, least(1.0, 
                sum(signal_weight) / greatest(1, countif(signal_weight != 0))
            ))
        end as composite_score,
        
        -- Evidence counts by type
        count(*) as total_evidence_count,
        countif(signal_type like 'proposition%') as proposition_count,
        countif(signal_type like 'motion_bifall%') as motion_bifall_count,
        countif(signal_type = 'motion_supported') as motion_supported_count,
        countif(signal_type = 'motion_opposed') as motion_opposed_count,
        countif(party_filed_motion) as party_filed_count,
        
        -- Alignment distribution
        countif(alignment = 'supports') as supports_count,
        countif(alignment = 'opposes') as opposes_count,
        countif(alignment = 'tangential') as tangential_count,
        
        -- Best evidence item (highest absolute weight)
        arg_max(match_id, abs(signal_weight)) as best_evidence_match_id,
        max(abs(signal_weight)) as best_evidence_weight,
        
        -- Aggregate evidence into array for display (top items by weight, excluding zero-weight noise)
        list({
            'match_id': match_id,
            'source_dok_id': source_dok_id,
            'source_dok_typ': source_dok_typ,
            'source_titel': source_titel,
            'source_url': source_url,
            'alignment': alignment,
            'alignment_rationale': alignment_rationale,
            'signal_type': signal_type,
            'signal_weight': signal_weight,
            'signal_description': signal_description,
            'effective_stance': effective_stance,
            'bet_dok_id': bet_dok_id,
            'punkt': punkt,
            'punkt_rubrik': punkt_rubrik,
            'motion_outcome': motion_outcome,
            'similarity_score': similarity_score
        } order by abs(signal_weight) desc) filter (where signal_weight != 0) as evidence_items
        
    from evidence
    group by promise_id
)

select
    promise_id,
    promise_party,
    promise_year,
    promise_text,
    category,
    composite_score,
    
    -- Evidence strength based on count and weight
    case
        when proposition_count > 0 or motion_bifall_count > 0 then 'strong'
        when total_evidence_count >= 3 and abs(composite_score) >= 0.15 then 'moderate'
        when total_evidence_count >= 1 then 'weak'
        else 'none'
    end as evidence_strength,
    
    -- Evidence direction based on score (balanced thresholds)
    case
        when composite_score >= 0.35 then 'acted'
        when composite_score >= 0.15 then 'some_action'
        when composite_score > -0.15 then 'mixed'
        when composite_score > -0.35 then 'some_inaction'
        else 'contradiction'
    end as evidence_direction,
    
    -- Human-readable assessment label
    case
        when composite_score >= 0.35 then 'Starkt stöd'
        when composite_score >= 0.15 then 'Visst stöd'
        when composite_score > -0.15 then 'Oklart'
        when composite_score > -0.35 then 'Svagt stöd'
        else 'Motsägelse'
    end as assessment_label,
    
    -- Counts
    total_evidence_count,
    proposition_count,
    motion_bifall_count,
    motion_supported_count,
    motion_opposed_count,
    party_filed_count,
    supports_count,
    opposes_count,
    tangential_count,
    
    -- Top evidence items (limit to 10 for API response size)
    coalesce(evidence_items[:10], []) as top_evidence,
    
    -- Has any strong positive signal?
    (proposition_count > 0 or motion_bifall_count > 0) as has_strong_positive,
    
    -- Has any contradiction?
    (motion_opposed_count > 0 and supports_count > 0) as has_contradiction

from promise_aggregates
