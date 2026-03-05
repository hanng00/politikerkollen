# Contradiction Detection: Source-Traceable Promise Matching

**Date:** 2026-03-02  
**Status:** Assessment / Architecture Draft  
**Handoff:** Ready for implementation by new agent

---

## The Problem

We want to detect when a party's **votes contradict their manifesto promises**. For this to be credible:

1. **Source traceability** — Every contradiction must link to the original document (motion or proposition)
2. **Semantic matching** — Promises must match against substantive policy content, not procedural text
3. **Party-level attribution** — Votes are party-level decisions, not individual

The previous approach embedded `forslag` text from `stg_dokumentstatus_utskottsforslag`. This failed because `forslag` is procedural ("Riksdagen avslår motion 2024/25:3440..."), not semantic.

---

## What We Actually Have

### Data Sources (all in `main_stg.*`)

| Table | Content | Key Fields |
|-------|---------|------------|
| `stg_dokumentstatus` | Full document metadata + HTML/text | `dokument__dok_id`, `dokument__typ`, `dokument__html`, `dokument__text` |
| `stg_dokumentstatus_referens` | Document relationships | `_dlt_root_id` → parent dok, `ref_dok_id`, `referenstyp` |
| `stg_dokumentstatus_utskottsforslag` | Committee proposals per punkt | `votering_id`, `vinnare`, `forslag`, `rubrik` |
| `stg_voteringlista` | Individual votes | `votering_id`, `intressent_id`, `rost`, `parti` |
| `stg_valmanifest` | Party manifestos (1897–2024) | `parti`, `year`, `text` |

### Existing Models (dbt)

| Model | What It Does |
|-------|--------------|
| `int_motion_outcome` | Resolves mot → bet → utskottsforslag chain. One row per (motion, betänkande). |
| `int_motion_bifall` | Parses `forslag` text to extract explicit motion approvals. |
| `int_motion_vote_margin` | Aggregates Ja/Nej/Avstår per `votering_id`. |
| `mart_motion_impact_score` | Composite score per motion (outcome, margin, signatories, topic). |

**Key insight:** `int_motion_outcome` already solves the reference chain problem for motions. The join strategy:

```
mot → stg_dokumentstatus_referens (referenstyp='behandlar') → bet → stg_dokumentstatus_utskottsforslag
```

---

## Validated Findings (2026-03-02)

Queries run against MotherDuck confirmed:

| Check | Result | Implication |
|-------|--------|-------------|
| `referenstyp='behandlar'` links to mot/prop | ✅ 38,500 mot + 1,572 prop | Reference chain works for both document types |
| `dokument__text` populated | ❌ 0% for mot/prop | Cannot use text field directly |
| `dokument__html` populated | ✅ 100% (28k mot, 2.8k prop) | **Use HTML, strip tags** |
| Vote → source traceability | ✅ Confirmed | Can trace votering → bet → mot/prop |

**Critical insight:** The `dokument__text` field is empty, but `dokument__html` contains full content (avg 26KB for motions, 792KB for propositions). HTML stripping required.

---

## The Architecture

### Principle: Embed Sources, Not Outcomes

**What to embed:** The substantive policy content from source documents (motions, propositions).

**What NOT to embed:** Procedural `forslag` text, vote outcomes, committee recommendations.

### Document Types

| Type | Swedish | Who Creates | Content |
|------|---------|-------------|---------|
| `mot` | Motion | MPs (opposition or backbench) | Policy proposals with full argumentation |
| `prop` | Proposition | Government (Regeringen) | Government bills with full policy text |
| `bet` | Betänkande | Committee (Utskott) | Committee report processing mot/prop |

**Both `mot` and `prop` are source documents.** A betänkande "behandlar" (processes) them.

### Reference Chain (from dokumentstatus JSON)

```
bet (HD01CU2) 
  └── dokreferens.referens[]
        ├── referenstyp: "behandlar", ref_dok_typ: "mot", ref_dok_id: "HC023440"
        ├── referenstyp: "behandlar", ref_dok_typ: "mot", ref_dok_id: "HC023441"
        ├── referenstyp: "behandlar", ref_dok_typ: "prop", ref_dok_id: "HC03169"  ← Government bill!
        └── ...
```

**The `referenstyp='behandlar'` relation links betänkanden to BOTH motions AND propositions.**

---

## Proposed Data Model

### Table 1: `source_embeddings`

Embeddings of substantive policy content from motions and propositions.

```sql
CREATE TABLE source_embeddings (
    dok_id          VARCHAR PRIMARY KEY,  -- e.g., 'HC023440' (motion) or 'HC03169' (prop)
    dok_typ         VARCHAR NOT NULL,     -- 'mot' or 'prop'
    rm              VARCHAR NOT NULL,     -- e.g., '2024/25'
    riksmote_year   INTEGER NOT NULL,     -- e.g., 2024 (partition key)
    titel           VARCHAR NOT NULL,
    content_text    TEXT NOT NULL,        -- Extracted from dokument__html (HTML stripped)
    embedding       FLOAT[1536] NOT NULL, -- text-embedding-3-small
    dokument_url    VARCHAR,              -- Link to source
    parti           VARCHAR,              -- For mot: signatory party. For prop: 'Regeringen'
    intressent_ids  VARCHAR[],            -- Signatories (for mot)
    created_at      TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);
```

**Why this works:**
- Embeds the actual policy content, not procedural text
- Includes both motions (opposition proposals) AND propositions (government bills)
- `parti` enables party-level filtering
- `dokument_url` provides source traceability

### Table 2: `int_vote_party_aggregation` (dbt model, NOT cognition)

This should be a **dbt model**, not a cognition table. It's pure SQL transformation with no LLM involvement.

```sql
-- transformations_dbt/models/int/riksdagen/int_vote_party_aggregation.sql
WITH vote_counts AS (
    SELECT
        votering_id,
        parti,
        SUM(CASE WHEN rost = 'Ja' THEN 1 ELSE 0 END) as ja,
        SUM(CASE WHEN rost = 'Nej' THEN 1 ELSE 0 END) as nej,
        SUM(CASE WHEN rost = 'Avstående' THEN 1 ELSE 0 END) as avstar
    FROM {{ ref('stg_voteringlista') }}
    GROUP BY votering_id, parti
)
SELECT
    votering_id,
    MAP(LIST(parti), LIST({ja: ja, nej: nej, avstar: avstar})) as party_votes
FROM vote_counts
GROUP BY votering_id
```

### Table 3: `int_vote_source_links` (dbt model)

Links each vote to its source documents (motions/propositions).

```sql
-- transformations_dbt/models/int/riksdagen/int_vote_source_links.sql
WITH utskottsforslag AS (
    SELECT
        votering_id,
        _dlt_root_id as bet_dlt_id,
        punkt,
        rubrik,
        vinnare
    FROM {{ ref('stg_dokumentstatus_utskottsforslag') }}
    WHERE votering_id IS NOT NULL
),
bet AS (
    SELECT
        _dlt_id as bet_dlt_id,
        dokument__dok_id as bet_dok_id,
        dokument__rm as rm
    FROM {{ ref('stg_dokumentstatus') }}
    WHERE dokument__typ = 'bet'
),
sources AS (
    SELECT
        r._dlt_root_id as bet_dlt_id,
        r.ref_dok_id as source_dok_id,
        r.ref_dok_typ as source_dok_typ,
        r.ref_dok_titel as source_titel
    FROM {{ ref('stg_dokumentstatus_referens') }} r
    WHERE r.referenstyp = 'behandlar'
      AND r.ref_dok_typ IN ('mot', 'prop')
)
SELECT
    u.votering_id,
    b.bet_dok_id,
    b.rm,
    u.punkt,
    u.rubrik,
    u.vinnare,
    s.source_dok_id,
    s.source_dok_typ,
    s.source_titel
FROM utskottsforslag u
JOIN bet b ON u.bet_dlt_id = b.bet_dlt_id
JOIN sources s ON u.bet_dlt_id = s.bet_dlt_id
```

The cognition module then **reads** these dbt models when detecting contradictions — it doesn't create or maintain the vote aggregation.

### Table 4: `promise_vote_matches` (cognition table)

Matches between manifesto promises and source documents.

```sql
CREATE TABLE promise_vote_matches (
    match_id        VARCHAR PRIMARY KEY,
    promise_id      VARCHAR NOT NULL,     -- FK to valmanifest_promises
    source_dok_id   VARCHAR NOT NULL,     -- FK to source_embeddings
    similarity      FLOAT NOT NULL,
    votering_ids    VARCHAR[],            -- Votes where this source was decided
    party_position  VARCHAR,              -- 'supported', 'opposed', 'abstained'
    contradiction   BOOLEAN,              -- Promise vs actual vote
    created_at      TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);
```

---

## The Matching Pipeline

```
┌─────────────────────────────────────────────────────────────────────────────┐
│  1. EMBED SOURCES                                                           │
│     - Query stg_dokumentstatus WHERE dokument__typ IN ('mot', 'prop')       │
│     - Extract text from dokument__html (strip HTML tags)                    │
│     - Generate embeddings → source_embeddings                               │
└─────────────────────────────────────────────────────────────────────────────┘
                                    ↓
┌─────────────────────────────────────────────────────────────────────────────┐
│  2. BUILD VOTE OUTCOMES                                                     │
│     - Join stg_dokumentstatus_utskottsforslag → stg_dokumentstatus_referens │
│     - Aggregate stg_voteringlista by party                                  │
│     - Link votering_id → source_dok_ids via referenstyp='behandlar'         │
│     - Output → vote_outcomes                                                │
└─────────────────────────────────────────────────────────────────────────────┘
                                    ↓
┌─────────────────────────────────────────────────────────────────────────────┐
│  3. MATCH PROMISES TO SOURCES                                               │
│     - For each promise in valmanifest_promises:                             │
│       - Vector search against source_embeddings (same party, relevant rm)   │
│       - Filter by similarity threshold                                      │
│     - Output → promise_vote_matches (without vote data yet)                 │
└─────────────────────────────────────────────────────────────────────────────┘
                                    ↓
┌─────────────────────────────────────────────────────────────────────────────┐
│  4. DETECT CONTRADICTIONS                                                   │
│     - For each match in promise_vote_matches:                               │
│       - Look up vote_outcomes WHERE source_dok_id IN source_dok_ids         │
│       - Determine party_position from party_votes                           │
│       - Flag contradiction if promise sentiment ≠ vote position             │
│     - Update promise_vote_matches with votering_ids, party_position         │
└─────────────────────────────────────────────────────────────────────────────┘
```

---

## Why This Is Better

| Old Approach | New Approach |
|--------------|--------------|
| Embed `forslag` (procedural) | Embed `dokument__html` → text (substantive) |
| No source traceability | `dok_id` links to original document |
| Motions only | Motions AND propositions |
| Vote-centric | Source-centric with vote metadata |
| Can't cite source | Every match has `dokument_url` |

---

## Implementation Notes

### 1. Reuse Existing dbt Models

`int_motion_outcome` already does the heavy lifting for the mot → bet → votering chain. Consider:

- Creating `int_proposition_outcome` (same pattern, `ref_dok_typ = 'prop'`)
- Or generalizing to `int_source_outcome` covering both

### 2. Partition by riksmöte_year

Both `source_embeddings` and `vote_outcomes` should partition by `riksmote_year` for:
- Incremental processing (only embed new documents)
- Scoped matching (2022 promises → 2022-2026 votes)

### 3. Content Extraction

**Finding:** `dokument__text` is empty for all mot/prop. However, `dokument__html` contains the full content:

| Type | Count | Avg HTML Size |
|------|-------|---------------|
| mot | 28,045 | 26 KB |
| prop | 2,804 | 792 KB |

**Solution:** Strip HTML to extract clean text. The HTML contains:
- "Förslag till riksdagsbeslut" (the actual proposals)
- "Motivering" (the argumentation)

Create a dbt model `int_document_text` that extracts clean text from HTML:

```sql
-- int_document_text.sql
SELECT
    dokument__dok_id,
    dokument__typ,
    dokument__rm,
    dokument__titel,
    dokument__html,
    -- DuckDB has regexp_replace for basic HTML stripping
    regexp_replace(
        regexp_replace(dokument__html, '<[^>]+>', ' ', 'g'),
        '\s+', ' ', 'g'
    ) as content_text,
    dokument__dokument_url_html
FROM {{ ref('stg_dokumentstatus') }}
WHERE dokument__typ IN ('mot', 'prop')
  AND dokument__html IS NOT NULL
```

For better HTML→text conversion, consider using Python (BeautifulSoup) in the cognition module during embedding.

### 4. Party Attribution

| Document Type | Party Source |
|---------------|--------------|
| Motion | `stg_dokumentstatus_intressent` WHERE `roll = 'undertecknare'` → first signatory's `partibet` |
| Proposition | Always "Regeringen" (government) |

For propositions, the "party" is the governing coalition. This requires knowing which parties form the government in each mandate period.

---

## Open Questions

1. **Proposition handling:** Should we match promises against government propositions? A party might promise X, then the government (including that party) proposes Y. This is a different kind of contradiction.

2. **Granularity:** Motions often contain multiple "yrkanden" (specific proposals). Should we embed at motion level or yrkande level?

3. **Temporal scope:** A 2022 promise should match against 2022-2026 votes. How do we handle promises that span multiple mandate periods?

---

## Files to Create/Modify

### dbt Models (pure SQL, no LLM)

| File | Purpose |
|------|---------|
| `transformations_dbt/models/int/riksdagen/int_document_text.sql` | Extract clean text from HTML for mot/prop |
| `transformations_dbt/models/int/riksdagen/int_vote_party_aggregation.sql` | Party-level vote aggregation per votering |
| `transformations_dbt/models/int/riksdagen/int_vote_source_links.sql` | Link votes to source mot/prop documents |

### Cognition Module (LLM/embedding work)

| File | Purpose |
|------|---------|
| `cognition/src/cognition/sources/repository.py` | CRUD for `source_embeddings` table |
| `cognition/src/cognition/sources/embedder.py` | Embedding logic for mot/prop (reads int_document_text) |
| `cognition/src/cognition/sources/commands.py` | CLI: `embed-sources --riksmote-year 2024` |
| `cognition/src/cognition/core/config.py` | Add `SOURCE_EMBEDDINGS_TABLE`, `INT_DOCUMENT_TEXT`, etc. |

### Dagster Assets

| File | Change |
|------|--------|
| `orchestration_dagster/src/orchestration_dagster/defs/cognition/assets.py` | Add `source_embeddings` asset, depends on `int_document_text` |

### Deprecate

| File | Reason |
|------|--------|
| `cognition/src/cognition/embeddings/repository.py` | Replace with `sources/repository.py` |
| Current `vote_embeddings` table | Replace with `source_embeddings` |

---

## Validation Queries

Before implementing, run these in MotherDuck to confirm assumptions:

### 1. Confirm referens links both mot and prop to bet

```sql
SELECT 
    ref_dok_typ,
    COUNT(*) as count
FROM main_stg.stg_dokumentstatus_referens
WHERE referenstyp = 'behandlar'
GROUP BY ref_dok_typ
ORDER BY count DESC;
```

Expected: Both `mot` and `prop` appear.

### 2. Confirm dokument__html has content (text field is empty)

```sql
SELECT 
    dokument__typ,
    COUNT(*) as total,
    COUNT(dokument__html) as has_html,
    ROUND(AVG(LENGTH(dokument__html))) as avg_html_length
FROM main_stg.stg_dokumentstatus
WHERE dokument__typ IN ('mot', 'prop')
GROUP BY dokument__typ;
```

**Result:**
| Type | Total | Has HTML | Avg HTML Size |
|------|-------|----------|---------------|
| mot | 28,045 | 28,045 | 26 KB |
| prop | 2,804 | 2,800 | 792 KB |

Note: `dokument__text` is empty for all records. Use `dokument__html` and strip tags.

### 3. Trace a specific vote back to sources

```sql
-- Pick a votering_id from stg_dokumentstatus_utskottsforslag
WITH vote AS (
    SELECT 
        votering_id,
        _dlt_root_id as bet_dlt_id
    FROM main_stg.stg_dokumentstatus_utskottsforslag
    WHERE votering_id IS NOT NULL
    LIMIT 1
),
bet AS (
    SELECT 
        ds._dlt_id,
        ds.dokument__dok_id as bet_dok_id
    FROM main_stg.stg_dokumentstatus ds
    JOIN vote v ON ds._dlt_id = v.bet_dlt_id
),
sources AS (
    SELECT 
        r.ref_dok_id,
        r.ref_dok_typ,
        r.ref_dok_titel
    FROM main_stg.stg_dokumentstatus_referens r
    JOIN bet b ON r._dlt_root_id = b._dlt_id
    WHERE r.referenstyp = 'behandlar'
)
SELECT * FROM sources;
```

Expected: Returns mot and/or prop documents that the vote decided on.

---

## Summary

**Kill the darling:** We were embedding the wrong thing. `forslag` is procedural noise.

**The beautiful solution:**
1. Embed source documents (mot, prop) — the actual policy content
2. Store vote outcomes as metadata with links to sources
3. Match promises → sources → votes with full traceability

Every contradiction card can now cite: "Löfte från valmanifest 2022 → Motion 2023/24:1234 → Röstning 2024-03-15 → Parti X röstade NEJ"

This is the architecture that makes contradictions credible.
