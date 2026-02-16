-- Graph node: document (dok)
-- Source: stg_dokumentlista
-- node_id = dok:{dok_id}
-- node_typ from serie_kod: betänkande (01), motion (02), proposition (03), etc.
-- See docs/RELATIONS.md

select
    'dok:' || dok_id as node_id,
    dok_id,
    titel,
    rm,
    organ,
    doktyp,
    typ,
    subtyp,
    beteckning,
    dokumentnamn,
    substr(dok_id, 1, 2) as riksmote_kod,
    substr(dok_id, 3, 2) as serie_kod,
    case
        when dok_id like 'sfs-%' then 'lag'
        when substr(dok_id, 3, 2) = '01' then 'betankande'
        when substr(dok_id, 3, 2) = '02' then 'motion'
        when substr(dok_id, 3, 2) = '03' then 'proposition'
        when substr(dok_id, 3, 2) = '04' then 'skrivelse'
        when substr(dok_id, 3, 2) = '05' then 'fragestallning'
        when substr(dok_id, 3, 2) = '06' then 'yttrande'
        when substr(dok_id, 3, 2) = '07' then 'utlatande'
        when substr(dok_id, 3, 2) = '08' then 'utredning'
        when substr(dok_id, 3, 2) = '09' then 'protokoll'
        when substr(dok_id, 3, 2) in ('C1', 'C2', 'C3', 'C4') then 'kammaraktivitet'
        else 'ovrigt'
    end as node_typ,
    coalesce(
        try_cast(beslutsdag as date),
        try_cast(inlamnad as date),
        try_cast(publicerad as date),
        try_cast(datum as date),
        try_cast(systemdatum as date)
    ) as sort_datum,
    relaterat_id
from {{ ref('stg_dokumentlista') }}
where dok_id is not null
