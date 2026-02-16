## The Combinatorial Explosion Problem

You're right to be worried. Let's do the math:

```
Politician A:
- N claims (anföranden, motioner they authored)
- M verification nodes (votes, other documents after each claim)

Naive approach: N × M comparisons per politician
With 349 MPs, each with ~100 claims and ~500 verification nodes:
= 349 × 100 × 500 = 17.45 million LLM calls 💀
```

Even with cheap models, that's ~$17,000+ and weeks of processing.

---

## The Key Insight: Claims Have Topics, Votes Have Topics

Not every claim needs to be checked against every vote. A claim about **"we must protect Swedish jobs"** only needs to be checked against votes related to **labor, employment, trade policy** — not votes about defense budgets or environmental regulations.

This is where **semantic filtering** saves us.

---

## Proposed Architecture: Two-Stage Filtering

```
Stage 1: Topic Extraction (cheap, one-time per document)
─────────────────────────────────────────────────────────
Every document/speech/vote gets:
- Embedding vector (1536 dims)
- Topic tags (extracted via cheap LLM or classifier)
- Stored in MotherDuck

Stage 2: Candidate Retrieval (RAG-style)
─────────────────────────────────────────────────────────
For each claim:
1. Get claim's embedding
2. Vector search against politician's votes/actions AFTER claim date
3. Filter by topic overlap
4. Return top-K candidates (K=5-10)

Stage 3: LLM Judgment (expensive, only on candidates)
─────────────────────────────────────────────────────────
For each (claim, candidate) pair:
- Full context: claim text + vote context (utskottsförslag, betänkande)
- LLM judges: contradiction? severity?
```

**New math:**

```
N claims × K candidates × 1 LLM call
= 100 × 10 × 1 = 1,000 LLM calls per politician
= 349,000 total (vs 17.45 million)
= ~$350 with GPT-4o-mini
```

That's **50x cheaper** and actually feasible.

---

## How RAG Fits In

Yes, RAG is exactly the right pattern here. But with a twist:

### Standard RAG

```
Query → Vector search → Top-K docs → LLM synthesizes answer
```

### Contradiction RAG

```
Claim → Vector search (filtered by politician + date > claim_date)
      → Top-K candidate actions
      → LLM judges each pair
```

The key differences:

1. **Scoped search**: Only search within politician's action graph
2. **Temporal filter**: Only actions AFTER the claim
3. **Pairwise judgment**: Not synthesis, but comparison

---

## The Graph Structure You Already Have

Looking at your dbt models, you have exactly what we need:

```sql
-- int_edge already has the relationships:
-- person:{id} --[undertecknare]--> dok:{motion_id}     (claims)
-- person:{id} --[talade]--------> event:anf_{id}      (claims)
-- person:{id} --[rostade]-------> event:vot_{id}      (actions to verify against)

-- And votes have context via:
-- event:vot_{id} --[handlar_om]--> dok:{betankande_id}
-- Which links to stg_dokumentstatus_utskottsforslag for the actual proposal text
```

---

## Proposed Data Model for Contradictions

### New dbt models to add:

```sql
-- 1. int_claim: Extract all "claims" (statements with verifiable positions)
-- Source: anföranden, motioner authored by politician

-- 2. int_claim_embedding: Store embeddings for each claim
-- Computed via Lambda, stored back in MotherDuck

-- 3. int_action_embedding: Store embeddings for each vote context
-- The "what was voted on" text from utskottsförslag

-- 4. mart_contradiction: Final detected contradictions
-- Populated by Lambda after LLM judgment
```

---

## The Pipeline

```
┌─────────────────────────────────────────────────────────────────────┐
│                    MotherDuck (Source of Truth)                     │
├─────────────────────────────────────────────────────────────────────┤
│  int_edge          │ int_claim        │ int_claim_embedding         │
│  (graph)           │ (extracted)      │ (vectors)                   │
│                    │                  │                             │
│  stg_anforande     │ int_action       │ int_action_embedding        │
│  (speech text)     │ (vote context)   │ (vectors)                   │
│                    │                  │                             │
│                    │                  │ mart_contradiction          │
│                    │                  │ (final output)              │
└─────────────────────────────────────────────────────────────────────┘
         │                                        ▲
         │ 1. Cron: detect new edges              │ 5. Stream: write back
         ▼                                        │
┌─────────────────────────────────────────────────┴───────────────────┐
│                         Lambda Pipeline                             │
├─────────────────────────────────────────────────────────────────────┤
│                                                                     │
│  ┌──────────────┐    ┌──────────────┐    ┌──────────────────────┐  │
│  │ EdgePoller   │───▶│ SQS Queue    │───▶│ ContradictionDetector│  │
│  │              │    │              │    │                      │  │
│  │ - New claims │    │ Per-politician│   │ 1. Get claim embed   │  │
│  │ - New votes  │    │ messages     │    │ 2. Vector search     │  │
│  └──────────────┘    └──────────────┘    │ 3. LLM judge         │  │
│                                          │ 4. Write to DDB      │  │
│                                          └──────────┬───────────┘  │
│                                                     │              │
│                                          ┌──────────▼───────────┐  │
│                                          │ DynamoDB             │  │
│                                          │ (operational store)  │  │
│                                          │                      │  │
│                                          │ Streams enabled      │  │
│                                          └──────────┬───────────┘  │
│                                                     │              │
│                                          ┌──────────▼───────────┐  │
│                                          │ SyncToMotherDuck     │  │
│                                          │ (stream handler)     │  │
│                                          └──────────────────────┘  │
└─────────────────────────────────────────────────────────────────────┘
```

---

## Where to Store Embeddings?

**Option A: MotherDuck with DuckDB VSS**

- DuckDB has vector similarity search extension
- Keep everything in one place
- Query: `SELECT * FROM int_claim_embedding ORDER BY array_cosine_similarity(embedding, ?) DESC LIMIT 10`

**Option B: Dedicated Vector DB (Pinecone, Qdrant)**

- Better for large-scale vector search
- More operational complexity
- Overkill for ~100K vectors

**Recommendation: MotherDuck** — you have ~349 politicians × ~100 claims × ~500 actions = ~200K vectors. DuckDB handles this fine.

---

## The Contradiction Detector Lambda Logic

```typescript
async function detectContradictions(msg: PoliticianUpdateMessage) {
  const { politicianId, newEdges } = msg;

  for (const edge of newEdges) {
    if (edge.type === "claim") {
      // New claim: check against existing actions
      const claimText = await getClaimText(edge.dokId);
      const claimEmbedding = await embed(claimText);

      // Store embedding in MotherDuck
      await storeClaimEmbedding(edge.dokId, claimEmbedding);

      // Find candidate actions (votes after this claim)
      const candidates = await vectorSearch({
        embedding: claimEmbedding,
        politicianId,
        afterDate: edge.date,
        type: "action",
        limit: 10,
      });

      // LLM judges each pair
      for (const candidate of candidates) {
        const result = await llmJudge(claimText, candidate);
        if (result.isContradiction) {
          await ddb.put(formatContradiction(result));
        }
      }
    } else if (edge.type === "vote") {
      // New vote: check against existing claims BEFORE this vote
      const voteContext = await getVoteContext(edge.voteringId);
      const voteEmbedding = await embed(voteContext);

      // Store embedding
      await storeActionEmbedding(edge.voteringId, voteEmbedding);

      // Find candidate claims (statements before this vote)
      const candidates = await vectorSearch({
        embedding: voteEmbedding,
        politicianId,
        beforeDate: edge.date,
        type: "claim",
        limit: 10,
      });

      // LLM judges each pair
      for (const candidate of candidates) {
        const result = await llmJudge(candidate, voteContext);
        if (result.isContradiction) {
          await ddb.put(formatContradiction(result));
        }
      }
    }
  }
}
```

---

## Key Insight: Bidirectional Checking

When a **new claim** arrives:

- Check against all **past actions** (did they already contradict this?)

When a **new action** arrives:

- Check against all **past claims** (does this contradict something they said?)

This ensures we catch contradictions regardless of which came first in our ingestion pipeline.

---

## Vote Context: The Closed Graph Problem

You mentioned: _"a vote has to be understood within the context of what's voted ON"_

Your dbt models already solve this:

```sql
-- To get full vote context:
SELECT
  v.votering_id,
  v.rost,
  uf.rubrik,           -- What's being voted on (heading)
  uf.forslag,          -- The actual proposal text
  b.titel AS betankande_titel,
  -- Can also join to motioner/propositioner that fed into this betänkande
FROM stg_voteringlista v
JOIN stg_dokumentstatus_utskottsforslag uf ON v.votering_id = uf.votering_id
JOIN stg_dokumentlista b ON v.dok_id = b.dok_id
WHERE v.intressent_id = :politician_id
```

The `forslag` field contains the actual proposal text — that's what we embed and compare against claims.

---

## Summary: The Architecture

| Component             | Technology                | Purpose                                          |
| --------------------- | ------------------------- | ------------------------------------------------ |
| **Source of truth**   | MotherDuck                | All raw data + embeddings + final contradictions |
| **Embeddings**        | MotherDuck + DuckDB VSS   | Vector similarity search                         |
| **Trigger**           | EventBridge (cron)        | Poll for new edges                               |
| **Fan-out**           | SQS                       | Per-politician processing                        |
| **Detection**         | Lambda                    | RAG + LLM judgment                               |
| **Operational store** | DynamoDB                  | Fast API reads                                   |
| **Sync back**         | DynamoDB Streams → Lambda | Write contradictions to MotherDuck               |
