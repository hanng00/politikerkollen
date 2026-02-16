-- Mart: Betänkande röster (detailed votes)
-- One row per person per votering per betänkande
-- For detailed vote analysis
-- Uses only int layer models

with betankanden as (
    select node_id, dok_id, titel, rm, organ, sort_datum
    from {{ ref('int_node_dok') }}
    where node_typ = 'betankande'
),

-- Get voting edges: votering → betänkande (handlar_om) and person → votering (rostade)
-- Using starts_with() for better performance than LIKE
vote_edges as (
    select from_id, to_id, edge_typ, datum, payload
    from {{ ref('int_edge') }}
    where edge_typ in ('handlar_om', 'rostade')
),

voteringar as (
    select
        to_id as betankande_node_id,
        from_id as votering_node_id,
        datum as votering_datum
    from vote_edges
    where edge_typ = 'handlar_om'
      and starts_with(from_id, 'event:vot_')
),

roster as (
    select
        v.betankande_node_id,
        v.votering_node_id,
        v.votering_datum,
        e.from_id as person_node_id,
        e.payload as rost
    from voteringar v
    inner join vote_edges e on e.to_id = v.votering_node_id and e.edge_typ = 'rostade'
)

select
    b.dok_id as betankande_dok_id,
    b.titel as betankande_titel,
    b.rm as betankande_rm,
    b.organ as betankande_organ,
    b.sort_datum as betankande_datum,
    r.votering_datum,
    replace(r.votering_node_id, 'event:vot_', '') as votering_id,
    p.intressent_id,
    p.sorteringsnamn,
    p.parti,
    p.valkrets,
    r.rost
from roster r
inner join betankanden b on b.node_id = r.betankande_node_id
inner join {{ ref('int_node_person') }} p on p.node_id = r.person_node_id
