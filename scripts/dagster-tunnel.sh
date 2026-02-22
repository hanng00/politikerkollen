#!/bin/bash
# Open SSM tunnel to Dagster webserver
# Usage: ./scripts/dagster-tunnel.sh
#        PROFILE=my-profile ENVIRONMENT=prod ./scripts/dagster-tunnel.sh

set -e

PROFILE="${PROFILE:-enya-test}"
ENVIRONMENT="${ENVIRONMENT:-dev}"

AWS_REGION=$(aws configure get region --profile ${PROFILE})

# Find EC2 instance
INSTANCE_ID=$(aws ec2 describe-instances \
  --profile ${PROFILE} \
  --region ${AWS_REGION} \
  --filters "Name=tag:Name,Values=politikerkollen-${ENVIRONMENT}-dagster" "Name=instance-state-name,Values=running" \
  --query 'Reservations[0].Instances[0].InstanceId' \
  --output text)

if [[ "$INSTANCE_ID" == "None" || -z "$INSTANCE_ID" ]]; then
  echo "Error: Could not find running EC2 instance"
  exit 1
fi

echo "Opening tunnel to ${INSTANCE_ID}..."
echo "Dagster UI will be available at: http://localhost:3000"
echo ""

aws ssm start-session \
  --target ${INSTANCE_ID} \
  --document-name AWS-StartPortForwardingSession \
  --parameters '{"portNumber":["3000"],"localPortNumber":["3333"]}' \
  --profile ${PROFILE} \
  --region ${AWS_REGION}
