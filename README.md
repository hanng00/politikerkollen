# Politikerkollen

## Deployment

### Prerequisites
- AWS CLI configured with credentials
- Docker
- Node.js (for CDK)
- [Session Manager plugin](https://docs.aws.amazon.com/systems-manager/latest/userguide/session-manager-working-with-install-plugin.html)

### Deploy Infrastructure
```bash
cd infra
npm install
npx cdk deploy -c environment=dev --profile enya-test
```

### Set MotherDuck Token
```bash
aws secretsmanager put-secret-value \
  --secret-id politikerkollen/dev/motherduck-token \
  --secret-string '{"token":"YOUR_MOTHERDUCK_TOKEN"}' \
  --profile enya-test
```

### Build & Push Images
```bash
./scripts/deploy-images.sh
```

### Access Dagster UI
Dagster is not publicly exposed. Access via SSM tunnel:
```bash
./scripts/dagster-tunnel.sh
```
Then open http://localhost:3000

### Tear Down
```bash
cd infra
npx cdk destroy -c environment=dev --profile enya-test
```
