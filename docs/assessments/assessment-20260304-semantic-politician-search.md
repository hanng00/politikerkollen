# Semantic Politician Search: Architecture Assessment

**Date:** 2026-03-04  
**Status:** Architecture Design  
**Trigger:** User feedback: "What would make you actually view this yourself and share?"

---

## The Problem

Users want to answer: **"Which politicians actually fight for what I care about?"**

Current tools (riksdagen.se, valkompassen) show either:

- Raw activity logs (hard to synthesize)
- Stated positions (manifestos, surveys)

Nobody shows **revealed preferences** — what politicians actually DO.

---

## The Value Proposition

> "Se vilka politiker som faktiskt röstat för det du bryr dig om"
>
> Inte vad de säger. Vad de gör.

This is the differentiator. Every other tool shows stated positions. We show actions.

---

## System Architecture

### User Flow

```
┌─────────────────────────────────────────────────────────────┐
│  USER INPUT                                                 │
│  "Sänka skatten på bensin"                                  │
└─────────────────────────────────────────────────────────────┘
                              ↓
┌─────────────────────────────────────────────────────────────┐
│  STEP 1: EMBED QUERY                                        │
│  Real-time embedding via OpenAI (text-embedding-3-small)    │
└─────────────────────────────────────────────────────────────┘
                              ↓
┌─────────────────────────────────────────────────────────────┐
│  STEP 2: HYBRID SEARCH                                      │
│  Vector search across document types (parallel)             │
│                                                             │
│  Phase 1: Motioner only                                     │
│  Phase 2: + Propositioner                                   │
│  Phase 3: + Anföranden                                      │
└─────────────────────────────────────────────────────────────┘
                              ↓
┌─────────────────────────────────────────────────────────────┐
│  STEP 3: RESOLUTION LAYER                                   │
│  For each matching document, extract politician signals:    │
│  - Who authored it?                                         │
│  - Who voted for/against it?                                │
│  - Who spoke about it?                                      │
└─────────────────────────────────────────────────────────────┘
                              ↓
┌─────────────────────────────────────────────────────────────┐
│  STEP 4: AGGREGATION                                        │
│  Sum weighted signals per politician                        │
│  score = Σ (action_weight × similarity × recency_factor)    │
└─────────────────────────────────────────────────────────────┘
                              ↓
┌─────────────────────────────────────────────────────────────┐
│  OUTPUT                                                     │
│  Ranked list of politicians with evidence                   │
└─────────────────────────────────────────────────────────────┘
```

---

## The Resolution Layer (Key Insight)

Raw semantic matches aren't enough. Each document type resolves differently into politician-level signals.

### Motion Resolution

```
Input: Motion HC023440 (similarity: 0.89)

→ Who authored it?
  intressent_ids: [person_A, person_B, person_C]
  Signal: STRONG (they wrote it, weight: 10)

→ Was it voted on?
  Join: motion → betänkande → utskottsforslag → votering
  If yes: Who voted Ja? Who voted Nej?
  Signal: MEDIUM (weight: +3 for Ja, -3 for Nej)

→ What was the outcome?
  vinnare: 'bifall' or 'avslag'
  Context: Did their side win?
```

### Anförande Resolution (Phase 3)

```
Input: Speech in debate on bet 2024/25:SkU12

→ Who gave it?
  intressent_id: person_X
  Signal: MEDIUM (weight: 2)

→ What was the context?
  Join: speech → betänkande → what was being decided?
  Fetch the motion/prop being debated

→ What was their stance?
  Infer from subsequent vote, or stance detection on text
```

### Proposition Resolution (Phase 2)

```
Input: Prop 2024/25:123 (government bill)

→ Who "owns" it?
  Regeringen (governing coalition)
  Signal: Weak for individuals, strong for parties

→ Who voted for/against?
  Same join pattern as motions
  Signal: MEDIUM (weight: +3/-3)
```

---

## Scoring Model

### Action Weights


| Action                    | Weight | Rationale                              |
| ------------------------- | ------ | -------------------------------------- |
| Authored motion           | 10     | Strongest signal — they initiated this |
| Voted Ja (with party)     | 3      | Supported it                           |
| Voted Ja (against party)  | 6      | Rebel vote — extra conviction          |
| Spoke in debate           | 2      | Engaged with the topic                 |
| Voted Nej (with party)    | -3     | Opposed it                             |
| Voted Nej (against party) | -6     | Rebel vote against                     |


### Aggregation Formula

```
score = Σ (action_weight × similarity × recency_factor)
```

Where:

- **similarity**: Cosine similarity from vector search (0-1)
- **recency_factor**: 1.0 for current term, 0.7 for previous term

### Example Calculation

```
Query: "Sänka skatten på bensin"

Matching motion (similarity: 0.89):
  - person_A authored it: 10 × 0.89 = 8.9
  - person_A voted Ja: 3 × 0.89 = 2.67
  - person_B authored it: 10 × 0.89 = 8.9
  - person_C voted Ja: 3 × 0.89 = 2.67
  - person_D voted Nej: -3 × 0.89 = -2.67

Another matching motion (similarity: 0.75):
  - person_A voted Ja: 3 × 0.75 = 2.25
  - person_C voted Ja: 3 × 0.75 = 2.25

Final scores:
  person_A: 8.9 + 2.67 + 2.25 = 13.82
  person_B: 8.9
  person_C: 2.67 + 2.25 = 4.92
  person_D: -2.67
```

---

## Known Issues & Mitigations

### Issue 1: Party-Line Voting

Most votes are party-line. A search for "sänka bensinskatten" might return:

- All 73 SD members with +3 each
- All 100 S members with -3 each

**Mitigations:**

1. Weight motion authorship much higher than votes (10x vs 3x)
2. Weight rebel votes higher (2x multiplier)
3. Show party-level aggregation alongside individual rankings
4. Consider showing "most active" not just "highest score"

### Issue 2: Anföranden Complexity

Speeches are semantically rich but:

- Often rhetorical, not policy-specific
- Stance isn't always clear from text alone
- Need to join to betänkande to understand context

**Mitigation:** Defer to Phase 3. Motions + votes give 80% of the signal.

### Issue 3: Similarity Threshold Tuning

- Too low (0.5): Noise, irrelevant matches
- Too high (0.9): Miss relevant matches

**Mitigation:** Start with 0.7, tune based on real query data.

### Issue 4: Proposition Attribution

Government bills (prop) are authored by "Regeringen," not individuals.

**Mitigation:** 

- Phase 2 priority (after motions)
- Use only vote signals, not authorship
- Consider party-level attribution for governing coalition

---

## Implementation Phases

### Phase 1: Motions Only (MVP)

**Goal:** Prove the concept with the cleanest data.

**Components:**

1. ✅ `source_embeddings` table (exists)
2. ✅ `embed-sources` CLI (exists)
3. 🔨 `int_vote_source_links` dbt model (spec'd in assessment-20260302)
4. 🔨 `search_sources_by_query()` function
5. 🔨 `aggregate_by_politician()` function
6. 🔨 Search API endpoint
7. 🔨 Wire to `/viral` UI

**Data scope:**

- ~7,000 motions (riksmöte 2022-2025)
- Current term only for relevance

### Phase 2: Add Propositions

**Goal:** Include government bills for broader coverage.

**Additional work:**

- Embed propositions (~2,800 documents, larger)
- Same resolution pattern as motions (votes only, no authors)

**Estimated effort:** 1 day (infrastructure reuse)

### Phase 3: Add Anföranden

**Goal:** Capture debate engagement.

**Additional work:**

- Separate speech embeddings table
- Join to betänkande for context
- Possibly stance detection

**Estimated effort:** 3-5 days (new complexity)

---

## Data Dependencies

### Existing (Ready to Use)


| Table/Model                          | Location         | Status                     |
| ------------------------------------ | ---------------- | -------------------------- |
| `stg_dokumentstatus`                 | MotherDuck       | ✅ Has HTML for mot/prop    |
| `stg_dokumentstatus_intressent`      | MotherDuck       | ✅ Has signatories          |
| `stg_voteringlista`                  | MotherDuck       | ✅ Has individual votes     |
| `stg_dokumentstatus_utskottsforslag` | MotherDuck       | ✅ Has votering_id          |
| `stg_dokumentstatus_referens`        | MotherDuck       | ✅ Has behandlar links      |
| `source_embeddings`                  | cognition schema | ✅ Table exists, needs data |


### Needs Building


| Model                        | Purpose                       | Spec                |
| ---------------------------- | ----------------------------- | ------------------- |
| `int_vote_source_links`      | Link votes → source documents | assessment-20260302 |
| `int_vote_party_aggregation` | Party-level vote counts       | assessment-20260302 |


---

## API Design

Note: These are built in /backend

### Search Endpoint

```
POST /api/search/politicians

Request:
{
  "query": "Sänka skatten på bensin",
  "limit": 20,
  "riksmote_year": 2024  // optional, defaults to current term
}

Response:
{
  "query": "Sänka skatten på bensin",
  "results": [
    {
      "intressent_id": "abc123",
      "name": "Tobias Andersson",
      "party": "SD",
      "score": 13.82,
      "evidence": {
        "motions_authored": 1,
        "votes_for": 2,
        "votes_against": 0,
        "speeches": 0
      },
      "top_matches": [
        {
          "dok_id": "HC023440",
          "titel": "Sänkt skatt på drivmedel",
          "similarity": 0.89,
          "action": "authored"
        }
      ]
    },
    ...
  ],
  "metadata": {
    "total_matches": 47,
    "search_time_ms": 234
  }
}
```

---

## Success Metrics

### Functional

- Search returns relevant politicians for test queries
- Evidence links are traceable to source documents
- Response time < 500ms

### User Engagement

- Users complete searches (don't abandon)
- Users click through to politician profiles
- Users share results

### Data Quality

- Similarity scores correlate with human judgment
- Top results are defensible (can explain why)
- No obvious false positives in top 10

---

## Open Questions

1. **How to handle "Vote Nej"?** Show as negative score, or separate "opposed" section?
2. **Party vs Individual display?** Show party aggregation alongside individual rankings?
3. **What's "enough" evidence?** Minimum matches before showing a politician?
4. **Historical scope?** Current term only, or include previous terms with decay?

---

## Next Steps

1. **Create dbt model** — `int_vote_source_links` per assessment-20260302
2. **Add search functions** — `search_sources_by_query()`, `aggregate_by_politician()`
3. **Build API endpoint** — Wire to `/viral` page
4. **Test with real queries** — Tune similarity threshold, weights

