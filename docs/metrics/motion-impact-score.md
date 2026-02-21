# Motion Impact Score

A single, interpretable score \( S \in [0, 1] \) that captures how consequential a parliamentary motion (*motion*) is. Designed to surface meaningful legislative activity over procedural noise.

---

## Formula

$$
S = w_o \cdot O + w_m \cdot M + w_c \cdot C + w_s \cdot N + w_t \cdot T
$$

Where each component is normalised to \([0, 1]\) and weights sum to 1:

$$
w_o + w_m + w_c + w_s + w_t = 1
$$

Default weights (subject to tuning):

| Symbol | Component         | Weight |
|--------|-------------------|--------|
| \(O\)  | Outcome           | 0.35   |
| \(M\)  | Vote margin       | 0.20   |
| \(C\)  | Cross-party support | 0.20 |
| \(N\)  | Signatory breadth | 0.15   |
| \(T\)  | Topic weight      | 0.10   |

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
Fraction of represented parties that have at least one signatory or yes-vote on the motion.

$$
C = \frac{\text{parties supporting}}{\text{total parties in riksdag}}
$$

A motion backed by a single party scores \(C \approx 0.12\) (1/8 parties). A motion with 5-party support scores \(C = 0.625\).

---

### \(N\) — Signatory breadth
Normalised co-signatory count, capped to avoid runaway scores from large party blocs.

$$
N = \min\!\left(\frac{\text{signatories}}{50},\ 1\right)
$$

The cap at 50 reflects that beyond a point, additional signatories add little marginal signal.

---

### \(T\) — Topic weight
A static multiplier based on the Riksdag committee (*utskott*) that handled the motion, reflecting the structural importance of the policy domain.

| Committee                         | \(T\) |
|-----------------------------------|-------|
| Finansutskottet                   | 1.0   |
| Konstitutionsutskottet            | 0.9   |
| Försvarsutskottet                 | 0.8   |
| Justitieutskottet                 | 0.8   |
| Socialutskottet                   | 0.7   |
| Utrikesutskottet                  | 0.7   |
| All other committees              | 0.5   |
| Unknown / unassigned              | 0.3   |

---

## Computation

The score is computed at ingestion time and stored alongside each motion record. It is recomputed when vote data is finalised (vote counts can lag submission by days).

---

## Display contract

When showing \(S\) to a user, always expose its breakdown:

```
Impact score: 0.71
  ├── Outcome (approved)          +0.35
  ├── Contentiousness (56/44)     +0.18
  ├── Cross-party (4/8 parties)   +0.14
  ├── Signatories (23)            +0.07
  └── Topic (Finansutskottet)     +0.10  (capped: +0.07 effective)
```

This makes the score legible and contestable — a user should never have to trust a black box.

---

## Limitations

- **Outcome data lag**: new motioner have no vote data; score is provisional until the vote is recorded.
- **Party size bias**: \(N\) (signatories) slightly favours large parties; \(C\) (cross-party) compensates.
- **Topic weights are opinionated**: they encode editorial judgement and should be revisited per riksdagsår.
- **No text analysis**: the score is fully structural — it does not read the content of the motion. Future versions could add an NLP signal for budget magnitude, constitutional scope, etc.
