# Orchestration: Step Functions + Fargate (SAM)

Serverless alternative to always-on Dagster: **Step Functions** run **ECS Fargate** tasks (ingestion, dbt, cognition). No separate VPC/CDK stack — the template uses the account **default VPC** (lookup Lambda), creates **ECR** repos `politikerkollen/*`, and one **Secrets Manager** secret for credentials.

## Layout

```
orchestration_stepfunctions/
├── template.yaml              # SAM: ECS, IAM, Step Functions, Scheduler, admin Lambda
├── samconfig.toml             # Default stack name / region (committed)
├── statemachines/
│   ├── ingestion.asl.yaml
│   ├── dbt.asl.yaml
│   ├── cognition.asl.yaml
│   └── full-pipeline.asl.yaml   # Nested: ingestion → dbt → cognition (.sync)
├── vpc_lookup/                # Custom resource: default VPC + subnets
└── src/handler.ts             # Admin UI (Lambda Function URL)
```

## Deploy

```bash
cd orchestration_stepfunctions
npm install
sam build
sam deploy --profile <aws-profile>
```

No VPC or image parameters: ECR URIs and default VPC come from the template. **One secret** after deploy: **`politikerkollen/pipeline-secrets`** — JSON keys **`token`** (MotherDuck) and **`key`** (OpenAI). Populate via AWS Console or `aws secretsmanager put-secret-value`.

**Stack outputs:** `AdminUrl`, state machine ARNs, `PipelineSecretArn`, ECS cluster / task definition ARNs, etc.

## Container images (before or after first deploy)

From **repository root** (not this directory):

```bash
./scripts/push-pipeline-images.sh --profile <profile>
# optional: --region eu-north-1   or   AWS_REGION=eu-north-1
# ./scripts/push-pipeline-images.sh --profile <profile> --push-only   # retry push only
```

Builds **linux/amd64** and pushes **`politikerkollen/ingestion`**, **`cognition`**, **`dbt`** as **`:latest`**. **Region** must match the SAM stack: the script uses, in order, **`AWS_REGION`**, **`--region`**, **`region` in `orchestration_stepfunctions/samconfig.toml`**, then **`aws configure get region`**. If none are set, it exits with an error (no silent wrong default).

**Ingestion container env (optional)** — set on the ECS task definition or locally when debugging:

- **`VOTINGLISTA_INCREMENTAL_SESSIONS`** — when `voteringlista` runs **without** CLI date args, only the newest *N* riksmöten are queried (default **3**). **`VOTINGLISTA_FULL_GRID=1`** restores all sessions (slow).
- **`ANFORANDE_LIST_AFTER_DATE`** — `YYYY-MM-DD` passed as Riksdagen list param **`d`** for the **anforande** parent list, so each session request returns fewer rows (unset = old behaviour).

## Admin UI

Open **`AdminUrl`** from CloudFormation outputs. There is **no authentication** on the Function URL today; anyone with the link can start pipelines and read logs. Add API Gateway + Cognito (or similar) before sharing widely.

You can start ingestion (incremental / backfill modes), dbt (with optional `--select` / full-refresh), cognition, or the **full pipeline**; browse executions, history, and CloudWatch logs from the UI.

## CLI examples

Set ARNs from stack outputs, then:

**Ingestion**

```bash
aws stepfunctions start-execution \
  --state-machine-arn "$INGESTION_ARN" \
  --input '{"mode":"incremental"}'
```

**dbt**

```bash
aws stepfunctions start-execution --state-machine-arn "$DBT_ARN" --input '{}'
```

**Cognition**

```bash
aws stepfunctions start-execution \
  --state-machine-arn "$COGNITION_ARN" \
  --input '{"task":"full-pipeline","year":"2022"}'
```

**Full pipeline**

```bash
aws stepfunctions start-execution \
  --state-machine-arn "$FULL_PIPELINE_ARN" \
  --input '{"ingestion":{"mode":"incremental"},"dbt":{},"cognition":{"task":"full-pipeline","year":"2022","realtime":false}}'
```

## Schedule

**`DailyFullPipelineSchedule`** — EventBridge Scheduler, **03:00 UTC daily**, target = full-pipeline state machine with the same JSON shape as above (incremental ingestion, default dbt, cognition `full-pipeline` / year **2022**). Edit `template.yaml` to change cron, disable (`State: DISABLED`), or adjust the payload.

## GitHub Actions

Workflow **`.github/workflows/containers.yml`** builds and pushes the three images on relevant changes. **`.github/workflows/deploy-orchestration.yml`** runs `sam deploy` on changes under `orchestration_stepfunctions/` (OIDC + `AWS_ROLE_ARN`).

## Exports (optional consumers)

CloudFormation exports task definition ARNs, subnets, and security group for reuse — see **Outputs** / **Exports** in `template.yaml`.

## Dagster

This stack does not require Dagster. You can still run Dagster separately; both can target the same MotherDuck database if configured consistently.
