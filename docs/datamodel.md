# Data Model Summary for `transformations_dbt`

### Overview

This is a dbt project that transforms Swedish Parliament (Riksdagen) data into a **graph-based data model** with three node types (Person, Document, Event) and edges representing relationships between them.

---

## 1. All Models and Their Purpose

### Staging Layer (`stg_*`) - Raw Data Passthrough

| Model                                       | Purpose                                                   | Key Columns                                                                                                   |
| ------------------------------------------- | --------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------- |
| **`stg_personlista`**                       | Politicians/members of parliament                         | `intressent_id` (PK), `tilltalsnamn`, `efternamn`, `parti`, `valkrets`, `status`, `fodd_ar`, `kon`            |
| **`stg_personlista_personuppdrag_uppdrag`** | Parliamentary assignments (committee memberships, roles)  | `organ_kod`, `roll_kod`, `typ`, `from`, `tom`                                                                 |
| **`stg_personlista_personuppgift_uppgift`** | Additional person info (contact, background)              | `kod`, `namn`, `text`                                                                                         |
| **`stg_dokumentlista`**                     | All documents (motions, propositions, reports, protocols) | `dok_id` (PK), `titel`, `dokumentnamn`, `doktyp`, `rm`, `organ`, `datum`                                      |
| **`stg_voteringlista`**                     | Individual vote records                                   | `votering_id`, `intressent_id`, `rost` (Ja/Nej/Avstår), `dok_id`, `punkt`                                     |
| **`stg_anforande`**                         | Full speech text from debates                             | `systemnyckel` (PK), `intressent_id`, `anforandetext`, `anforandetext_clean`, `rel_dok_id`, `kammaraktivitet` |
| **`stg_anforandelista`**                    | Truncated speech list (use `stg_anforande` for full text) | Same as above but truncated text                                                                              |
| **`stg_dokumentstatus`**                    | Detailed document metadata                                | `dokument__dok_id`, all nested document fields                                                                |
| **`stg_dokumentstatus_intressent`**         | Who is involved with a document                           | `intressent_id`, `roll` (undertecknare, fragestallare, besvaradav, stalldtill), `ordning`                     |
| **`stg_dokumentstatus_referens`**           | Document-to-document references                           | `ref_dok_id`, `referenstyp`, `ref_dok_titel`, `ref_dok_typ`                                                   |
| **`stg_dokumentstatus_utskottsforslag`**    | Committee proposals (what's being voted on)               | `punkt`, `rubrik`, `forslag`, `votering_id`, `vinnare`, `beslutstyp`                                          |
| **`stg_dokumentstatus_aktivitet`**          | Document lifecycle events                                 | `kod`, `namn`, `datum`, `status`, `process`                                                                   |
| **`stg_dokumentstatus_forslag`**            | Proposals within documents                                | `nummer`, `beteckning`, `lydelse`, `behandlas_i`                                                              |
| **`stg_dokumentstatus_motforslag`**         | Counter-proposals                                         | `nummer`, `rubrik`, `partier`, `utskottsforslag_punkt`                                                        |
| **`stg_dokumentstatus_bilaga`**             | Document attachments                                      | `dok_id`, `fil_url`, `filnamn`, `filtyp`                                                                      |
| **`stg_dokumentstatus_dokuppgift_uppgift`** | Document metadata fields                                  | `kod`, `namn`, `text`, `dok_id`                                                                               |

### Intermediate Layer (`int_*`) - Graph Nodes and Edges

| Model                 | Purpose                                 | Key Columns                                                                               |
| --------------------- | --------------------------------------- | ----------------------------------------------------------------------------------------- |
| **`int_node_person`** | Graph node for politicians              | `node_id` = `person:{intressent_id}`, `parti`, `valkrets`, `status`                       |
| **`int_node_dok`**    | Graph node for documents                | `node_id` = `dok:{dok_id}`, `node_typ` (betankande, motion, proposition, protokoll, etc.) |
| **`int_node_event`**  | Graph node for events (votes, speeches) | `node_id` = `event:vot_{votering_id}` or `event:anf_{systemnyckel}`, `event_typ`          |
| **`int_edge`**        | All graph edges (relationships)         | `from_id`, `to_id`, `edge_typ`, `datum`, `payload`                                        |

### Mart Layer (`mart_*`) - Business-Ready Views

| Model                           | Purpose                               | Key Columns                                                                                                            |
| ------------------------------- | ------------------------------------- | ---------------------------------------------------------------------------------------------------------------------- |
| **`mart_betankande_traversal`** | Aggregated stats per committee report | `betankande_dok_id`, `antal_voteringar`, `antal_rostande`, `antal_motioner`, `antal_propositioner`, `antal_forfattare` |
| **`mart_betankande_roster`**    | Detailed vote records per report      | `betankande_dok_id`, `votering_id`, `intressent_id`, `rost`, `parti`, `valkrets`                                       |
| **`mart_betankande_kallor`**    | Source documents feeding into reports | `betankande_dok_id`, `kalla_dok_id`, `kalla_typ`, `forfattare_id`, `referens_typ`                                      |

---

## 2. How Votes Are Structured

### Vote Context - What's Being Voted On

Votes have **rich context** about what's being voted on:

1. **`stg_voteringlista`** contains individual votes:
   - `votering_id` - unique voting event identifier
   - `dok_id` - the **betänkande** (committee report) being voted on
   - `punkt` - the specific point/item within the report
   - `rost` - vote choice: `Ja`, `Nej`, `Avstår`
   - `avser` - what the vote concerns
   - `beteckning` - designation (e.g., "2021/22:FiU1")

2. **`stg_dokumentstatus_utskottsforslag`** provides the **proposal details**:
   - `votering_id` - links to the same voting event
   - `punkt` - point number
   - `rubrik` - heading/title of what's being voted on
   - `forslag` - the actual proposal text
   - `beslutstyp` - decision type
   - `vinnare` - who won the vote
   - `votering_sammanfattning_html` - HTML summary of the vote

### Vote Flow

```
Person → (röstade) → Voting Event → (handlar_om) → Betänkande (Committee Report)
                                                          ↓
                                              utskottsforslag (proposal details)
                                                          ↓
                                              punkt, rubrik, forslag (what's being voted on)
```

---

## 3. Document Graph Structure

### Document Types (from `dok_id` encoding)

The `dok_id` encodes document type in positions 3-4:

- `01` = **betänkande** (committee report)
- `02` = **motion** (parliamentary motion)
- `03` = **proposition** (government bill)
- `04` = **skrivelse** (written communication)
- `05` = **frågeställning** (question)
- `06` = **yttrande** (opinion)
- `07` = **utlåtande** (statement)
- `08` = **utredning** (inquiry)
- `09` = **protokoll** (protocol/minutes)
- `C1-C4` = **kammaraktivitet** (chamber activity)

### Document-to-Document Relationships

From `int_edge`, documents relate via:

| Edge Type     | Meaning                  | Example                  |
| ------------- | ------------------------ | ------------------------ |
| `behandlar`   | Report processes/handles | Betänkande → Motion      |
| `behandlas_i` | Document is processed in | Motion → Betänkande      |
| `följdmotion` | Follow-up motion         | Motion → Original Motion |
| `relaterat`   | Related document         | Any → Any                |
| `refererar`   | References               | Betänkande → Proposition |
| `bilaga`      | Attachment               | Document → Attachment    |

### Reference Types (from `stg_dokumentstatus_referens`)

- `referenstyp` values include: `behandlar`, `behandlas_i`, `följdmotion`, etc.
- Contains: `ref_dok_id`, `ref_dok_typ`, `ref_dok_titel`, `ref_dok_rm`

---

## 4. Politician-to-Action Relationships

### Edge Types Connecting Politicians to Actions

| Edge Type       | From   | To           | Meaning               | Payload                |
| --------------- | ------ | ------------ | --------------------- | ---------------------- |
| `undertecknare` | Person | Document     | Signed/authored       | -                      |
| `fragestallare` | Person | Document     | Asked the question    | -                      |
| `besvaradav`    | Person | Document     | Answered (minister)   | -                      |
| `stalldtill`    | Person | Document     | Question addressed to | -                      |
| `rostade`       | Person | Voting Event | Cast a vote           | `rost` (Ja/Nej/Avstår) |
| `talade`        | Person | Speech Event | Gave a speech         | -                      |

### Speech Relationships

```
Person → (talade) → Speech Event → (handlar_om) → Protocol Document
                                 → (debatterar) → Related Document (interpellation, motion)
```

Key fields in `stg_anforande`:

- `anforandetext` / `anforandetext_clean` - full speech text
- `rel_dok_id` - the document being debated (e.g., interpellation)
- `dok_id` - the protocol document containing the speech
- `kammaraktivitet` - type of activity (interpellationsdebatt, frågestund, etc.)
- `avsnittsrubrik` - section heading (agenda item)

---

## 5. Complete Graph Schema

```
                    ┌─────────────────┐
                    │   int_node_     │
                    │     person      │
                    │ (intressent_id) │
                    └────────┬────────┘
                             │
         ┌───────────────────┼───────────────────┐
         │                   │                   │
    undertecknare       röstade              talade
    fragestallare           │                   │
    besvaradav              │                   │
    stalldtill              │                   │
         │                   │                   │
         ▼                   ▼                   ▼
┌─────────────────┐  ┌─────────────────┐  ┌─────────────────┐
│   int_node_dok  │  │  int_node_event │  │  int_node_event │
│    (dok_id)     │  │   (votering)    │  │   (anförande)   │
│                 │  │                 │  │                 │
│ - betänkande    │  │ votering_id     │  │ systemnyckel    │
│ - motion        │  │                 │  │ kammaraktivitet │
│ - proposition   │  └────────┬────────┘  └────────┬────────┘
│ - protokoll     │           │                    │
│ - etc.          │      handlar_om           handlar_om
└────────┬────────┘           │               debatterar
         │                    │                    │
         │◄───────────────────┴────────────────────┘
         │
    refererar
    behandlar
    relaterat
    följdmotion
         │
         ▼
┌─────────────────┐
│   int_node_dok  │
│  (other docs)   │
└─────────────────┘
```

---

## 6. Key Insights for Your Use Case

### To Find What a Vote Was About:

1. Start with `votering_id` in `stg_voteringlista`
2. Join to `stg_dokumentstatus_utskottsforslag` on `votering_id` to get `rubrik`, `forslag`, `punkt`
3. Join to `stg_dokumentstatus` via `_dlt_root_id` to get the parent betänkande

### To Find All Actions by a Politician:

1. Query `int_edge` where `from_id = 'person:{intressent_id}'`
2. Edge types will show: `undertecknare`, `rostade`, `talade`, etc.
3. `payload` contains vote choice for `rostade` edges

### To Trace a Motion's Journey:

1. Find motion in `int_node_dok` where `node_typ = 'motion'`
2. Follow `behandlas_i` edges to find which betänkande processed it
3. Follow `handlar_om` edges from voting events to see how it was voted on

### To Analyze Speeches:

1. Use `stg_anforande` for full text (`anforandetext_clean` for plain text)
2. `rel_dok_id` tells you what document was being debated
3. `kammaraktivitet` tells you the type of debate (interpellation, question time, etc.)
