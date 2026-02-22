#!/bin/bash
# Build, push, and deploy Docker images to EC2
# Usage: ./scripts/deploy-images.sh [--build-only]
#        PROFILE=my-profile ENVIRONMENT=prod ./scripts/deploy-images.sh

set -e

# Configuration
PROFILE="${PROFILE:-enya-test}"
ENVIRONMENT="${ENVIRONMENT:-dev}"

# Get region and account from profile
AWS_REGION=$(aws configure get region --profile ${PROFILE})
AWS_ACCOUNT=$(aws sts get-caller-identity --profile ${PROFILE} --query Account --output text)
ECR_BASE="${AWS_ACCOUNT}.dkr.ecr.${AWS_REGION}.amazonaws.com/politikerkollen-${ENVIRONMENT}"

echo "=== Deploying to ECR ==="
echo "Profile: ${PROFILE}"
echo "Region: ${AWS_REGION}"
echo "Account: ${AWS_ACCOUNT}"
echo "Environment: ${ENVIRONMENT}"
echo ""

# Login to ECR
echo "Logging in to ECR..."
aws ecr get-login-password --profile ${PROFILE} --region ${AWS_REGION} | docker login --username AWS --password-stdin ${AWS_ACCOUNT}.dkr.ecr.${AWS_REGION}.amazonaws.com

# Build all images
echo ""
echo "Building images..."
docker compose build

if [[ "$1" != "--build-only" ]]; then
  # Tag and push dagster
  echo ""
  echo "Pushing dagster..."
  docker tag politikerkollen/dagster:latest ${ECR_BASE}/dagster:latest
  docker push ${ECR_BASE}/dagster:latest

  # Tag and push ingestion
  echo "Pushing ingestion..."
  docker tag politikerkollen/ingestion:latest ${ECR_BASE}/ingestion:latest
  docker push ${ECR_BASE}/ingestion:latest

  # Tag and push dbt
  echo "Pushing dbt..."
  docker tag politikerkollen/transformations_dbt:latest ${ECR_BASE}/dbt:latest
  docker push ${ECR_BASE}/dbt:latest

  echo ""
  echo "=== All images pushed ==="

  # Find EC2 instance and restart Dagster
  echo ""
  echo "Finding EC2 instance..."
  INSTANCE_ID=$(aws ec2 describe-instances \
    --profile ${PROFILE} \
    --region ${AWS_REGION} \
    --filters "Name=tag:Name,Values=politikerkollen-${ENVIRONMENT}-dagster" "Name=instance-state-name,Values=running" \
    --query 'Reservations[0].Instances[0].InstanceId' \
    --output text)

  if [[ "$INSTANCE_ID" != "None" && -n "$INSTANCE_ID" ]]; then
    echo "Restarting Dagster on ${INSTANCE_ID}..."
    aws ssm send-command \
      --profile ${PROFILE} \
      --region ${AWS_REGION} \
      --instance-ids ${INSTANCE_ID} \
      --document-name "AWS-RunShellScript" \
      --parameters 'commands=["cd /opt/dagster && docker-compose pull && docker-compose up -d"]' \
      --output text > /dev/null

    echo ""
    echo "=== Deploy complete ==="
    echo "Dagster is restarting. Access via SSM tunnel:"
    echo "  aws ssm start-session --target ${INSTANCE_ID} --document-name AWS-StartPortForwardingSession --parameters '{\"portNumber\":[\"3000\"],\"localPortNumber\":[\"3000\"]}' --profile ${PROFILE} --region ${AWS_REGION}"
    echo "  Then open: http://localhost:3000"
  else
    echo "Warning: Could not find running EC2 instance. Manual restart required."
  fi
else
  echo ""
  echo "=== Build complete (--build-only, skipping push) ==="
fi
