# Politikerkollen

## Deployment

### Prerequisites
- AWS CLI configured with credentials
- Docker
- Node.js (for CDK)

### Deploy Infrastructure
```bash
cd infra
npm install
npx cdk deploy
```

### Set MotherDuck Token
```bash
aws secretsmanager put-secret-value \
  --secret-id politikerkollen/prod/motherduck-token \
  --secret-string '{"token":"YOUR_MOTHERDUCK_TOKEN"}'
```

### Build & Push Images
```bash
./scripts/deploy-images.sh
```

### Restart Dagster on EC2
```bash
aws ssm start-session --target <INSTANCE_ID>
sudo systemctl restart dagster
```

Access Dagster at `http://<EC2_PUBLIC_IP>:3000`
