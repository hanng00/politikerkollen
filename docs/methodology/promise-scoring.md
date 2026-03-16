# Promise Scoring Methodology

**Last updated:** 2026-03-15  
**Status:** Living document

This document explains how Politikerkollen assesses whether parties have acted on their election promises.

---

## Overview

The scoring system answers: **"Did this party act consistently with their promise?"**

We match election promises against parliamentary documents (motions and propositions), then analyze how the party voted on those documents. The result is a composite score and human-readable assessment.

```
Promise → Matched Documents → Party Votes → Assessment
```

---

## 1. Evidence Collection

### 1.1 Semantic Matching

Promises from party manifestos (`stg_valmanifest_promises`) are matched against parliamentary documents using vector similarity search.

- **Source documents:** Motions (`mot`) and propositions (`prop`)
- **Embedding model:** text-embedding-3-small (1536 dimensions)
- **Similarity threshold:** ~0.60 (configurable)

### 1.2 Alignment Classification

An LLM classifier determines how each matched document relates to the promise:

| Alignment | Meaning | Example |
|-----------|---------|---------|
| `supports` | Document advocates for the same policy as the promise | Promise: "Lower taxes" ↔ Motion proposing tax cuts |
| `opposes` | Document advocates against the promise | Promise: "Lower taxes" ↔ Motion proposing tax increases |
| `tangential` | Document is topically related but doesn't take a stance | Promise: "Lower taxes" ↔ Motion about tax administration |

**Critical:** Only `supports` and `opposes` alignments are used for scoring. Tangential matches are stored but excluded from assessment logic to avoid false signals.

---

## 2. Signal Types

Each piece of evidence is classified by signal type based on:
1. Document type (motion vs proposition)
2. Parliamentary outcome (approved/rejected)
3. Party's voting stance

### 2.1 Proposition Signals

| Signal Type | Meaning |
|-------------|---------|
| `proposition_supported` | Government bill passed, party voted FOR |
| `proposition_opposed` | Government bill passed, party voted AGAINST |
| `proposition_passed` | Government bill passed, no vote data for party |

### 2.2 Motion Signals

| Signal Type | Meaning |
|-------------|---------|
| `motion_bifall_supported` | Motion approved by Riksdag, party supported it |
| `motion_bifall_opposed` | Motion approved by Riksdag, party opposed it |
| `motion_supported` | Party supported the motion (even if rejected) |
| `motion_opposed` | Party opposed the motion |
| `motion_abstained` | Party abstained or was split |

---

## 3. Signal Weights

Each signal contributes a weight based on its type and alignment with the promise.

### 3.1 Weight Matrix

| Signal Type | Alignment: supports | Alignment: opposes |
|-------------|--------------------:|-------------------:|
| `proposition_supported` | +0.40 | -0.30 |
| `proposition_opposed` | -0.20 | +0.10 |
| `proposition_passed` | +0.10 | -0.10 |
| `motion_bifall_supported` | +0.30 | -0.20 |
| `motion_bifall_opposed` | -0.10 | +0.10 |
| `motion_supported` | +0.10 | -0.10 |
| `motion_opposed` | -0.10 | +0.10 |

### 3.2 Party-Filed Bonus

When a party files their own motion aligned with their promise, they receive a bonus:
- `alignment: supports` → +0.15 bonus
- `alignment: opposes` → -0.10 penalty

This rewards parties that actively champion their promises, even if the motion is rejected.

### 3.3 Tangential Alignment

All tangential matches receive **zero weight** regardless of signal type. They are stored for transparency but do not affect scoring.

---

## 4. Composite Score

The composite score aggregates all evidence into a single number from -1.0 to +1.0.

### 4.1 Formula

```
composite_score = sum(signal_weight) / count(non_zero_signals)
```

Capped at [-1.0, +1.0].

### 4.2 Why Average (Not Sum)

Using the average prevents score inflation from many weak signals. A party with 50 tangential matches and 1 strong positive signal should not score higher than a party with just the 1 strong positive signal.

---

## 5. Assessment Categories

The final assessment combines evidence strength and direction.

### 5.1 Evidence Direction

Determined by this decision tree (using non-tangential evidence only):

```
1. IF has_contradiction → "contradictory"
2. ELSE IF proposition_relevant_count > 0 → "implemented"
3. ELSE IF total_relevant = 0 → "unclear"
4. ELSE IF support_ratio ≤ 0.3 → "opposed"
5. ELSE IF support_ratio ≥ 0.7 AND motion_bifall_relevant_count > 0 → "partial"
6. ELSE IF support_ratio ≥ 0.7 → "championed"
7. ELSE → "supported"
```

### 5.2 Support Ratio

```
support_ratio = (motion_supported + motion_bifall) / (motion_supported + motion_bifall + motion_opposed)
```

Only counts non-tangential evidence.

### 5.3 Contradiction Detection

A promise is flagged as contradictory when:
```
motion_supported_relevant + motion_bifall_relevant > 0
AND motion_opposed_relevant > 0
AND motion_opposed_relevant >= (motion_supported_relevant + motion_bifall_relevant) * 0.25
```

This means the party both supported AND opposed relevant proposals, with opposition being at least 25% of support.

### 5.4 Assessment Labels (Swedish)

| Direction | Label | Meaning |
|-----------|-------|---------|
| `implemented` | Genomfört | Government bill aligned with promise was passed |
| `partial` | Delvis genomfört | Some motions approved, party supported them |
| `championed` | Drev frågan | Party consistently supported aligned proposals (none passed) |
| `supported` | Visst stöd | Party showed some support for aligned proposals |
| `contradictory` | Motsägelsefullt | Party both supported and opposed aligned proposals |
| `opposed` | Röstade emot | Party mostly opposed aligned proposals |
| `unclear` | Oklart | Insufficient non-tangential evidence |

### 5.5 Evidence Strength

| Strength | Criteria |
|----------|----------|
| `strong` | Has proposition or approved motion (non-tangential) |
| `moderate` | 3+ evidence items AND \|composite_score\| ≥ 0.15 |
| `weak` | At least 1 evidence item |
| `none` | No evidence |

---

## 6. Understanding Vote Actions vs Promise Alignment

**This is crucial for interpretation.**

A party voting "Nej" (No) does not always mean they opposed the promise. The vote action depends on what the document proposes:

| Document Alignment | Vote "Ja" means | Vote "Nej" means |
|--------------------|-----------------|------------------|
| `supports` promise | Party acted FOR promise | Party acted AGAINST promise |
| `opposes` promise | Party acted AGAINST promise | Party acted FOR promise |

**Example:**
- Promise: "Reduce antibiotic use in farming"
- Motion A (supports): "Introduce antibiotic tax" → Voting Ja = good
- Motion B (opposes): "Remove antibiotic restrictions" → Voting Nej = good

The `effective_stance` field in our data captures this correctly:
- `supported_motion` = Party's vote aligned with the motion
- `opposed_motion` = Party's vote opposed the motion

Combined with `alignment`, we determine if the party acted consistently with their promise.

---

## 7. Data Pipeline

```
┌─────────────────────────────────────────────────────────────────┐
│  stg_valmanifest_promises                                       │
│  (Extracted promises from party manifestos)                     │
└─────────────────────────────────────────────────────────────────┘
                              ↓
┌─────────────────────────────────────────────────────────────────┐
│  cognition: match_promises                                      │
│  - Semantic search against source documents                     │
│  - LLM alignment classification                                 │
│  → stg_promise_vote_matches                                     │
└─────────────────────────────────────────────────────────────────┘
                              ↓
┌─────────────────────────────────────────────────────────────────┐
│  dbt: mart_promise_evidence                                     │
│  - Joins matches with vote outcomes                             │
│  - Calculates signal_type and signal_weight                     │
│  - One row per (promise, document) pair                         │
└─────────────────────────────────────────────────────────────────┘
                              ↓
┌─────────────────────────────────────────────────────────────────┐
│  dbt: mart_promise_score                                        │
│  - Aggregates evidence per promise                              │
│  - Calculates composite_score                                   │
│  - Determines evidence_direction and assessment_label           │
│  - One row per promise                                          │
└─────────────────────────────────────────────────────────────────┘
```

---

## 8. Known Limitations

### 8.1 Missing Vote Data

Some propositions lack vote data because:
- Passed by acklamation (unanimous consent without recorded vote)
- Betänkande not fully ingested into our data pipeline

These show as `proposition_passed` with `effective_stance: NULL`.

### 8.2 Punkt Mismatch

A motion may be processed in a betänkande covering multiple topics. The `punkt_rubrik` (committee section heading) may not match the motion's actual content. We display the motion title, not the punkt_rubrik, to avoid confusion.

### 8.3 Temporal Scope

Promises from 2022 are matched against documents from 2022-2026 (current mandate period). Cross-mandate matching is not currently supported.

### 8.4 Proposition Attribution

For propositions, we cannot always determine if the promising party (when in government) was responsible for the bill. A party may promise X, then their coalition government proposes something different.

---

## 9. Changelog

| Date | Change |
|------|--------|
| 2026-03-15 | Added `*_relevant_count` columns to exclude tangential evidence from scoring |
| 2026-03-15 | Initial documentation created |
