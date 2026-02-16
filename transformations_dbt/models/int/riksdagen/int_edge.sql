-- Graph edges: union of all relation types
-- Supports: betänkande ↔ votes, who voted, motioner/propositioner → betänkande, who wrote, talade
-- See docs/RELATIONS.md

with

-- person → dok | roll (from dokumentstatus - who wrote/proposed)
edge_person_dok_status as (
    select
        'person:' || i.intressent_id as from_id,
        'dok:' || ds.dokument__dok_id as to_id,
        coalesce(i.roll, 'okand') as edge_typ,
        coalesce(
            try_cast(ds.dokument__datum as date),
            try_cast(ds.dokument__publicerad as date),
            try_cast(ds.dokument__systemdatum as date)
        ) as datum,
        'dokumentstatus_intressent' as source,
        null as payload
    from {{ ref('stg_dokumentstatus_intressent') }} i
    inner join {{ ref('stg_dokumentstatus') }} ds on ds._dlt_id = i._dlt_root_id
    where i.intressent_id is not null
      and ds.dokument__dok_id is not null
),

-- person → dok | roll (from dokumentlista JSON - who wrote)
edge_person_dok_lista as (
    select
        'person:' || json_extract_string(d.dokintressent__intressent::json, '$[' || idx || '].intressent_id') as from_id,
        'dok:' || d.dok_id as to_id,
        coalesce(nullif(json_extract_string(d.dokintressent__intressent::json, '$[' || idx || '].roll'), ''), 'okand') as edge_typ,
        coalesce(
            try_cast(d.beslutsdag as date),
            try_cast(d.inlamnad as date),
            try_cast(d.publicerad as date),
            try_cast(d.datum as date),
            try_cast(d.systemdatum as date)
        ) as datum,
        'dokumentlista' as source,
        null as payload
    from {{ ref('stg_dokumentlista') }} d
    cross join (select unnest(range(0, 50)) as idx) t
    where d.dokintressent__intressent is not null
      and json_type(d.dokintressent__intressent::json) = 'ARRAY'
      and idx < json_array_length(d.dokintressent__intressent::json)
      and json_extract_string(d.dokintressent__intressent::json, '$[' || idx || '].intressent_id') is not null
),

-- person → event | talade (who spoke)
edge_person_event_anforande as (
    select
        'person:' || a.intressent_id as from_id,
        'event:anf_' || a.systemnyckel as to_id,
        'talade' as edge_typ,
        cast(a.systemdatum as date) as datum,
        'anforande' as source,
        null as payload
    from {{ ref('stg_anforande') }} a
    where a.intressent_id is not null
      and a.systemnyckel is not null
),

-- event → dok | handlar_om (speech was about protocol document)
edge_event_dok_anforande as (
    select
        'event:anf_' || a.systemnyckel as from_id,
        'dok:' || coalesce(a.dok_id_normalized, a.dok_id) as to_id,
        'handlar_om' as edge_typ,
        cast(a.systemdatum as date) as datum,
        'anforande' as source,
        null as payload
    from {{ ref('stg_anforande') }} a
    where a.systemnyckel is not null
      and coalesce(a.dok_id_normalized, a.dok_id) is not null
),

-- event → dok | debatterar (speech debates a related document, e.g., interpellation, motion)
edge_event_dok_anforande_rel as (
    select
        'event:anf_' || a.systemnyckel as from_id,
        'dok:' || a.rel_dok_id_normalized as to_id,
        'debatterar' as edge_typ,
        cast(a.systemdatum as date) as datum,
        'anforande' as source,
        null as payload
    from {{ ref('stg_anforande') }} a
    where a.systemnyckel is not null
      and a.rel_dok_id_normalized is not null
),

-- person → event | röstade (who voted) - payload = rost (Ja/Nej/Avstår)
edge_person_event as (
    select
        'person:' || v.intressent_id as from_id,
        'event:vot_' || v.votering_id as to_id,
        'rostade' as edge_typ,
        cast(v.systemdatum as date) as datum,
        'voteringlista' as source,
        v.rost as payload
    from {{ ref('stg_voteringlista') }} v
    where v.intressent_id is not null
      and v.votering_id is not null
),

-- event → dok | handlar_om (votering was about betänkande)
edge_event_dok as (
    select
        'event:vot_' || v.votering_id as from_id,
        'dok:' || v.dok_id as to_id,
        'handlar_om' as edge_typ,
        cast(v.systemdatum as date) as datum,
        'voteringlista' as source,
        null as payload
    from {{ ref('stg_voteringlista') }} v
    where v.votering_id is not null
      and v.dok_id is not null
),

-- dok → dok | refererar (betänkande references motioner/propositioner)
edge_dok_referens as (
    select
        'dok:' || ds.dokument__dok_id as from_id,
        'dok:' || r.ref_dok_id as to_id,
        coalesce(r.referenstyp, 'refererar') as edge_typ,
        coalesce(
            try_cast(ds.dokument__datum as date),
            try_cast(ds.dokument__publicerad as date),
            try_cast(ds.dokument__systemdatum as date)
        ) as datum,
        'dokumentstatus_referens' as source,
        null as payload
    from {{ ref('stg_dokumentstatus_referens') }} r
    inner join {{ ref('stg_dokumentstatus') }} ds on ds._dlt_id = r._dlt_root_id
    where r.ref_dok_id is not null
      and ds.dokument__dok_id is not null
),

-- dok → dok | relaterat (from dokumentlista)
edge_dok_relaterat as (
    select
        'dok:' || d.dok_id as from_id,
        'dok:' || d.relaterat_id as to_id,
        'relaterat' as edge_typ,
        coalesce(
            try_cast(d.beslutsdag as date),
            try_cast(d.inlamnad as date),
            try_cast(d.publicerad as date),
            try_cast(d.datum as date),
            try_cast(d.systemdatum as date)
        ) as datum,
        'dokumentlista' as source,
        null as payload
    from {{ ref('stg_dokumentlista') }} d
    where d.relaterat_id is not null
      and d.relaterat_id != ''
)

select from_id, to_id, edge_typ, datum, source, payload from edge_person_dok_status
union all
select from_id, to_id, edge_typ, datum, source, payload from edge_person_dok_lista
union all
select from_id, to_id, edge_typ, datum, source, payload from edge_person_event_anforande
union all
select from_id, to_id, edge_typ, datum, source, payload from edge_event_dok_anforande
union all
select from_id, to_id, edge_typ, datum, source, payload from edge_event_dok_anforande_rel
union all
select from_id, to_id, edge_typ, datum, source, payload from edge_person_event
union all
select from_id, to_id, edge_typ, datum, source, payload from edge_event_dok
union all
select from_id, to_id, edge_typ, datum, source, payload from edge_dok_referens
union all
select from_id, to_id, edge_typ, datum, source, payload from edge_dok_relaterat
