# Promise Tracker: From Awareness to Virality

## The Breakthrough

We have **370 party manifestos with full text** (1897–2024) in `stg_valmanifest`. This changes everything.

**Before:** Infer contradictions from speeches → votes (ambiguous, requires NLP)  
**After:** Extract explicit promises from manifestos → match against votes (unambiguous, shareable)

---

## The Viral Unit

A single, shareable card:

```
┌─────────────────────────────────────────────────────────────────┐
│  SOCIALDEMOKRATERNA                                             │
│                                                                 │
│  "Vi ska sänka skatten för pensionärer"                        │
│  — Valmanifest 2022                                             │
│                                                                 │
│  ↓ 3 röstningar senare                                          │
│                                                                 │
│  Röstade NEJ till sänkt pensionärsskatt                        │
│                                                                 │
│  politikerkollen.org/lofte/s-2022-pension                        │
└─────────────────────────────────────────────────────────────────┘
```

This is the atomic unit of accountability. Quotable. Verifiable. Shareable.

---

## Why This Works

| Speech-based (old plan)   | Manifesto-based (new plan)        |
| ------------------------- | --------------------------------- |
| "They said X in a debate" | **"De lovade X i valmanifestet"** |
| Requires context          | Self-contained                    |
| Individual politicians    | Party-level (higher stakes)       |
| Ambiguous stance          | Explicit commitment               |
| Hard to verify            | Link to source document           |

**Manifestos are contracts.** Breaking them is betrayal, not nuance.

---

## Distribution Strategy

### 1. X Bot (Reactive + Proactive)

**Reactive:** Someone tweets about a party → bot replies with relevant broken promise card

**Proactive:**

- "Veckans brutna löfte"
- When Riksdagen votes on something tied to a promise → instant post

### 2. OG Images

Every promise gets a pre-rendered card. Share the URL → card appears in preview.

### 3. Embed Widget

```html
<iframe src="politikerkollen.org/embed/lofte/abc123" />
```

Journalists, bloggers, citizens can embed anywhere.

---

## The Flywheel

```
Manifesto promise extracted
    → Matched against votes
    → Card generated
    → X bot posts
    → People share
    → Media picks up
    → Politicians notice
    → Reputational cost increases
    → Theory of change activated
```

---

## Implementation Path

| Phase | What                                                        | Effort   |
| ----- | ----------------------------------------------------------- | -------- |
| 1     | Extract promises from 2018/2022/2024 manifestos (LLM batch) | 2-3 days |
| 2     | Match promises to party votes                               | 1-2 days |
| 3     | Build card generator (OG images)                            | 2-3 days |
| 4     | X bot integration                                           | 3-5 days |
| 5     | Embed widget                                                | 1-2 days |

**Total:** ~2 weeks to viral-ready promise tracker.

---

## What This Solves (from previous assessment)

| Gap                       | Solution                             |
| ------------------------- | ------------------------------------ |
| "So What?" problem        | Shareable cards with clear narrative |
| No promise tracking       | Manifesto → vote pipeline            |
| Individual focus          | Party-level accountability           |
| No distribution mechanism | X bot + embeds                       |
| Passive viewing           | Cards designed for sharing           |

---

## The Honest Take

This is the missing piece. We had the data infrastructure. We had the theory of change. We were missing the **viral unit** — the thing people actually share.

A broken promise card is that unit.
