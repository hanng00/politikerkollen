# Politikerkollen infrastructure (CDK)

One naming scheme per AWS account (no `dev` / `prod` path segments in ECR or Secrets Manager). **The profile picks the account**; resources are always under `politikerkollen/…`.

## Stacks

1. **`Politikerkollen-Core`** (default) — VPC (public subnets, **no NAT**), ECR `politikerkollen/{ingestion,dbt,cognition}`, secret `politikerkollen/motherduck-token`.

2. **`Politikerkollen-Dagster`** (optional) — Dagster EC2 + ECR `politikerkollen/dagster`, Postgres secret `politikerkollen/dagster-postgres`.  
   Only when you pass **`-c deployDagster=true`**.

## Deploy

```bash
cd infra
npm install

npx cdk bootstrap   # once per account/region

# Core only (typical for Step Functions + Fargate)
npx cdk deploy --all --profile your-profile

# Include optional Dagster EC2
npx cdk deploy --all --profile your-profile -c deployDagster=true
```

## Outputs (core)

- **VpcId**, **PublicSubnetIds**
- **IngestionRepoUri**, **DbtRepoUri**, **CognitionRepoUri**
- **MotherDuckSecretArn**, **SetMotherDuckToken**

## MotherDuck token

From repo root (same profile as CDK):

```bash
AWS_PROFILE=enya-test MOTHERDUCK_TOKEN='your-token' ./scripts/set-motherduck-token.sh
```

Or use the `SetMotherDuckToken` output from `cdk deploy` with `aws secretsmanager put-secret-value` manually.

## Push images & deploy Step Functions

From repo root: `./scripts/push-pipeline-images.sh`, then `./scripts/sam-deploy-orchestration.sh` (see file headers for env vars).

## Migrating from older `…-dev-…` / `…/dev/…` resources

ECR repos and secret names changed. Either adopt new names in CI/SAM or destroy the old core stack and redeploy; update GitHub secrets and Step Functions image URIs to match new ECR paths.

## Destroy order

If both stacks exist: destroy **Politikerkollen-Dagster** first, then **Politikerkollen-Core**.
