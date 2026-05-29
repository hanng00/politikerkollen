#!/usr/bin/env bash
# Build and push ingestion, cognition, and dbt images to ECR (repos: politikerkollen/*, created by SAM).
#
# Usage (from repo root):
#   AWS_PROFILE=enya-test ./scripts/push-pipeline-images.sh
#   ./scripts/push-pipeline-images.sh --profile enya-test
#   ./scripts/push-pipeline-images.sh --profile enya-test --region eu-north-1
#   ./scripts/push-pipeline-images.sh --profile enya-test --push-only   # push existing local tags only
#
# Region must match the SAM stack (where ECR repos exist). Resolution order:
#   AWS_REGION, then --region, then region in orchestration_stepfunctions/samconfig.toml,
#   then `aws configure get region`. If still unset, the script exits with an error (no guess).
# Builds for linux/amd64 to match GitHub Actions / typical Fargate.
#
# If push fails with proxyconnect / i/o timeout: Docker Desktop is using a proxy (often
# 192.168.65.1:3128). Fix Docker Settings → Resources/Proxies, or disable VPN; then re-run.
# Use --push-only to retry pushes without rebuilding (after a successful local build).

set -euo pipefail

ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
cd "$ROOT"

PROFILE="${AWS_PROFILE:-}"
CLI_REGION=""
PUSH_ONLY=0
while [[ "${1:-}" == -* ]]; do
  case "$1" in
    -p|--profile) PROFILE="${2:?}"; shift 2 ;;
    -r|--region) CLI_REGION="${2:?}"; shift 2 ;;
    --push-only) PUSH_ONLY=1; shift ;;
    *) echo "Unknown option: $1" >&2; exit 1 ;;
  esac
done

if [[ -z "$PROFILE" ]]; then
  echo "Set AWS_PROFILE or pass --profile <name>." >&2
  exit 1
fi
export AWS_PROFILE="$PROFILE"

samconfig_region() {
  local f="$ROOT/orchestration_stepfunctions/samconfig.toml"
  [[ -f "$f" ]] || return 1
  grep -E '^[[:space:]]*region[[:space:]]*=' "$f" | head -1 | sed -E 's/^[[:space:]]*region[[:space:]]*=[[:space:]]*"([^"]+)".*/\1/'
}

REGION="${AWS_REGION:-}"
if [[ -z "$REGION" ]]; then
  REGION="$CLI_REGION"
fi
if [[ -z "$REGION" ]]; then
  REGION="$(samconfig_region || true)"
fi
if [[ -z "$REGION" ]]; then
  REGION="$(aws configure get region 2>/dev/null || true)"
fi
if [[ -z "$REGION" ]]; then
  echo "Could not determine AWS region. Set AWS_REGION, pass --region <name>, or add region to orchestration_stepfunctions/samconfig.toml (must match your SAM/ECR region)." >&2
  exit 1
fi

ACCOUNT="$(aws sts get-caller-identity --query Account --output text)"
REGISTRY="${ACCOUNT}.dkr.ecr.${REGION}.amazonaws.com"
PREFIX="politikerkollen"

echo "Profile: $PROFILE  Region: $REGION  Account: $ACCOUNT"

if ! docker info >/dev/null 2>&1; then
  echo "Docker daemon is not reachable. Start Docker Desktop (or the docker service), then retry." >&2
  exit 1
fi

echo "Logging in to ECR..."
aws ecr get-login-password --region "$REGION" | docker login --username AWS --password-stdin "$REGISTRY"

push_with_retries() {
  local tag="$1"
  local attempt=1 max=4 wait=6
  while [[ "$attempt" -le "$max" ]]; do
    if docker push "$tag"; then
      return 0
    fi
    if [[ "$attempt" -lt "$max" ]]; then
      echo "Push failed (attempt $attempt/$max), retrying in ${wait}s…" >&2
      sleep "$wait"
      wait=$((wait + 4))
    fi
    attempt=$((attempt + 1))
  done
  return 1
}

build_push() {
  local name="$1"
  local dockerfile="$2"
  local tag="${REGISTRY}/${PREFIX}/${name}:latest"
  if [[ "$PUSH_ONLY" -eq 1 ]]; then
    echo "==> Push only ${name} -> ${tag}"
    push_with_retries "$tag"
    return
  fi
  echo "==> Building ${name} -> ${tag}"
  docker build --platform linux/amd64 -t "$tag" -f "$dockerfile" .
  push_with_retries "$tag"
}

build_push "ingestion" "ingestion/Dockerfile"
build_push "cognition" "cognition/Dockerfile"
build_push "dbt" "transformations_dbt/Dockerfile"

echo "Done. Verify:"
echo "  aws ecr describe-images --repository-name ${PREFIX}/ingestion --region $REGION --query 'imageDetails[*].imageTags'"
echo "  (repeat for ${PREFIX}/cognition and ${PREFIX}/dbt)"
