# Keyword Search: Title vs Chunk Text

**Date:** 2026-03-08  
**Context:** cognition/matching hybrid retrieval

## Finding

Title-only keyword search misses ~80% of relevant documents.

```sql
-- MotherDuck query on cognition.embeddings (2022-2025 sources)
-- Keywords: skatt, vård, skola, klimat, migration

title_matches:                              1,201 docs
chunk_only_matches (missed by title-only):  4,889 docs
```

## Implication

When implementing keyword search for Swedish parliamentary documents (motions/propositions), **always search chunk text**, not just titles. Titles are often procedural ("Motion 2023/24:1234") rather than descriptive.

## Tradeoff

Searching chunk text is slower (more data to scan), but the 4x recall improvement justifies the cost. Mitigate with:
- Batched queries (one query with OR conditions, not N queries)
- Limit keywords per promise (top 5)
- Limit total unique keywords (top 30)
