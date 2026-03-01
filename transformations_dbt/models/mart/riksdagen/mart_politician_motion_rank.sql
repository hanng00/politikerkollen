-- Mart: Politician Motion Effectiveness Ranking
-- One row per politician with Bayesian-adjusted motion pass rate.
--
-- Problem: Raw pass rate (passed/total) is misleading for politicians with few motions.
-- A politician with 1/1 (100%) appears more effective than one with 50/100 (50%),
-- even though the latter has far more evidence of actual effectiveness.
--
-- Solution: Beta-Binomial Bayesian shrinkage
--
-- Model each politician as a binomial process:
--   - Successes (s): motions that passed (bifall)
--   - Trials (n): total resolved motions
--   - Unknown true success rate: θ
--
-- Prior: θ ~ Beta(α, β)
-- Posterior: θ | data ~ Beta(α + s, β + n − s)
--
-- Posterior mean (our ranking score):
--   E[θ] = (s + α) / (n + α + β)
--
-- Prior parameters derived from global average:
--   μ = overall approval rate across all politicians
--   k = prior strength (pseudo-motions, controls shrinkage intensity)
--   α = μ × k
--   β = (1 − μ) × k
--
-- Effect:
--   - Politicians with few motions shrink heavily toward the global mean
--   - Politicians with many motions remain mostly unchanged
--   - Mathematically principled and tunable
--
-- We also compute a 95% credible interval lower bound for conservative ranking.

with motion_outcomes as (
    select
        t.intressent_id,
        t.authored_dok_id as mot_dok_id,
        m.outcome_label,
        m.is_provisional
    from {{ ref('mart_person_timeline') }} t
    left join {{ ref('mart_motion_impact_score') }} m on m.mot_dok_id = t.authored_dok_id
    where t.action_type = 'authored'
      and t.authored_dok_typ in ('mot', 'Motion')
      and t.authored_dok_id is not null
),

-- Aggregate per politician
politician_stats as (
    select
        intressent_id,
        count(distinct mot_dok_id) as total_motions,
        count(distinct mot_dok_id) filter (where outcome_label = 'bifall') as passed_motions,
        count(distinct mot_dok_id) filter (where outcome_label = 'avslag') as rejected_motions,
        count(distinct mot_dok_id) filter (where outcome_label is null or is_provisional = true) as pending_motions
    from motion_outcomes
    group by intressent_id
),

-- Calculate global statistics for prior
global_stats as (
    select
        sum(passed_motions)::float / nullif(sum(passed_motions + rejected_motions), 0) as global_pass_rate,
        sum(passed_motions + rejected_motions) as total_resolved_motions,
        count(*) as total_politicians_with_motions
    from politician_stats
    where (passed_motions + rejected_motions) > 0
),

-- Apply Bayesian shrinkage
-- k = 20 pseudo-motions (tunable: higher = more shrinkage toward mean)
bayesian_ranked as (
    select
        ps.intressent_id,
        ps.total_motions,
        ps.passed_motions,
        ps.rejected_motions,
        ps.pending_motions,
        
        -- Resolved motions (denominator for raw rate)
        (ps.passed_motions + ps.rejected_motions) as resolved_motions,
        
        -- Raw pass rate (for display)
        case 
            when (ps.passed_motions + ps.rejected_motions) > 0 
            then ps.passed_motions::float / (ps.passed_motions + ps.rejected_motions)
            else null
        end as raw_pass_rate,
        
        -- Global stats for reference
        gs.global_pass_rate,
        
        -- Prior parameters (k = 20 pseudo-motions)
        gs.global_pass_rate * 20 as alpha,
        (1 - gs.global_pass_rate) * 20 as beta,
        
        -- Bayesian posterior mean: E[θ] = (s + α) / (n + α + β)
        case 
            when (ps.passed_motions + ps.rejected_motions) > 0 
            then (ps.passed_motions + gs.global_pass_rate * 20) / 
                 (ps.passed_motions + ps.rejected_motions + 20)
            else null
        end as bayesian_pass_rate,
        
        -- 95% credible interval lower bound (Wilson-like approximation)
        -- For Beta(a,b), approximate lower 2.5% quantile
        -- Using normal approximation: mean - 1.96 * sqrt(var)
        -- Var[Beta(a,b)] = ab / ((a+b)^2 * (a+b+1))
        case 
            when (ps.passed_motions + ps.rejected_motions) > 0 
            then greatest(0,
                (ps.passed_motions + gs.global_pass_rate * 20) / 
                (ps.passed_motions + ps.rejected_motions + 20)
                - 1.96 * sqrt(
                    (ps.passed_motions + gs.global_pass_rate * 20) * 
                    (ps.rejected_motions + (1 - gs.global_pass_rate) * 20) /
                    (power(ps.passed_motions + ps.rejected_motions + 20, 2) * 
                     (ps.passed_motions + ps.rejected_motions + 21))
                )
            )
            else null
        end as credible_lower_bound,
        
        -- Shrinkage factor: how much the estimate moved toward the prior
        -- 0 = no shrinkage (infinite data), 1 = full shrinkage (no data)
        case 
            when (ps.passed_motions + ps.rejected_motions) > 0 
            then 20.0 / (ps.passed_motions + ps.rejected_motions + 20)
            else 1.0
        end as shrinkage_factor
        
    from politician_stats ps
    cross join global_stats gs
)

select
    intressent_id,
    total_motions,
    passed_motions,
    rejected_motions,
    pending_motions,
    resolved_motions,
    
    -- Rates (as percentages for display)
    round(raw_pass_rate * 100, 1) as raw_pass_rate_pct,
    round(bayesian_pass_rate * 100, 1) as bayesian_pass_rate_pct,
    round(credible_lower_bound * 100, 1) as credible_lower_bound_pct,
    round(global_pass_rate * 100, 1) as global_pass_rate_pct,
    
    -- Raw values for computation
    raw_pass_rate,
    bayesian_pass_rate,
    credible_lower_bound,
    global_pass_rate,
    
    -- Shrinkage metadata
    round(shrinkage_factor * 100, 0) as shrinkage_pct,
    alpha,
    beta,
    
    -- Ranking score (use Bayesian posterior mean)
    bayesian_pass_rate as ranking_score,
    
    -- Confidence tier based on sample size
    case
        when resolved_motions >= 50 then 'high'
        when resolved_motions >= 20 then 'medium'
        when resolved_motions >= 5 then 'low'
        else 'very_low'
    end as confidence_tier

from bayesian_ranked
where total_motions > 0
