# Motion Impact Score

A single, interpretable score \( S \in [0, 1] \) that captures how consequential a parliamentary motion (*motion*) is. Designed to surface meaningful legislative activity over procedural noise.

---

## Formula (v2)

$$
S = w_o \cdot O + w_m \cdot M + w_c \cdot C + w_n \cdot N + w_t \cdot T
$$

Where each component is normalised to \([0, 1]\) and weights sum to 1:

| Symbol | Component           | Weight | Rationale |
|--------|---------------------|--------|-----------|
| \(O\)  | Outcome             | 0.40   | Did it pass? Most direct measure of impact |
| \(M\)  | Vote margin         | 0.25   | Close votes signal contested, high-stakes issues |
| \(C\)  | Cross-party support | 0.15   | Multi-party backing indicates broader significance |
| \(N\)  | Signatory breadth   | 0.10   | More signatories = more political capital invested |
| \(T\)  | Topic weight        | 0.10   | Some policy domains are structurally more impactful |

**Design principle:** Outcome + vote margin (65% combined) dominate when available — actual parliamentary treatment is the strongest signal of impact.

---

## Components

### \(O\) — Outcome
Did the motion pass?

$$
O = \begin{cases} 1.0 & \text{bifall (approved)} \\ 0.3 & \text{avslag (rejected)} \\ 0.0 & \text{unknown / withdrawn} \end{cases}
$$

Approved motions are rare and directly shape legislation, so they receive the largest weight.

---

### \(M\) — Vote margin (contentiousness)
A motion that nearly passed is more significant than one crushed 300–0.

$$
M = 1 - \frac{|Y - N|}{Y + N}
$$

Where \(Y\) = ja-votes, \(N\) = nej-votes. A 50/50 split yields \(M = 1\); a unanimous vote yields \(M = 0\).

> Rationale: close votes signal contested, high-stakes issues.

---

### \(C\) — Cross-party support
Fraction of represented parties that have at least one signatory, with **sqrt transform** for diminishing returns.

$$
C = \sqrt{\frac{\text{parties supporting}}{8}}
$$

| Parties | Raw | C (sqrt) |
|---------|-----|----------|
| 1       | 0.125 | 0.35   |
| 2       | 0.25  | 0.50   |
| 4       | 0.50  | 0.71   |
| 8       | 1.00  | 1.00   |

> Rationale: Going from 1 to 3 parties is more significant than going from 6 to 8.

---

### \(N\) — Signatory breadth
Normalised co-signatory count with **log transform** for diminishing returns.

$$
N = \frac{\ln(1 + \text{signatories})}{\ln(51)}
$$

| Signatories | N (log) |
|-------------|---------|
| 1           | 0.18    |
| 5           | 0.46    |
| 15          | 0.71    |
| 30          | 0.87    |
| 50          | 1.00    |

> Rationale: The difference between 5 and 15 signatories is more meaningful than between 35 and 45.

---

### \(T\) — Topic weight
A static multiplier based on the Riksdag committee (*utskott*) that handled the motion, reflecting the structural importance of the policy domain.

| Committee                         | \(T\) |
|-----------------------------------|-------|
| Finansutskottet (FiU)             | 1.0   |
| Konstitutionsutskottet (KU)       | 0.9   |
| Försvarsutskottet (FöU)           | 0.8   |
| Justitieutskottet (JuU)           | 0.8   |
| Socialutskottet (SoU)             | 0.7   |
| Utrikesutskottet (UU)             | 0.7   |
| Skatteutskottet (SkU)             | 0.7   |
| Arbetsmarknadsutskottet (AU)      | 0.6   |
| Civilutskottet (CU)               | 0.6   |
| Miljö- och jordbruksutskottet (MJU) | 0.6 |
| Trafikutskottet (TU)              | 0.6   |
| Utbildningsutskottet (UbU)        | 0.6   |
| Kulturutskottet (KrU)             | 0.5   |
| Näringsutskottet (NU)             | 0.5   |
| Socialförsäkringsutskottet (SfU)  | 0.5   |
| EU-nämnden (EU)                   | 0.5   |
| Unknown / unassigned              | 0.3   |

---

## Provisional scores

Motions without a betänkande outcome (newly filed, pending) are scored only on engagement signals with re-weighted formula:

$$
S_{\text{provisional}} = 0.43 \cdot C + 0.29 \cdot N + 0.28 \cdot T
$$

These scores are **not comparable** to resolved motions and are flagged with `is_provisional = true`.

---

## Computation

The score is computed at ingestion time and stored alongside each motion record. It is recomputed when vote data is finalised (vote counts can lag submission by days).

---

## Display contract

When showing \(S\) to a user, always expose its breakdown:

```
Impact score: 0.71
  ├── Outcome (approved)          +0.40
  ├── Contentiousness (56/44)     +0.18
  ├── Cross-party (4/8 parties)   +0.11
  ├── Signatories (23)            +0.07
  └── Topic (Finansutskottet)     +0.10
```

This makes the score legible and contestable — a user should never have to trust a black box.

---

## Limitations

- **Outcome data lag**: new motioner have no vote data; score is provisional until the vote is recorded.
- **Party size bias**: \(N\) (signatories) slightly favours large parties; \(C\) (cross-party) compensates.
- **Topic weights are opinionated**: they encode editorial judgement and should be revisited per riksdagsår.
- **No text analysis**: the score is fully structural — it does not read the content of the motion. Future versions could add an NLP signal for budget magnitude, constitutional scope, etc.

---

## Changelog

### v2 (2026-02-22)
- Increased outcome weight (0.35 → 0.40) and vote margin weight (0.20 → 0.25)
- Reduced cross-party weight (0.20 → 0.15) and signatory weight (0.15 → 0.10)
- Added log transform to signatory score (diminishing returns)
- Added sqrt transform to cross-party score (diminishing returns)
- Fixed bug where `int_motion_outcome` was empty due to incorrect LIKE filter on `forslag` text

### v1 (initial)
- Linear formula: S = 0.35·O + 0.20·M + 0.20·C + 0.15·N + 0.10·T
