#!/bin/bash
# Build and push Docker images to ECR
# Usage: ./scripts/deploy-images.sh [--build-only]

set -e

# Configuration
AWS_REGION="${AWS_REGION:-eu-north-1}"
ENVIRONMENT="${ENVIRONMENT:-prod}"

# Get AWS account ID
AWS_ACCOUNT=$(aws sts get-caller-identity --query Account --output text)
ECR_BASE="${AWS_ACCOUNT}.dkr.ecr.${AWS_REGION}.amazonaws.com/politikerkollen-${ENVIRONMENT}"

echo "=== Deploying to ECR ==="
echo "Region: ${AWS_REGION}"
echo "Account: ${AWS_ACCOUNT}"
echo "Environment: ${ENVIRONMENT}"
echo ""

# Login to ECR
echo "Logging in to ECR..."
aws ecr get-login-password --region ${AWS_REGION} | docker login --username AWS --password-stdin ${AWS_ACCOUNT}.dkr.ecr.${AWS_REGION}.amazonaws.com

# Build all images
echo ""
echo "Building images..."
docker compose build

# Tag and push each image
declare -A IMAGES=(
  ["dagster"]="politikerkollen/dagster:latest"
  ["ingestion"]="politikerkollen/ingestion:latest"
  ["dbt"]="politikerkollen/transformations_dbt:latest"
)

if [[ "$1" != "--build-only" ]]; then
  for ecr_name in "${!IMAGES[@]}"; do
    local_image="${IMAGES[$ecr_name]}"
    ecr_uri="${ECR_BASE}/${ecr_name}:latest"
    
    echo ""
    echo "Tagging ${local_image} -> ${ecr_uri}"
    docker tag ${local_image} ${ecr_uri}
    
    echo "Pushing ${ecr_uri}..."
    docker push ${ecr_uri}
  done

  echo ""
  echo "=== All images pushed successfully ==="
  echo ""
  echo "To restart Dagster on EC2, run:"
  echo "  aws ssm start-session --target <INSTANCE_ID>"
  echo "  sudo systemctl restart dagster"
else
  echo ""
  echo "=== Build complete (--build-only, skipping push) ==="
fi
