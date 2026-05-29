#!/usr/bin/env bash
# Deploy orchestration_stepfunctions (SAM). VPC/subnets come from the account default VPC;
# ECR repos and Secrets Manager entries are defined in the template.
#
# Prerequisites: images pushed to politikerkollen/{ingestion,cognition,dbt}:latest
# (see push-pipeline-images.sh). Populate politikerkollen/pipeline-secrets in Secrets Manager after deploy.
#
# Required: AWS_PROFILE (or --profile). Optional: AWS_REGION, STACK_NAME.
#
# Usage:
#   export AWS_PROFILE=enya-test
#   ./scripts/sam-deploy-orchestration.sh

set -euo pipefail

ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
SF="$ROOT/orchestration_stepfunctions"

PROFILE="${AWS_PROFILE:-}"
while [[ "${1:-}" == -* ]]; do
  case "$1" in
    -p|--profile) PROFILE="${2:?}"; shift 2 ;;
    *) echo "Unknown option: $1" >&2; exit 1 ;;
  esac
done

if [[ -z "$PROFILE" ]]; then
  echo "Set AWS_PROFILE or pass --profile <name>." >&2
  exit 1
fi
export AWS_PROFILE="$PROFILE"

REGION="${AWS_REGION:-eu-north-1}"
STACK_NAME="${STACK_NAME:-politikerkollen-orchestration}"

cd "$SF"
npm install
sam build
sam deploy \
  --stack-name "$STACK_NAME" \
  --region "$REGION" \
  --capabilities CAPABILITY_NAMED_IAM \
  --no-confirm-changeset \
  --no-fail-on-empty-changeset

echo "AdminUrl:"
aws cloudformation describe-stacks --stack-name "$STACK_NAME" --region "$REGION" \
  --query "Stacks[0].Outputs[?OutputKey=='AdminUrl'].OutputValue" --output text
