-- Mart: Betänkande källor (source documents)
-- One row per source document (motion/proposition) per betänkande
-- Shows what fed into the betänkande and who wrote it

with betankanden as (
    select node_id, dok_id, titel, rm, organ, sort_datum
    from {{ ref('int_node_dok') }}
    where node_typ = 'betankande'
),

kallor as (
    select
        e.from_id as betankande_node_id,
        e.to_id as kalla_node_id,
        e.edge_typ as referens_typ,
        d.dok_id as kalla_dok_id,
        d.titel as kalla_titel,
        d.node_typ as kalla_typ,
        d.rm as kalla_rm,
        d.sort_datum as kalla_datum
    from {{ ref('int_edge') }} e
    inner join {{ ref('int_node_dok') }} d on d.node_id = e.to_id
    where e.edge_typ in ('behandlar', 'behandlas_i', 'följdmotion', 'relaterat')
      and e.from_id like 'dok:%'
),

forfattare as (
    select
        e.to_id as kalla_node_id,
        p.intressent_id,
        p.sorteringsnamn,
        p.parti,
        e.edge_typ as roll
    from {{ ref('int_edge') }} e
    inner join {{ ref('int_node_person') }} p on p.node_id = e.from_id
    where e.edge_typ = 'undertecknare'
)

select
    b.dok_id as betankande_dok_id,
    b.titel as betankande_titel,
    b.rm as betankande_rm,
    b.organ as betankande_organ,
    k.referens_typ,
    k.kalla_dok_id,
    k.kalla_titel,
    k.kalla_typ,
    k.kalla_rm,
    k.kalla_datum,
    f.intressent_id as forfattare_id,
    f.sorteringsnamn as forfattare_namn,
    f.parti as forfattare_parti
from kallor k
inner join betankanden b on b.node_id = k.betankande_node_id
left join forfattare f on f.kalla_node_id = k.kalla_node_id
