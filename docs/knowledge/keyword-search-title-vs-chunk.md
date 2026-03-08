# Keyword Search: Title vs Chunk Text

**Date:** 2026-03-08  
**Context:** cognition/matching hybrid retrieval

## Finding 1: Search chunk text, not just titles

Title-only keyword search misses ~80% of relevant documents.

```
title_matches:                              1,201 docs
chunk_only_matches (missed by title-only):  4,889 docs
```

## Finding 2: Naive keyword search is pure noise

Single-keyword LIKE matching on chunk text produces 3.5M matches (vs 537 from vector search).
Common Swedish words appear in nearly every document.

## Finding 3: TF-IDF filtering makes keyword search viable

With IDF > 2.0 and minimum 2 keyword hits per document:
- Keyword search found **268 matches** in a 1000-doc sample
- Vector search found **0 matches** in the same sample at 0.6 threshold
- **Zero overlap** — they find completely different documents

The methods are complementary, not redundant.

## Finding 4: Stopwords need domain tuning

Top false-positive keywords from promise text (all >10% doc frequency):
- Generic: beslut, riksdag, ställer, sverige, kunna, göra, alla
- Action verbs: utreda, bekämpa, förebygga, stärka, införa, utöka
- Partial regex matches: stärk, inför, verk, ndra, bygg

## Implementation (v2)

When adding keyword search to matching pipeline:
1. IDF threshold > 2.0 (filters words in >25% of docs)
2. Minimum 2 keyword hits per document
3. Expanded stopword list (Swedish common words + political action verbs)
4. Min word length 5+ chars to avoid regex partials
5. Single batched SQL query, Python-side matching
