# Politikerkollen

Democratic infrastructure for accountability in Swedish politics: political promises indexed against votes, speeches, and documents from Riksdagen.

## Repository layout

| Path | Role |
|------|------|
| `web/` | Next.js app |
| `backend/` | Bun + Lambda API |
| `ingestion/` | Python + dlt → MotherDuck |
| `cognition/` | Python LLM / batch jobs |
| `transformations_dbt/` | dbt on DuckDB / MotherDuck |
| `orchestration_stepfunctions/` | **SAM** — Step Functions + Fargate + admin UI (see its README) |
| `orchestration_dagster/` | Optional Dagster (separate from SAM path) |
| `infra/` | Optional legacy CDK |

## AWS data pipeline (SAM)

Typical flow:

1. **Deploy stack** — from `orchestration_stepfunctions/`: `sam build` then `sam deploy --profile <your-profile>` (uses `samconfig.toml` for stack name / region).
2. **Secrets** — one secret **`politikerkollen/pipeline-secrets`** in Secrets Manager: JSON `{"token":"…","key":"…"}` (MotherDuck + OpenAI). Set in the console or CLI; no helper script in-repo.
3. **Container images** — from **repo root**:  
   `./scripts/push-pipeline-images.sh --profile <profile>`  
   Region is taken from **`AWS_REGION`**, **`--region`**, then **`orchestration_stepfunctions/samconfig.toml`**, then the CLI default — it must match the stack’s region. Optional **`--push-only`**. Pushes `politikerkollen/{ingestion,cognition,dbt}:latest` to ECR.
4. **Operate** — open the stack output **`AdminUrl`** to start runs (no auth today; treat URL as secret). A **daily schedule** (03:00 UTC) runs the full pipeline; details in [`orchestration_stepfunctions/README.md`](orchestration_stepfunctions/README.md).

Optional: `./scripts/sam-deploy-orchestration.sh` wraps deploy from repo root (expects `AWS_PROFILE`).
