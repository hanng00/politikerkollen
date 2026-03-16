-- Mart: Promise Score
-- One row per promise with aggregated evidence and composite score.
--
-- This is the top-level view for promise accountability assessment.
-- Aggregates all evidence from mart_promise_evidence into:
--   - Intention: What the party tried to do (supported/opposed)
--   - Implementation: What actually happened (adopted/rejected)
--   - Assessment: Combined verdict
--
-- Assessment categories:
--   - "Genomfört": Proposition passed or motion adopted
--   - "Delvis genomfört": Some motions adopted
--   - "Drev frågan": Supported many proposals, none adopted
--   - "Motsägelsefullt": Both supported and opposed similar proposals
--   - "Röstade emot": Opposed majority of proposals
--   - "Oklart": Insufficient evidence

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
        source_summary,
        source_url,
        source_datum,
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
        
        -- Evidence counts by type (all alignments)
        count(*) as total_evidence_count,
        countif(signal_type like 'proposition%') as proposition_count,
        countif(signal_type like 'motion_bifall%') as motion_bifall_count,
        countif(signal_type = 'motion_supported') as motion_supported_count,
        countif(signal_type = 'motion_opposed') as motion_opposed_count,
        countif(party_filed_motion) as party_filed_count,
        
        -- Evidence counts filtered to non-tangential (for scoring logic)
        -- These exclude tangential matches which pollute the signal
        countif(signal_type like 'proposition%' and alignment != 'tangential') as proposition_relevant_count,
        countif(signal_type like 'motion_bifall%' and alignment != 'tangential') as motion_bifall_relevant_count,
        countif(signal_type = 'motion_supported' and alignment != 'tangential') as motion_supported_relevant_count,
        countif(signal_type = 'motion_opposed' and alignment != 'tangential') as motion_opposed_relevant_count,
        
        -- Implementation counts (what actually happened in riksdagen)
        countif(motion_outcome = 'bifall') as adopted_count,
        countif(motion_outcome = 'avslag') as rejected_count,
        
        -- Alignment distribution
        countif(alignment = 'supports') as supports_count,
        countif(alignment = 'opposes') as opposes_count,
        countif(alignment = 'tangential') as tangential_count,
        
        -- Best evidence item (highest absolute weight)
        arg_max(match_id, abs(signal_weight)) as best_evidence_match_id,
        max(abs(signal_weight)) as best_evidence_weight,
        
        -- Aggregate evidence into array for display (all items, sorted by weight)
        list({
            'match_id': match_id,
            'source_dok_id': source_dok_id,
            'source_dok_typ': source_dok_typ,
            'source_titel': source_titel,
            'source_summary': source_summary,
            'source_url': source_url,
            'source_datum': source_datum,
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
        } order by abs(signal_weight) desc) as evidence_items
        
    from evidence
    group by promise_id
),

-- Calculate derived metrics
promise_with_metrics as (
    select
        *,
        -- Total relevant proposals (supported + opposed) - using RELEVANT counts (non-tangential)
        (motion_supported_relevant_count + motion_bifall_relevant_count + motion_opposed_relevant_count) as total_relevant,
        -- Support ratio - using RELEVANT counts (non-tangential)
        case 
            when (motion_supported_relevant_count + motion_bifall_relevant_count + motion_opposed_relevant_count) = 0 then 0.0
            else (motion_supported_relevant_count + motion_bifall_relevant_count)::float / 
                 (motion_supported_relevant_count + motion_bifall_relevant_count + motion_opposed_relevant_count)
        end as support_ratio,
        -- Has contradiction: both supported and opposed significant amounts
        -- CRITICAL: Only count non-tangential evidence to avoid false positives
        -- A party opposing a tangential motion (e.g., about farm regulations) shouldn't
        -- count as contradicting their antibiotic promise
        (motion_supported_relevant_count + motion_bifall_relevant_count > 0 
         and motion_opposed_relevant_count > 0 
         and motion_opposed_relevant_count >= (motion_supported_relevant_count + motion_bifall_relevant_count) * 0.25
        ) as has_contradiction
    from promise_aggregates
)

select
    promise_id,
    promise_party,
    promise_year,
    promise_text,
    category,
    composite_score,
    
    -- Evidence strength based on count and weight
    -- Use relevant counts (non-tangential) for determining strength
    case
        when proposition_relevant_count > 0 or motion_bifall_relevant_count > 0 then 'strong'
        when total_evidence_count >= 3 and abs(composite_score) >= 0.15 then 'moderate'
        when total_evidence_count >= 1 then 'weak'
        else 'none'
    end as evidence_strength,
    
    -- Assessment category (new model: intention + implementation)
    -- Uses relevant counts (non-tangential) for all logic
    case
        -- Contradiction takes priority
        when has_contradiction then 'contradictory'
        -- Implementation: proposition passed (non-tangential)
        when proposition_relevant_count > 0 then 'implemented'
        -- No relevant evidence
        when total_relevant = 0 then 'unclear'
        -- Opposed majority
        when support_ratio <= 0.3 then 'opposed'
        -- Championed with partial success
        when support_ratio >= 0.7 and motion_bifall_relevant_count > 0 then 'partial'
        -- Championed but not implemented
        when support_ratio >= 0.7 then 'championed'
        -- Some support
        else 'supported'
    end as evidence_direction,
    
    -- Human-readable assessment label (Swedish)
    case
        when has_contradiction then 'Motsägelsefullt'
        when proposition_relevant_count > 0 then 'Genomfört'
        when total_relevant = 0 then 'Oklart'
        when support_ratio <= 0.3 then 'Röstade emot'
        when support_ratio >= 0.7 and motion_bifall_relevant_count > 0 then 'Delvis genomfört'
        when support_ratio >= 0.7 then 'Drev frågan'
        else 'Visst stöd'
    end as assessment_label,
    
    -- Counts
    total_evidence_count,
    proposition_count,
    motion_bifall_count,
    motion_supported_count,
    motion_opposed_count,
    party_filed_count,
    adopted_count,
    rejected_count,
    supports_count,
    opposes_count,
    tangential_count,
    
    -- Top evidence items (limit to 20 for API response size)
    coalesce(evidence_items[:20], []) as top_evidence,
    
    -- Has any strong positive signal? (non-tangential only)
    (proposition_relevant_count > 0 or motion_bifall_relevant_count > 0) as has_strong_positive,
    
    -- Has any contradiction?
    has_contradiction

from promise_with_metrics
