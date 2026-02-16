# Graph Relations Registry

Relations scattered across stg sources. This doc maps each relation to graph edges: `from_id → to_id | edge_typ | datum`.

**Convention:** Relations are additive. Each pass adds new relations or refines existing ones. Preserve context.

---

## 1. person → dok | dokintressent (dokumentlista)

**Source:** `stg_dokumentlista`  
**Field:** `dokintressent__intressent` (JSON array)  
**Structure:** `[{ "roll": string, "namn": string, "partibet": string, "intressent_id": string }, ...]`

**Edge:** `person:{intressent_id}` → `dok:{dok_id}` | `edge_typ` | `datum`  
- `edge_typ` = `roll` value (see below)  
- `datum` = `datum` or `publicerad` from dokumentlista (document-level)

### Roll values (discovered)

| roll | Semantic | Dokumentnamn examples |
|------|----------|------------------------|
| `undertecknare` | Signatory / co-signer | Motion, Skriftlig fråga |
| `fragestallare` | Questioner (posed the question) | Svar på skriftlig fråga |
| `besvaradav` | Answerer (minister answering) | Svar på skriftlig fråga, Skriftlig fråga |
| `stalldtill` | Addressed to (minister asked) | Svar på skriftlig fråga, Skriftlig fråga |

### Examples

**Motion (dokumentnamn="Motion")**
```json
[
  {"roll":"undertecknare","namn":"Acko Ankarberg Johansson","partibet":"KD","intressent_id":"0796071663617"},
  {"roll":"undertecknare","namn":"Pia Steensland","partibet":"KD","intressent_id":"0465804601318"}
]
```
→ 5× `person:X` → `dok:dok_id` | `undertecknare` | datum

**Svar på skriftlig fråga**
```json
[
  {"roll":"besvaradav","namn":"Klimat- och miljöminister Annika Strandhäll","partibet":"S","intressent_id":"0530425150220"},
  {"roll":"stalldtill","namn":"Klimat- och miljöminister Annika Strandhäll","partibet":"S","intressent_id":"0530425150220"},
  {"roll":"fragestallare","namn":"Betty Malmberg","partibet":"M","intressent_id":"0547818628111"}
]
```
→ 3 edges: besvaradav, stalldtill, fragestallare

**Skriftlig fråga**
```json
[
  {"roll":"undertecknare","namn":"Ciczie Weidby","partibet":"V","intressent_id":"0776705932527"},
  {"roll":"besvaradav","namn":"Arbetsmarknads- och jämställdhetsminister Eva Nordmark","partibet":"S","intressent_id":"0661583406713"},
  {"roll":"stalldtill","namn":"Arbetsmarknads- och jämställdhetsminister Eva Nordmark","partibet":"S","intressent_id":"0661583406713"}
]
```

### Notes

- Same person can have multiple roles (e.g. besvaradav + stalldtill) → multiple edges.
- `stg_dokumentstatus_intressent` has the same structure, flattened; join via `_dlt_root_id` → `stg_dokumentstatus._dlt_id`.
- Ordning: JSON array order may carry meaning; `stg_dokumentstatus_intressent` has `ordning` column.

---

## 2. person → event | röstade (voteringlista)

**Source:** `stg_voteringlista`  
**Foreign keys:**  
- `intressent_id` → `stg_personlista.intressent_id`  
- `dok_id` → `stg_dokumentlista.dok_id`

**Edge:** `person:{intressent_id}` → `event:vot_{votering_id}` | `röstade` | `datum`  
- `datum` = `systemdatum` (voting timestamp)  
- **Payload:** `rost` (vote choice: Ja, Nej, Avstår)

**Structure:** One row per person per voting; each row = one edge.

### Notes

- `votering_id` identifies the voting event. Event node: `event:vot_{votering_id}`.
- `dok_id` = the betänkande (committee report) being voted on → yields event→dok edge (see below).

---

## 3. event → dok | handlar_om (voteringlista)

**Source:** `stg_voteringlista`  
**Foreign keys:**  
- `votering_id` → identifies event  
- `dok_id` → `stg_dokumentlista.dok_id` (betänkande voted on)

**Edge:** `event:vot_{votering_id}` → `dok:{dok_id}` | `handlar_om` | `datum`  
- `datum` = `systemdatum`

**Structure:** One row per distinct (votering_id, dok_id); typically one dok per votering.

### Notes

- Votering = event node. The document being voted on = dok node. This edge links them.

---

## 3b. person → event | talade (anforande)

**Source:** `stg_anforande`  
**Foreign keys:**
- `intressent_id` → `stg_personlista.intressent_id`
- `dok_id` → `stg_dokumentlista.dok_id` (protocol document)

**Edge:** `person:{intressent_id}` → `event:anf_{systemnyckel}` | `talade` | `datum`  
- `datum` = `systemdatum` (speech timestamp)  
- **Payload:** `anforandetext`, `anforandetext_clean`, `avsnittsrubrik`, `kammaraktivitet`

**Structure:** One row per speech; each speech = one event.

### Notes

- `stg_anforande` provides full speech text (vs truncated in `stg_anforandelista`)
- `anforandetext_clean` = HTML-stripped version for text analysis

---

## 3c. event → dok | handlar_om (anforande)

**Source:** `stg_anforande`  
**Foreign keys:**
- `systemnyckel` → identifies event
- `dok_id` / `dok_id_normalized` → `stg_dokumentlista.dok_id` (protocol document)

**Edge:** `event:anf_{systemnyckel}` → `dok:{dok_id}` | `handlar_om` | `datum`  
- `datum` = `systemdatum`  
- Speech was part of protocol document dok_id.

---

## 3d. event → dok | debatterar (anforande)

**Source:** `stg_anforande`  
**Foreign keys:**
- `systemnyckel` → identifies event
- `rel_dok_id` / `rel_dok_id_normalized` → `stg_dokumentlista.dok_id` (related document being debated)

**Edge:** `event:anf_{systemnyckel}` → `dok:{rel_dok_id}` | `debatterar` | `datum`  
- `datum` = `systemdatum`  
- Speech debates the related document (e.g., interpellation, motion).

### Notes

- `rel_dok_id` links to the document being discussed (e.g., interpellation 2021/22:274)
- `dok_id` links to the protocol document containing the speech
- Both edges are created: `handlar_om` (protocol) and `debatterar` (subject document)

---

## 4. dokumentstatus: join key

All dokumentstatus subtables share the same join pattern:

| Key | Resolves to |
|-----|-------------|
| `_dlt_root_id` | `stg_dokumentstatus._dlt_id` |
| `stg_dokumentstatus.dokument__dok_id` | `dok:{dok_id}` (parent document) |

**Join:** `stg_dokumentstatus ds ON ds._dlt_id = sub._dlt_root_id` → parent `dok_id` = `ds.dokument__dok_id`.

---

## 5. person → dok | dokintressent (dokumentstatus)

**Source:** `stg_dokumentstatus_intressent`  
**Foreign keys:**
- `intressent_id` → `stg_personlista.intressent_id`
- `_dlt_root_id` → `stg_dokumentstatus._dlt_id` → `dokument__dok_id`

**Edge:** `person:{intressent_id}` → `dok:{dokument__dok_id}` | `roll` | datum  
- Same roll semantics as relation 1 (undertecknare, fragestallare, besvaradav, stalldtill).  
- `datum` = `dokument__datum` or `dokument__publicerad` from parent.

**Structure:** One row per person per role per document. Flattened; use `ordning` for order.

---

## 6. dok → dok | refererar (dokumentstatus)

**Source:** `stg_dokumentstatus_referens`  
**Foreign keys:**
- `_dlt_root_id` → parent dok (`dokument__dok_id`)
- `ref_dok_id` → `stg_dokumentlista.dok_id` (referenced document)

**Edge:** `dok:{dokument__dok_id}` → `dok:{ref_dok_id}` | `referenstyp` | datum  
- `datum` = parent `dokument__datum` or `dokument__publicerad`  
- **Payload:** `uppgift`, `ref_dok_typ`, `ref_dok_rm`, `ref_dok_bet`, `ref_dok_titel`, etc.

---

## 7. dok → dok | uppgift (dokumentstatus)

**Source:** `stg_dokumentstatus_dokuppgift_uppgift`  
**Foreign keys:**
- `_dlt_root_id` → parent dok
- `dok_id` → `stg_dokumentlista.dok_id` (related document)

**Edge:** `dok:{dokument__dok_id}` → `dok:{dok_id}` | `uppgift` | `systemdatum`  
- **Payload:** `kod`, `namn`, `text` (metadata about the relationship)

---

## 8. dok → dok | bilaga (dokumentstatus)

**Source:** `stg_dokumentstatus_bilaga`  
**Foreign keys:**
- `_dlt_root_id` → parent dok
- `dok_id` → `stg_dokumentlista.dok_id` (when bilaga is a document; nullable)

**Edge:** `dok:{dokument__dok_id}` → `dok:{dok_id}` | `bilaga` | datum  
- When `dok_id` is populated: attachment is another document.  
- When only `fil_url`: file attachment, no graph node.

---

## 9. dok → event | aktivitet (dokumentstatus)

**Source:** `stg_dokumentstatus_aktivitet`  
**Foreign keys:**
- `_dlt_root_id` → parent dok
- `datum` → event timestamp

**Edge:** `dok:{dokument__dok_id}` → `event:akt_{_dlt_root_id}_{_dlt_list_idx}` | `kod` | `datum`  
- **Payload:** `kod`, `namn`, `status`, `process` (lifecycle: remiss, beslut, etc.)  
- Event node: composite from `_dlt_root_id` + `_dlt_list_idx` (or `ordning`).

---

## 10. dok ↔ event | voteras_i (dokumentstatus)

**Source:** `stg_dokumentstatus_utskottsforslag`  
**Foreign keys:**
- `_dlt_root_id` → parent dok
- `votering_id` → same event space as `stg_voteringlista.votering_id` (`event:vot_{votering_id}`)

**Edge:** `event:vot_{votering_id}` → `dok:{dokument__dok_id}` | `handlar_om` | datum  
- Bridge: same `votering_id` in both voteringlista and utskottsforslag.  
- utskottsforslag = committee proposal point; when voted, links to votering event.  
- **Payload:** `punkt`, `rubrik`, `forslag`, `beslutstyp`, `vinnare`, etc.

---

## 11. dokumentstatus subtables: metadata only (no external graph edges)

| Subtable | Content | Notes |
|----------|---------|------|
| `stg_dokumentstatus_forslag` | `nummer`, `beteckning`, `lydelse`, `intressent` | `intressent` may be string; resolve to person TBD |
| `stg_dokumentstatus_motforslag` | `nummer`, `rubrik`, `partier`, `utskottsforslag_punkt` | Counter-proposal; links to utskottsforslag via punkt (internal) |
| `stg_dokumentstatus_dokumentuppgift_uppgift` | `kod`, `namn`, `text` | Document metadata; no FK |

---

## 12. anforande: FK overview

| Column | References |
|--------|------------|
| intressent_id | stg_personlista.intressent_id |
| dok_id / dok_id_normalized | stg_dokumentlista.dok_id (protocol document) |
| rel_dok_id / rel_dok_id_normalized | stg_dokumentlista.dok_id (document being debated) |
| systemnyckel | event identifier (event:anf_{systemnyckel}) |

### Notes

- `stg_anforande` provides full speech text; `stg_anforandelista` provides truncated text
- Use `stg_anforande` for downstream models requiring full text or `rel_dok_id`

---

## 13. dokumentstatus: FK overview

| Subtable | FK column | References |
|----------|-----------|------------|
| dokintressent | intressent_id | stg_personlista.intressent_id |
| dokintressent | _dlt_root_id | stg_dokumentstatus._dlt_id → dokument__dok_id |
| referens | ref_dok_id | stg_dokumentlista.dok_id |
| referens | _dlt_root_id | stg_dokumentstatus._dlt_id → dokument__dok_id |
| dokuppgift | dok_id | stg_dokumentlista.dok_id |
| dokuppgift | _dlt_root_id | stg_dokumentstatus._dlt_id → dokument__dok_id |
| bilaga | dok_id | stg_dokumentlista.dok_id (when populated) |
| bilaga | _dlt_root_id | stg_dokumentstatus._dlt_id → dokument__dok_id |
| utskottsforslag | votering_id | event:vot_{votering_id} (stg_voteringlista.votering_id) |
| utskottsforslag | _dlt_root_id | stg_dokumentstatus._dlt_id → dokument__dok_id |
