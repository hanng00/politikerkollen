# Politikerkollen Infrastructure

Cost-optimized Dagster on AWS (~$10-15/month).

## Architecture

```
ECS Cluster (Fargate)
├── dagster-webserver (always on)     → UI at :3000
├── dagster-daemon (always on, Spot)  → schedules/sensors
└── task containers (on-demand, Spot) → ingestion (dlt), dbt
         │
         ▼
    MotherDuck (serverless DuckDB)
```

**Cost savings:** Public subnets only (no NAT), Fargate Spot, minimal logging.

## Deploy

```bash
cd infra
bun install

# First time only
bunx cdk bootstrap

# Deploy
bun run deploy:prod        # or deploy:dev
```

## Post-Deploy

```bash
# 1. Set MotherDuck token
aws secretsmanager put-secret-value \
  --secret-id politikerkollen/prod/motherduck-token \
  --secret-string '{"token": "YOUR_TOKEN"}'

# 2. Get Dagster login credentials (auto-generated)
aws secretsmanager get-secret-value \
  --secret-id politikerkollen/prod/dagster-auth \
  --query SecretString --output text | jq .

# 3. Build & push images (from project root)
aws ecr get-login-password --region eu-north-1 | docker login --username AWS --password-stdin <ACCOUNT>.dkr.ecr.eu-north-1.amazonaws.com

docker build -t <ACCOUNT>.dkr.ecr.eu-north-1.amazonaws.com/politikerkollen-prod/ingestion:latest -f ingestion/Dockerfile .
docker build -t <ACCOUNT>.dkr.ecr.eu-north-1.amazonaws.com/politikerkollen-prod/dbt:latest -f transformations_dbt/Dockerfile .
docker build -t <ACCOUNT>.dkr.ecr.eu-north-1.amazonaws.com/politikerkollen-prod/dagster:latest -f orchestration_dagster/Dockerfile .
docker push --all-tags <ACCOUNT>.dkr.ecr.eu-north-1.amazonaws.com/politikerkollen-prod

# 4. Restart services
aws ecs update-service --cluster politikerkollen-prod --service dagster-webserver --force-new-deployment
aws ecs update-service --cluster politikerkollen-prod --service dagster-daemon --force-new-deployment
```

## Tear Down

```bash
bunx cdk destroy --all
```
