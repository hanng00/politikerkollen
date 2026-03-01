-- Staging model for voteringlista (voting records)
-- Source abstraction layer with deduplication
-- (votering_id, intressent_id) is the natural key - one vote per person per voting event
-- Keep most recent record per key using arg_max pattern (memory-efficient for 80M+ rows)

{{
    config(
        materialized='table'
    )
}}

select
    votering_id,
    intressent_id,
    arg_max(namn, _dlt_load_id) as namn,
    arg_max(fornamn, _dlt_load_id) as fornamn,
    arg_max(efternamn, _dlt_load_id) as efternamn,
    arg_max(parti, _dlt_load_id) as parti,
    arg_max(valkrets, _dlt_load_id) as valkrets,
    arg_max(iort, _dlt_load_id) as iort,
    arg_max(kon, _dlt_load_id) as kon,
    arg_max(fodd, _dlt_load_id) as fodd,
    arg_max(rost, _dlt_load_id) as rost,
    arg_max(avser, _dlt_load_id) as avser,
    arg_max(votering, _dlt_load_id) as votering,
    arg_max(dok_id, _dlt_load_id) as dok_id,
    arg_max(beteckning, _dlt_load_id) as beteckning,
    arg_max(punkt, _dlt_load_id) as punkt,
    arg_max(rm, _dlt_load_id) as rm,
    arg_max(systemdatum, _dlt_load_id) as systemdatum,
    max(_dlt_load_id) as _dlt_load_id,
    arg_max(_dlt_id, _dlt_load_id) as _dlt_id
from {{ source('raw_riksdagen', 'voteringlista') }}
where intressent_id is not null
group by votering_id, intressent_id
