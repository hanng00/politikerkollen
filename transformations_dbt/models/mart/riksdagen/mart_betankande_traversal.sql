-- Mart: Betänkande traversal
-- For each betänkande: votes, voters, source documents (motioner/propositioner), authors
-- Uses only int layer models
--
-- NOTE: Pre-aggregate before joining to avoid Cartesian product explosion.
-- Joining N roster × M kallor × P forfattare per betänkande would explode memory.

with betankanden as (
    select
        node_id,
        dok_id,
        titel,
        rm,
        organ,
        sort_datum
    from {{ ref('int_node_dok') }}
    where node_typ = 'betankande'
),

-- Voteringar on betänkanden (event → dok | handlar_om)
voteringar as (
    select
        e.to_id as betankande_node_id,
        e.from_id as votering_node_id,
        e.datum as votering_datum
    from {{ ref('int_edge') }} e
    where e.edge_typ = 'handlar_om'
      and starts_with(e.from_id, 'event:vot_')
),

-- Who voted (person → event | rostade)
roster as (
    select
        v.betankande_node_id,
        v.votering_node_id,
        e.from_id as person_node_id
    from voteringar v
    inner join {{ ref('int_edge') }} e on e.to_id = v.votering_node_id and e.edge_typ = 'rostade'
),

-- Pre-aggregate roster stats per betänkande
roster_agg as (
    select
        betankande_node_id,
        count(distinct votering_node_id) as antal_voteringar,
        count(distinct person_node_id) as antal_rostande
    from roster
    group by betankande_node_id
),

-- Source documents that fed into betänkande (dok → dok | refererar/behandlar)
kallor as (
    select
        e.from_id as betankande_node_id,
        d.dok_id as kalla_dok_id,
        d.node_typ as kalla_typ
    from {{ ref('int_edge') }} e
    inner join {{ ref('int_node_dok') }} d on d.node_id = e.to_id
    where e.edge_typ in ('behandlar', 'behandlas_i', 'följdmotion', 'relaterat')
      and starts_with(e.from_id, 'dok:')
),

-- Pre-aggregate source document stats per betänkande
kallor_agg as (
    select
        betankande_node_id,
        count(distinct kalla_dok_id) as antal_kallor,
        count(distinct case when kalla_typ = 'motion' then kalla_dok_id end) as antal_motioner,
        count(distinct case when kalla_typ = 'proposition' then kalla_dok_id end) as antal_propositioner
    from kallor
    group by betankande_node_id
),

-- Who wrote the source documents (person → dok | undertecknare)
forfattare as (
    select
        k.betankande_node_id,
        e.from_id as person_node_id
    from kallor k
    inner join {{ ref('int_edge') }} e on e.to_id = ('dok:' || k.kalla_dok_id) and e.edge_typ = 'undertecknare'
),

-- Pre-aggregate author stats per betänkande
forfattare_agg as (
    select
        betankande_node_id,
        count(distinct person_node_id) as antal_forfattare
    from forfattare
    group by betankande_node_id
)

-- Final output: one row per betänkande with aggregated stats
-- Each join is now 1:1, no Cartesian product
select
    b.dok_id as betankande_dok_id,
    b.titel as betankande_titel,
    b.rm as betankande_rm,
    b.organ as betankande_organ,
    b.sort_datum as betankande_datum,
    
    -- Voting stats
    coalesce(r.antal_voteringar, 0) as antal_voteringar,
    coalesce(r.antal_rostande, 0) as antal_rostande,
    
    -- Source document stats
    coalesce(k.antal_kallor, 0) as antal_kallor,
    coalesce(k.antal_motioner, 0) as antal_motioner,
    coalesce(k.antal_propositioner, 0) as antal_propositioner,
    
    -- Author stats (on source documents)
    coalesce(f.antal_forfattare, 0) as antal_forfattare

from betankanden b
left join roster_agg r on r.betankande_node_id = b.node_id
left join kallor_agg k on k.betankande_node_id = b.node_id
left join forfattare_agg f on f.betankande_node_id = b.node_id
