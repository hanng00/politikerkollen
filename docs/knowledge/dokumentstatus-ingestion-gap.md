# dokumentstatus Ingestion Gap

**Date:** 2026-03-09  
**Context:** Data quality investigation for vote-source linkage

## Problem

65% of votes in `stg_voteringlista` cannot be linked to source documents (motions/propositions) because their corresponding `dokumentstatus` records were never ingested.

## Evidence

| Riksmöte | Vote Bets | Dok Bets | Missing | % Missing |
|----------|-----------|----------|---------|-----------|
| 2011/12 - 2016/17 | ~200/yr | **0** | ~200/yr | **100%** |
| 2020/21 | 290 | **0** | 290 | **100%** |
| 2022/23 | 189 | 180 | 9 | 4.8% |
| 2024/25 | 203 | 162 | 41 | 20.2% |

Total: 10,922 votes exist, only 3,856 (35%) have linkable `utskottsforslag` metadata.

## Root Cause

The `int_vote_source_links` dbt model joins through:
```
voteringlista → utskottsforslag (via votering_id) → dokumentstatus (via _dlt_root_id) → referens (behandlar)
```

The join fails when `dokumentstatus` is missing for a `bet` document. The `bet` documents exist in `stg_dokument`, but their detailed status (containing `utskottsforslag` and `referens`) was never fetched.

## Impact

- **7,067 votes** cannot link to source documents
- Motions that were voted on appear to have "no votes" in the system
- LLM classification spend is wasted on matches that can never produce accountability cards

## Diagnostic Queries

```sql
-- Votes missing dokumentstatus by riksmöte
WITH vote_bets AS (
    SELECT DISTINCT beteckning, rm FROM main_stg.stg_voteringlista
),
dok_bets AS (
    SELECT DISTINCT dokument__beteckning, dokument__rm 
    FROM main_stg.stg_dokumentstatus 
    WHERE dokument__typ = 'bet'
)
SELECT 
    vb.rm,
    COUNT(DISTINCT vb.beteckning) AS vote_bets,
    COUNT(DISTINCT db.dokument__beteckning) AS dok_bets,
    COUNT(DISTINCT vb.beteckning) - COUNT(DISTINCT db.dokument__beteckning) AS missing
FROM vote_bets vb
LEFT JOIN dok_bets db ON vb.beteckning = db.dokument__beteckning AND vb.rm = db.dokument__rm
GROUP BY vb.rm
ORDER BY vb.rm DESC;
```

```sql
-- List bet dok_ids needing dokumentstatus backfill
SELECT DISTINCT d.dok_id, d.beteckning, d.rm
FROM main_stg.stg_voteringlista v
JOIN main_stg.stg_dokument d 
    ON d.beteckning = v.beteckning AND d.rm = v.rm AND d.typ = 'bet'
LEFT JOIN main_stg.stg_dokumentstatus ds ON ds.dokument__dok_id = d.dok_id
WHERE ds.dokument__dok_id IS NULL
ORDER BY d.rm DESC;
```

## Fix

Backfill `dokumentstatus` in the ingestion pipeline for all `bet` documents that have associated votes. The dbt model will automatically link them once the data exists.

## Related Issues

- **Missing signatories:** 6,490 motions have empty `parti` because signatory data wasn't ingested
- **Pending votes:** 2025/26 motions (HD prefix) have 5.6% vote coverage because votes haven't happened yet (expected behavior)
