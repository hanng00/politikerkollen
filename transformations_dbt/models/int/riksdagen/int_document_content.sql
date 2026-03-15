-- Int: Document Content for Cognition
-- Pre-filtered, deduplicated table of motions and propositions with HTML content.
-- Optimized for cognition's source embedding pipeline.
--
-- Why this exists:
--   - stg_dokumentstatus is a VIEW to avoid materializing ~10GB of HTML
--   - Cognition needs HTML content but OOMs when deduplicating the full view
--   - This table pre-filters to mot/prop only (~5% of documents) and materializes
--     the result, so cognition reads a clean, smaller table
--
-- Memory optimization:
--   - Window function operates on minimal columns (dok_id, _dlt_load_id)
--   - Filter to mot/prop BEFORE deduplication reduces working set
--   - QUALIFY deduplicates in a single pass (no join back needed)
--
-- Note: Raw source is denormalized (one row per reference), so we deduplicate
-- by dok_id to get exactly one row per document.

{{
    config(
        materialized='table'
    )
}}

select
    ds.dokument__dok_id as dok_id,
    ds.dokument__typ as dok_typ,
    ds.dokument__rm as rm,
    TRY_CAST(split_part(replace(NULLIF(ds.dokument__rm, ''), '-', '/'), '/', 1) AS INTEGER) as riksmote_year,
    ds.dokument__datum as datum,
    ds.dokument__titel as titel,
    ds.dokument__html as html,
    ds.dokument__dokument_url_html as dokument_url,
    dl.summary as source_summary,
    ds._dlt_id
from {{ source('raw_riksdagen', 'dokumentstatus') }} ds
left join {{ ref('stg_dokumentlista') }} dl on dl.dok_id = ds.dokument__dok_id
where ds.dokument__dok_id is not null
  and ds.dokument__typ in ('mot', 'prop')
  and ds.dokument__html is not null
qualify row_number() over (partition by ds.dokument__dok_id order by ds._dlt_load_id desc) = 1
