# Contradiction Detection v2

> Supersedes the original `contradictions.md`. Written 2026-02-18.

## The Goal

Automatically detect when a politician's **actions contradict their stated positions**.

Example:
- **Said** (speech, 2024-03): "We must protect Swedish jobs at all costs"
- **Did** (vote, 2024-09): Voted Ja on outsourcing government IT contracts

This is the core value proposition of Politikerkollen.

---

## Why the Original Plan Was Wrong

The original plan proposed:
- 5 new Lambda functions (EdgePoller, SQS fan-out, ContradictionDetector, DynamoDB, SyncToMotherDuck)
- Separate `int_claim` and `int_action` models
- Process all claims × all actions for all politicians

**Problems:**

1. **Over-engineered** — We already have Dagster for orchestration
2. **Ignored existing models** — `mart_person_timeline` already has everything we need
3. **Wrong mental model** — "claims vs actions" is too simplistic
4. **No quality control** — LLMs hallucinate; false positives are dangerous
5. **Too expensive** — 17M comparisons at naive scale, still 1.7M with filtering

---

## Key Insight: Rebel Votes Are High-Signal

### The Problem with All Votes

In the Swedish Riksdag, **party discipline is extremely strong**. On most votes:
- All S members vote the same way
- All M members vote the same way
- The politician had no real choice

Party-line votes are unlikely to reveal individual hypocrisy because:
1. The politician followed the whip (defensible)
2. They probably never made a personal statement about the topic
3. "I follow my party" is a valid defense

### What's a Rebel Vote?

A rebel vote is when a politician votes **differently from the majority of their own party**.

```
Vote: Climate tax increase
- 90% of Socialdemokraterna vote "Ja"
- MP Anna Andersson (S) votes "Nej"  ← REBEL VOTE
```

This is interesting because:
1. **She chose to break ranks** — not automatic party discipline
2. **She likely has a reason** — probably stated in a speech or motion
3. **Higher contradiction potential** — personal conviction vs personal action

### The Numbers

| Approach | Votes per MP | Candidates | LLM Calls per MP | Total (349 MPs) |
|----------|--------------|------------|------------------|-----------------|
| All votes | 500/year | 10 | 5,000 | 1.7M |
| Rebel votes only | ~25/year | 10 | 250 | 87K |

**20x cheaper** and higher signal-to-noise ratio.

---

## Architecture

### Data Flow

```
┌─────────────────────────────────────────────────────────────────────┐
│                         MotherDuck                                  │
├─────────────────────────────────────────────────────────────────────┤
│                                                                     │
│  mart_person_timeline (existing)                                    │
│  ├── action_type: vote | speech | authored                          │
│  ├── action_id, action_date                                         │
│  ├── speech_text_clean (for speeches)                               │
│  ├── subject_title, subject_text (for votes)                        │
│  └── authored_dok_titel (for documents)                             │
│                                                                     │
│  mart_timeline_embeddings (NEW)                                     │
│  ├── action_id (FK to timeline)                                     │
│  ├── embedding FLOAT[1536]                                          │
│  └── embedded_text (what was embedded)                              │
│                                                                     │
│  mart_contradiction_candidates (NEW)                                │
│  ├── candidate_id                                                   │
│  ├── intressent_id                                                  │
│  ├── claim_action_id, claim_text, claim_date                        │
│  ├── action_action_id, action_text, action_date, vote_value         │
│  ├── similarity_score                                               │
│  └── status: pending | analyzing | approved | rejected | published  │
│                                                                     │
│  mart_contradictions (NEW)                                          │
│  ├── contradiction_id                                               │
│  ├── intressent_id                                                  │
│  ├── claim_* (from candidate)                                       │
│  ├── action_* (from candidate)                                      │
│  ├── severity: minor | moderate | major                             │
│  ├── confidence: 0-100                                              │
│  ├── explanation (LLM-generated)                                    │
│  ├── claim_quote (key quote extracted by LLM)                       │
│  ├── mitigating_factors (array)                                     │
│  ├── reviewed_at, reviewed_by (for audit trail)                     │
│  └── published_at                                                   │
│                                                                     │
└─────────────────────────────────────────────────────────────────────┘
```

### Processing Pipeline (Dagster Assets)

```
┌─────────────────────────────────────────────────────────────────────┐
│                      Dagster Assets                                 │
├─────────────────────────────────────────────────────────────────────┤
│                                                                     │
│  Asset 1: timeline_embeddings                                       │
│  ─────────────────────────────────────────────────────────────────  │
│  • Embed all timeline items incrementally                           │
│  • Input: mart_person_timeline (new items only)                     │
│  • Output: mart_timeline_embeddings                                 │
│  • Model: text-embedding-3-small                                    │
│  • Cost: ~$5 initial, ~$0.01/day incremental                        │
│                                                                     │
│  Asset 2: contradiction_candidates                                  │
│  ─────────────────────────────────────────────────────────────────  │
│  • Find potential contradictions via vector similarity              │
│  • Input: rebel votes + their embeddings                            │
│  • Process: For each rebel vote, find similar speeches/motions      │
│             from BEFORE the vote (1 year lookback)                  │
│  • Output: mart_contradiction_candidates (status: pending)          │
│  • Cost: $0 (pure SQL + DuckDB VSS)                                 │
│                                                                     │
│  Asset 3: contradiction_analysis                                    │
│  ─────────────────────────────────────────────────────────────────  │
│  • LLM analyzes pending candidates                                  │
│  • Input: candidates with status = pending                          │
│  • Process: Structured LLM judgment (is it a real contradiction?)   │
│  • Output: Update candidate status + create mart_contradictions     │
│  • Model: gpt-4o-mini                                               │
│  • Cost: ~$15 initial, ~$1/day incremental                          │
│                                                                     │
└─────────────────────────────────────────────────────────────────────┘
```

---

## Stage 1: Embeddings

### What to Embed

| Action Type | Text to Embed | Example |
|-------------|---------------|---------|
| `speech` | `speech_text_clean` | Full speech content |
| `vote` | `subject_title \|\| ' ' \|\| subject_text` | "Höjd koldioxidskatt. Utskottet föreslår att riksdagen avslår motion 2024/25:123..." |
| `authored` | `authored_dok_titel` + full text (fetched) | Motion title + content |

### Incremental Strategy

```sql
-- Only embed items not yet processed
SELECT 
  t.action_id,
  t.action_type,
  CASE 
    WHEN t.action_type = 'speech' THEN t.speech_text_clean
    WHEN t.action_type = 'vote' THEN t.subject_title || ' ' || COALESCE(t.subject_text, '')
    WHEN t.action_type = 'authored' THEN t.authored_dok_titel
  END AS text_to_embed
FROM mart_person_timeline t
LEFT JOIN mart_timeline_embeddings e ON e.action_id = t.action_id
WHERE e.action_id IS NULL
  AND t.action_date >= CURRENT_DATE - INTERVAL '1 year'
```

### Cost Estimate

- ~100K timeline items (1 year) × ~500 tokens avg = 50M tokens
- text-embedding-3-small: $0.02/1M tokens = **$1 initial**
- Daily incremental: ~500 new items = $0.005/day

---

## Stage 2: Candidate Generation

### The Query

Pure SQL using DuckDB's vector similarity search:

```sql
WITH rebel_votes AS (
  -- Get rebel votes with their embeddings
  -- (rebel vote = voted differently from party majority)
  SELECT 
    t.intressent_id,
    t.action_id AS vote_action_id,
    t.action_date AS vote_date,
    t.vote_value,
    t.subject_title,
    t.subject_text,
    e.embedding AS vote_embedding
  FROM mart_person_timeline t
  JOIN mart_timeline_embeddings e ON e.action_id = t.action_id
  WHERE t.action_type = 'vote'
    AND is_rebel_vote(t.action_id)  -- existing rebel vote logic
    AND t.action_date >= CURRENT_DATE - INTERVAL '1 year'
),

candidate_claims AS (
  SELECT 
    rv.intressent_id,
    rv.vote_action_id,
    rv.vote_date,
    rv.vote_value,
    rv.subject_title AS vote_subject,
    rv.subject_text AS vote_context,
    
    t.action_id AS claim_action_id,
    t.action_type AS claim_type,
    t.action_date AS claim_date,
    CASE 
      WHEN t.action_type = 'speech' THEN t.speech_text_clean
      WHEN t.action_type = 'authored' THEN t.authored_dok_titel
    END AS claim_text,
    
    array_cosine_similarity(rv.vote_embedding, e.embedding) AS similarity
    
  FROM rebel_votes rv
  JOIN mart_person_timeline t 
    ON t.intressent_id = rv.intressent_id
    AND t.action_type IN ('speech', 'authored')
    AND t.action_date < rv.vote_date  -- claim must be BEFORE the vote
    AND t.action_date >= rv.vote_date - INTERVAL '1 year'  -- within 1 year
  JOIN mart_timeline_embeddings e ON e.action_id = t.action_id
  WHERE array_cosine_similarity(rv.vote_embedding, e.embedding) > 0.65
)

-- Take top 10 candidates per rebel vote
SELECT * FROM (
  SELECT 
    *,
    ROW_NUMBER() OVER (
      PARTITION BY vote_action_id 
      ORDER BY similarity DESC
    ) AS rank
  FROM candidate_claims
) ranked
WHERE rank <= 10
```

### Output

Inserted into `mart_contradiction_candidates` with `status = 'pending'`.

---

## Stage 3: LLM Analysis

### Prompt

```
You are analyzing potential contradictions in Swedish political records for Politikerkollen, a transparency platform.

## CLAIM (what they said)
- Date: {claim_date}
- Type: {claim_type}
- Full text:
{claim_text}

## ACTION (what they did)
- Date: {action_date}
- Vote: {vote_value} on "{vote_subject}"
- Context: {vote_context}
- Note: This was a REBEL VOTE (they voted against their party majority)

## Your Task

Determine if the ACTION contradicts the CLAIM. Consider:

1. **Topic match**: Is the claim actually about the same topic as the vote?
2. **Position clarity**: Did the claim express a clear position that the vote contradicts?
3. **Temporal relevance**: Is 1 year too long? Did circumstances change?
4. **Mitigating factors**: Coalition agreements, amended proposals, new information?

## Response Format (JSON)

{
  "is_contradiction": boolean,
  "confidence": 0-100,
  "severity": "minor" | "moderate" | "major",
  "explanation": "2-3 sentences explaining your reasoning",
  "claim_quote": "The most relevant quote from the claim (max 200 chars)",
  "mitigating_factors": ["factor1", "factor2"] or []
}

## Severity Guide

- **minor**: Slight inconsistency, defensible with context
- **moderate**: Clear contradiction, but common in politics (compromise, coalition)
- **major**: Direct hypocrisy with no reasonable defense

Be conservative. When in doubt, mark as NOT a contradiction. False positives damage credibility.
```

### Processing Logic

```python
@asset(deps=[contradiction_candidates])
def contradiction_analysis(context):
    # Get pending candidates
    candidates = query("""
        SELECT * FROM mart_contradiction_candidates 
        WHERE status = 'pending'
        ORDER BY similarity DESC
        LIMIT 100  -- batch size
    """)
    
    for candidate in candidates:
        # Update status to analyzing
        update_status(candidate.id, 'analyzing')
        
        # Call LLM
        result = analyze_contradiction(candidate)
        
        if result.is_contradiction and result.confidence >= 70:
            # Insert into mart_contradictions
            insert_contradiction(candidate, result)
            update_status(candidate.id, 'approved')
        else:
            update_status(candidate.id, 'rejected')
```

### Cost Estimate

- ~25 rebel votes/MP × 10 candidates × 349 MPs = 87K candidates
- ~70% rejected by similarity threshold = 26K LLM calls
- ~2K tokens per call = 52M tokens
- gpt-4o-mini: $0.15/1M input + $0.60/1M output ≈ **$15 initial**

---

## Stage 4: API Endpoints

### Public Endpoints

```
GET /contradictions
  ?politician_id=xxx
  &party=S
  &severity=major
  &limit=20
  &offset=0

Response:
{
  "contradictions": [
    {
      "id": "ctr_abc123",
      "politician": {
        "id": "xxx",
        "name": "Anna Andersson",
        "party": "S",
        "image_url": "..."
      },
      "claim": {
        "date": "2024-03-15",
        "type": "speech",
        "quote": "Vi måste skydda svenska jobb till varje pris",
        "full_text_url": "/api/timeline/action_id"
      },
      "action": {
        "date": "2024-09-20",
        "type": "vote",
        "value": "Ja",
        "subject": "Outsourcing av statliga IT-tjänster",
        "document_url": "https://riksdagen.se/..."
      },
      "severity": "major",
      "confidence": 87,
      "explanation": "...",
      "mitigating_factors": []
    }
  ],
  "total": 156,
  "has_more": true
}
```

```
GET /contradictions/{id}

Response:
{
  // Same as above, but with full claim_text included
  "claim": {
    ...
    "full_text": "Complete speech text..."
  }
}
```

### Admin Endpoints (Future)

```
POST /admin/contradictions/{id}/review
{
  "decision": "publish" | "reject",
  "notes": "Optional reviewer notes"
}
```

---

## Stage 5: Frontend Integration

Replace mock data in:
- `/` (home) — Contradiction feed
- `/politiker/[id]` — Politician's contradictions
- `/motsagelse/[id]` — Contradiction detail page

### Component Updates

```typescript
// Before: mock data
import { contradictions } from '@/mocks/contradictions';

// After: real API
const { data } = useQuery({
  queryKey: ['contradictions', filters],
  queryFn: () => api.getContradictions(filters)
});
```

---

## Implementation Order

| Step | Description | Effort | Cost |
|------|-------------|--------|------|
| 1 | Add `mart_timeline_embeddings` table schema | 1h | $0 |
| 2 | Dagster asset: `timeline_embeddings` | 4h | $1 |
| 3 | Add `mart_contradiction_candidates` table schema | 1h | $0 |
| 4 | Dagster asset: `contradiction_candidates` | 4h | $0 |
| 5 | Add `mart_contradictions` table schema | 1h | $0 |
| 6 | Dagster asset: `contradiction_analysis` | 4h | $15 |
| 7 | API: `GET /contradictions` | 2h | $0 |
| 8 | API: `GET /contradictions/{id}` | 1h | $0 |
| 9 | Frontend: Replace mock data | 4h | $0 |

**Total: ~22 hours, ~$16**

---

## Future Expansion

Once rebel votes are working:

1. **All votes** — Expand beyond rebel votes (20x more candidates)
2. **Cross-time contradictions** — Politician contradicts their younger self
3. **Party contradictions** — Party manifesto vs party voting record
4. **User voting** — Let users upvote/downvote contradiction severity
5. **Trending** — Surface contradictions getting social attention

---

## Success Metrics

| Metric | Target |
|--------|--------|
| Contradictions detected | 500+ (initial batch) |
| Precision (spot-check) | >90% real contradictions |
| False positive rate | <5% |
| Time to first result | <1 week from start |
| User engagement | Contradictions shared > profile views |

---

## Risks & Mitigations

| Risk | Mitigation |
|------|------------|
| LLM hallucinations | Conservative prompting, confidence threshold, future human review |
| Unfair to politicians | Include mitigating factors, link to full context |
| Legal concerns | Only use public Riksdag data, factual presentation |
| Low signal in rebel votes | Expand to all votes if needed |
| Embedding quality | Test with known contradictions first |

---

## Appendix: Rebel Vote Detection

We already compute rebel votes in the backend. The logic:

```sql
WITH party_vote_majority AS (
  SELECT 
    votering_id,
    parti,
    rost,
    COUNT(*) AS vote_count,
    ROW_NUMBER() OVER (
      PARTITION BY votering_id, parti 
      ORDER BY COUNT(*) DESC
    ) AS rank
  FROM stg_voteringlista v
  JOIN stg_personlista p ON p.intressent_id = v.intressent_id
  GROUP BY votering_id, parti, rost
)

SELECT 
  v.intressent_id,
  v.votering_id,
  v.rost AS individual_vote,
  m.rost AS party_majority_vote
FROM stg_voteringlista v
JOIN stg_personlista p ON p.intressent_id = v.intressent_id
JOIN party_vote_majority m 
  ON m.votering_id = v.votering_id 
  AND m.parti = p.parti 
  AND m.rank = 1
WHERE v.rost != m.rost  -- voted differently from party majority
  AND v.rost IN ('Ja', 'Nej')  -- exclude Avstår, Frånvarande
```
