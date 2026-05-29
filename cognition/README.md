# Cognition Module

LLM-based data processing for Politikerkollen. Extracts structured information from political documents and matches promises to parliamentary actions.

## What It Does

The cognition module processes raw political data and extracts structured information using LLMs:

- **Promise Extraction**: Extracts political promises from party manifestos with categorization, specificity assessment, and measurability scoring
- **Source Embedding**: Generates embeddings for parliamentary documents (motions and propositions)
- **Promise Matching**: Matches promises to source documents using hybrid retrieval (vector + keyword search)
- **Alignment Classification**: Classifies whether matched documents support, oppose, or are tangential to promises

## Architecture

```
cognition/
├── src/cognition/
│   ├── cli.py              # Click CLI entry point
│   ├── core/               # Shared infrastructure
│   │   ├── config.py       # Model config, schema names, source tables
│   │   ├── db.py           # MotherDuck connection
│   │   ├── llm.py          # OpenAI client (with Langfuse tracing)
│   │   ├── operations.py   # Batch API operations (extract, embed)
│   │   ├── chunking.py     # Text chunking for large documents
│   │   ├── embedding.py    # Embedding service
│   │   ├── models.py       # Shared Pydantic models
│   │   ├── repository.py   # Generic DB operations
│   │   └── tracing.py      # OpenTelemetry setup
│   ├── promises/           # Promise extraction
│   │   ├── models.py       # ExtractedPromise schema (SINGLE SOURCE OF TRUTH)
│   │   ├── extractor.py    # LLM extraction logic
│   │   ├── commands.py     # CLI: extract-promises
│   │   └── repository.py   # DB operations
│   ├── embeddings/         # Promise embeddings
│   │   ├── embedder.py     # Embedding generation
│   │   ├── commands.py     # CLI: embed-promises
│   │   └── repository.py   # DB operations
│   ├── sources/            # Source document embeddings
│   │   ├── parser.py       # HTML parsing for motions/propositions
│   │   ├── embedder.py     # Chunking + embedding
│   │   ├── commands.py     # CLI: embed-sources
│   │   └── repository.py   # DB operations
│   └── matching/           # Promise-source matching
│       ├── models.py       # PromiseVoteMatch, AlignmentResult schemas
│       ├── classifier.py   # LLM alignment classification
│       ├── commands.py     # CLI: match-promises
│       └── repository.py   # Hybrid retrieval + DB operations
├── Dockerfile
├── pyproject.toml
└── uv.lock
```

### Single Source of Truth

Pydantic models are the **single source of truth** for:

1. **LLM extraction schema** - JSON schema passed to OpenAI structured outputs
2. **Database columns** - Schema derived dynamically from model fields
3. **Validation rules** - Pydantic validators ensure data integrity
4. **Documentation** - Field descriptions used in LLM instructions

Change the Pydantic model, and everything else updates automatically.

## Pipeline

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                           COGNITION PIPELINE                                 │
├─────────────────────────────────────────────────────────────────────────────┤
│                                                                              │
│  ┌──────────────────┐     ┌──────────────────┐     ┌──────────────────┐    │
│  │  stg_valmanifest │     │ int_source_docs  │     │                  │    │
│  │  (party programs)│     │ (mot/prop HTML)  │     │                  │    │
│  └────────┬─────────┘     └────────┬─────────┘     │                  │    │
│           │                        │               │                  │    │
│           ▼                        ▼               │                  │    │
│  ┌──────────────────┐     ┌──────────────────┐     │                  │    │
│  │ extract-promises │     │  embed-sources   │     │                  │    │
│  │   (LLM batch)    │     │  (chunk + embed) │     │                  │    │
│  └────────┬─────────┘     └────────┬─────────┘     │                  │    │
│           │                        │               │                  │    │
│           ▼                        │               │                  │    │
│  ┌──────────────────┐              │               │                  │    │
│  │  embed-promises  │              │               │                  │    │
│  │   (embed text)   │              │               │                  │    │
│  └────────┬─────────┘              │               │                  │    │
│           │                        │               │                  │    │
│           └────────────┬───────────┘               │                  │    │
│                        │                           │                  │    │
│                        ▼                           │                  │    │
│           ┌────────────────────────┐               │                  │    │
│           │    match-promises      │               │                  │    │
│           │  Stage 1: Hybrid Recall│               │                  │    │
│           │  (vector + keyword RRF)│               │                  │    │
│           │                        │               │                  │    │
│           │  Stage 2: Alignment    │               │                  │    │
│           │  Classification (LLM)  │               │                  │    │
│           └────────────┬───────────┘               │                  │    │
│                        │                           │                  │    │
│                        ▼                           │                  │    │
│           ┌────────────────────────┐               │                  │    │
│           │  promise_vote_matches  │               │                  │    │
│           │  (with alignment)      │               │                  │    │
│           └────────────────────────┘               │                  │    │
│                                                                              │
└─────────────────────────────────────────────────────────────────────────────┘
```

### Matching Pipeline Detail

The `match-promises` command runs a two-stage pipeline:

**Stage 1: Hybrid Recall**
- Vector search: cosine similarity on embeddings (threshold ≥ 0.7)
- Keyword search: LIKE matching on promise keywords in chunk text
- Reciprocal Rank Fusion (RRF, k=60) to merge results
- Safety cap: max 50 matches per promise

**Stage 2: Alignment Classification**
- LLM classifies each match as: `supports`, `opposes`, or `tangential`
- Uses OpenAI Batch API (50% cost savings) by default
- Output: alignment, confidence score, Swedish rationale

## Usage

### Local Development

```bash
cd cognition

# Install dependencies
uv sync

# Set environment variables
export MOTHERDUCK_ACCESS_TOKEN="your_token"
export OPENAI_API_KEY="your_key"

# Extract promises (batch mode - 50% savings)
uv run cognition extract-promises --year 2022

# Extract promises (realtime mode - immediate)
uv run cognition extract-promises --year 2022 --realtime

# Embed promises
uv run cognition embed-promises --year 2022

# Embed source documents
uv run cognition embed-sources --riksmote-year 2024

# Match promises to sources (with alignment classification)
uv run cognition match-promises --year 2022

# Match without classification (faster, for testing)
uv run cognition match-promises --year 2022 --skip-classification

# Dry run - estimate costs
uv run cognition match-promises --year 2022 --dry-run
```

### Docker

```bash
# Build
docker compose build cognition

# Run
docker run --rm \
  -e MOTHERDUCK_ACCESS_TOKEN="$MOTHERDUCK_ACCESS_TOKEN" \
  -e OPENAI_API_KEY="$OPENAI_API_KEY" \
  politikerkollen/cognition:latest \
  match-promises --year 2022 --dry-run
```

### Via Dagster

Assets in `orchestration_dagster/defs/cognition/`:

```
stg_valmanifest → valmanifest_promises → promise_embeddings ─┐
                                                              ├→ promise_vote_matches
int_source_documents → source_embeddings ─────────────────────┘
```

## Output Schema

### promise_vote_matches

| Column | Type | Description |
|--------|------|-------------|
| match_id | VARCHAR | UUID primary key |
| promise_id | VARCHAR | FK to valmanifest_promises |
| source_dok_id | VARCHAR | FK to source document |
| similarity_score | DOUBLE | Cosine similarity (0-1) |
| matched_at | TIMESTAMP | When match was computed |
| alignment | VARCHAR | supports / opposes / tangential |
| alignment_confidence | DOUBLE | Classification confidence (0-1) |
| alignment_rationale | VARCHAR | One sentence explanation (Swedish) |

### Accountability Status Values

The downstream mart combines alignment + vote direction:

| Status | Meaning |
|--------|---------|
| `kept_promise` | Document supports promise, party voted Ja |
| `broke_promise` | Document supports promise, party voted Nej |
| `contradicted_promise` | Document opposes promise, party voted Ja |
| `defended_promise` | Document opposes promise, party voted Nej |
| `tangential` | Document is related but doesn't clearly support/oppose |
| `abstained` | Party abstained from voting |
| `unknown` | Missing data or unclassified |

## Models

Centralized in `core/config.py`:

| Key | Model | Purpose |
|-----|-------|---------|
| `chat` | gpt-5.1-codex-mini | Primary chat model |
| `fast` | gpt-5.1-mini | Batch extraction & classification |
| `embedding` | text-embedding-3-small | Embedding generation |

## Cost Estimates

| Task | Tokens | Cost (batch) |
|------|--------|--------------|
| Promise extraction | ~3.7M input | ~$0.50 |
| Promise embedding | ~100K | ~$0.01 |
| Source embedding | ~10M | ~$0.10 |
| Alignment classification | ~1M | ~$0.10 |

Use `--dry-run` to estimate costs before running.

## Extending

To add a new extractor or classifier:

1. Create Pydantic model in the feature's `models.py` with Field descriptions
2. Create extractor/classifier using `extract_structured()` from `core/operations.py`
3. Add CLI command in `commands.py`
4. Add Dagster asset in `orchestration_dagster/defs/cognition/`
5. Add dbt source and staging model
