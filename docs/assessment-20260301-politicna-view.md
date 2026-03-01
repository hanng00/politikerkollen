Excellent data foundation. Now let me design the information architecture.

---

# Politician View: Information Architecture

## The Core Insight

The current view answers: **"What has this politician done?"** (activity log)

The new view should answer: **"On issues I care about, can I trust this person?"** (accountability profile)

---

## Information Hierarchy

```
┌─────────────────────────────────────────────────────────────────────┐
│  LEVEL 1: TRUST SNAPSHOT (5 seconds)                                │
│  "Should I pay attention to this person?"                           │
├─────────────────────────────────────────────────────────────────────┤
│                                                                     │
│  ┌──────────┐   ┌─────────────────────────────────────────────┐    │
│  │  Photo   │   │  Annie Lööf (C) · Jönköpings län            │    │
│  │  + Party │   │  ─────────────────────────────────────────  │    │
│  │  color   │   │  Aktiv ████████░░ 82%    (vs avg 45%)       │    │
│  │          │   │  Effektiv ██████░░░░ 61%  (vs avg 23%)      │    │
│  └──────────┘   │  Oberoende ███░░░░░░░ 31% (vs avg 8%)       │    │
│                 └─────────────────────────────────────────────┘    │
│                                                                     │
│  "Mest aktiv inom: Näringsliv, Finans, EU"                         │
│                                                                     │
└─────────────────────────────────────────────────────────────────────┘

┌─────────────────────────────────────────────────────────────────────┐
│  LEVEL 2: ISSUE POSITIONS (30 seconds)                              │
│  "What do they actually stand for?"                                 │
├─────────────────────────────────────────────────────────────────────┤
│                                                                     │
│  ┌─ Välj politikområde ─────────────────────────────────────────┐  │
│  │ [Alla] [Skatt] [Migration] [Miljö] [Försvar] [Vård] [...]    │  │
│  └──────────────────────────────────────────────────────────────┘  │
│                                                                     │
│  ┌─ SKATTER (SkU) ──────────────────────────────────────────────┐  │
│  │                                                               │  │
│  │  Röstmönster                    Egna initiativ                │  │
│  │  ───────────                    ──────────────                │  │
│  │  12 röster i mandatperioden     3 motioner                    │  │
│  │  ▓▓▓▓▓▓░░░░ 58% för sänkta      1 bifallen (33%)              │  │
│  │             skatter                                           │  │
│  │                                                               │  │
│  │  Senaste ställningstagande:                                   │  │
│  │  ┌────────────────────────────────────────────────────────┐  │  │
│  │  │ 📋 Sänkt skatt på drivmedel                            │  │  │
│  │  │    Röstade: JA · Parti: JA · Resultat: AVSLAG          │  │  │
│  │  │    2024-03-15 · SkU12                                  │  │  │
│  │  └────────────────────────────────────────────────────────┘  │  │
│  │  ┌────────────────────────────────────────────────────────┐  │  │
│  │  │ 📋 Höjd skatt på flygresor                             │  │  │
│  │  │    Röstade: NEJ · Parti: NEJ · Resultat: BIFALL        │  │  │
│  │  │    2024-02-20 · SkU8                                   │  │  │
│  │  └────────────────────────────────────────────────────────┘  │  │
│  │                                                               │  │
│  │  [Visa alla 12 röster inom Skatter →]                        │  │
│  └───────────────────────────────────────────────────────────────┘  │
│                                                                     │
│  ┌─ MIGRATION (SfU) ────────────────────────────────────────────┐  │
│  │  ...                                                          │  │
│  └───────────────────────────────────────────────────────────────┘  │
│                                                                     │
└─────────────────────────────────────────────────────────────────────┘

┌─────────────────────────────────────────────────────────────────────┐
│  LEVEL 3: DEEP DIVE (2+ minutes)                                    │
│  "Show me the evidence"                                             │
├─────────────────────────────────────────────────────────────────────┤
│                                                                     │
│  [Clicked on "Sänkt skatt på drivmedel" above]                     │
│                                                                     │
│  ┌─ VOTERING: Sänkt skatt på drivmedel ─────────────────────────┐  │
│  │                                                               │  │
│  │  Betänkande: 2023/24:SkU12                                   │  │
│  │  Datum: 2024-03-15                                           │  │
│  │  Utskott: Skatteutskottet                                    │  │
│  │                                                               │  │
│  │  ┌─ Förslaget ────────────────────────────────────────────┐  │  │
│  │  │ Riksdagen tillkännager för regeringen som sin mening   │  │  │
│  │  │ att skatten på bensin och diesel bör sänkas med        │  │  │
│  │  │ minst 3 kronor per liter...                            │  │  │
│  │  │ [Läs hela förslaget ↓]                                 │  │  │
│  │  └────────────────────────────────────────────────────────┘  │  │
│  │                                                               │  │
│  │  ┌─ Resultat ─────────────────────────────────────────────┐  │  │
│  │  │                                                        │  │  │
│  │  │  AVSLAG (174 mot 175)                                  │  │  │
│  │  │                                                        │  │  │
│  │  │  JA  ████████████████░░░░░░░░░░░░░░░░  174 (49.9%)    │  │  │
│  │  │  NEJ ████████████████░░░░░░░░░░░░░░░░  175 (50.1%)    │  │  │
│  │  │                                                        │  │  │
│  │  │  Partier för: M, SD, KD, L                            │  │  │
│  │  │  Partier mot: S, V, C, MP                             │  │  │
│  │  │                                                        │  │  │
│  │  └────────────────────────────────────────────────────────┘  │  │
│  │                                                               │  │
│  │  ┌─ Annie Lööfs röst ─────────────────────────────────────┐  │  │
│  │  │                                                        │  │  │
│  │  │  Röstade: JA                                          │  │  │
│  │  │  Partiets majoritet: NEJ (28 av 31 C-ledamöter)       │  │  │
│  │  │                                                        │  │  │
│  │  │  ⚠️ AVVIKANDE RÖST                                    │  │  │
│  │  │  Annie Lööf röstade mot sitt parti i denna fråga.     │  │  │
│  │  │                                                        │  │  │
│  │  └────────────────────────────────────────────────────────┘  │  │
│  │                                                               │  │
│  │  ┌─ Relaterat ────────────────────────────────────────────┐  │  │
│  │  │ • Motion 2023/24:1234 av Annie Lööf (C) - "Sänkta     │  │  │
│  │  │   drivmedelsskatter för landsbygden" [→]              │  │  │
│  │  │ • Tal i kammaren 2024-02-10 om drivmedelspriser [→]   │  │  │
│  │  └────────────────────────────────────────────────────────┘  │  │
│  │                                                               │  │
│  └───────────────────────────────────────────────────────────────┘  │
│                                                                     │
└─────────────────────────────────────────────────────────────────────┘
```

---

## Key Design Principles

### 1. **Issue-first, not action-first**

Current: Timeline of actions → User must synthesize
New: Issues with positions → User can drill down

The primary navigation is **by topic**, not by date.

### 2. **Context always visible**

Every vote shows:

- What was the question?
- How did the party vote?
- What was the outcome?
- Did this person deviate?

No orphan data points.

### 3. **Contradictions surfaced, not hidden**

When a politician:

- Votes against their party → Highlighted
- Votes against their own motion → Flagged
- Says one thing, votes another → Shown side-by-side

This is the core accountability function.

### 4. **In-app content, not links**

Full text of:

- Motions (we have `dokument__text`)
- Speeches (we have `speech_text`)
- Vote proposals (we have `forslag`)

Riksdagen link as secondary "verify source", not primary action.

### 5. **Comparative context**

Every metric shows:

- Absolute value
- Comparison to average
- Comparison to party peers

"82% active" means nothing without "average is 45%".

---

## Data Requirements

### What we have and can use now:

| Need                 | Source                               | Status   |
| -------------------- | ------------------------------------ | -------- |
| Topic categorization | `betankande_organ` (committee)       | ✅ Ready |
| Vote positions       | `vote_value` (Ja/Nej/Avstår)         | ✅ Ready |
| Party comparison     | `rebel_vote_count`, party aggregates | ✅ Ready |
| Vote outcomes        | `outcome_label` from motion impact   | ✅ Ready |
| Speech text          | `speech_text_clean`                  | ✅ Ready |
| Motion titles        | `authored_dok_titel`                 | ✅ Ready |

### What we need to surface:

| Need                    | Source                       | Work required   |
| ----------------------- | ---------------------------- | --------------- |
| Motion full text        | `dokument__text` in staging  | Add to mart     |
| Vote proposal text      | `forslag` in utskottsforslag | Add to timeline |
| Interpellation text     | `dokument__text`             | Add to mart     |
| Vote breakdown by party | Aggregate from votering      | New query       |

### What would be transformative (future):

| Need                    | Approach                         |
| ----------------------- | -------------------------------- |
| Stance detection        | NLP on speeches + votes          |
| Promise tracking        | Link manifesto text to votes     |
| Contradiction detection | Compare speech sentiment to vote |

---

## Navigation Structure

```
/politiker/[id]
├── Overview (Level 1 - Trust snapshot)
├── /amnen (Level 2 - Issue positions)
│   ├── ?topic=skatter
│   ├── ?topic=migration
│   └── ...
├── /votering/[betankande-id] (Level 3 - Vote detail)
├── /motion/[dok-id] (Level 3 - Motion detail)
├── /tal/[speech-id] (Level 3 - Speech detail)
└── /aktivitet (Raw timeline - for completeness)
```

The raw activity feed becomes a **secondary view** for power users, not the primary interface.

---

## The Accountability Loop

```
┌─────────────────────────────────────────────────────────────────┐
│                                                                 │
│   ISSUE                                                         │
│     ↓                                                           │
│   What did they SAY? ←──────────────────────┐                  │
│     ↓                                        │                  │
│   What did they VOTE?                        │ CONTRADICTION?   │
│     ↓                                        │                  │
│   What was the OUTCOME?                      │                  │
│     ↓                                        │                  │
│   Did they DEVIATE from party? ─────────────┘                  │
│                                                                 │
└─────────────────────────────────────────────────────────────────┘
```

This loop is the core value proposition. Every piece of UI should serve it.

---

## What This Enables

1. **"Show me their stance on immigration"** → Topic filter → All votes + motions + speeches on SfU
2. **"Do they vote with their party?"** → Trust snapshot shows independence score
3. **"Did they flip on this issue?"** → Historical votes on same topic, chronologically
4. **"What exactly did they vote on?"** → Full proposal text, in-app
5. **"Who else voted this way?"** → Party breakdown on vote detail page

---

## Next Steps

1. **Data layer**: Surface motion/interpellation full text in marts
2. **API layer**: Add topic-filtered endpoints, vote detail endpoint
3. **UI layer**: Build issue-centric view with drill-down
4. **Move timeline**: Demote to secondary "Aktivitetslogg" tab

Should I detail the implementation plan for any of these layers?
