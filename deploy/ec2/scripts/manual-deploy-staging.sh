#!/usr/bin/env bash
# Manual staging deployment script
# Usage: sudo ./manual-deploy-staging.sh [IMAGE_TAG]
# If IMAGE_TAG is not provided, uses the latest staging tag

set -euo pipefail

IMAGE_TAG="${1:-staging-latest}"
DEPLOY_DIR="/opt/likelee-staging/deploy/ec2"

cd "${DEPLOY_DIR}"

echo "=== Manual Staging Deploy ==="
echo "Deploy directory: ${DEPLOY_DIR}"
echo "Image tag: ${IMAGE_TAG}"

# Load .env if present
if [ -f .env ]; then
  echo "Loading .env..."
  set -a; . ./.env; set +a
fi

# GHCR login if credentials are available
if [ -n "${GHCR_USER:-}" ] && [ -n "${GHCR_TOKEN:-}" ]; then
  echo "=== Logging into GHCR ==="
  echo "${GHCR_TOKEN}" | docker login ghcr.io -u "${GHCR_USER}" --password-stdin
elif [ -n "${STAGING_GHCR_USER:-}" ] && [ -n "${STAGING_GHCR_TOKEN:-}" ]; then
  echo "=== Logging into GHCR ==="
  echo "${STAGING_GHCR_TOKEN}" | docker login ghcr.io -u "${STAGING_GHCR_USER}" --password-stdin
else
  echo "WARN: No GHCR credentials found in .env (GHCR_USER/GHCR_TOKEN or STAGING_GHCR_USER/STAGING_GHCR_TOKEN)"
  echo "Images may be private and require authentication."
  echo "To login manually: echo YOUR_TOKEN | docker login ghcr.io -u YOUR_USERNAME --password-stdin"
fi

# Use staging nginx config
cp -f nginx.staging.conf nginx.conf || true

# Set required environment variables
export REGISTRY_IMAGE_SERVER="ghcr.io/adorsys-gis/likelee-server"
export REGISTRY_IMAGE_UI="ghcr.io/adorsys-gis/likelee-ui"
export IMAGE_TAG="${IMAGE_TAG}"
export COMPOSE_PROJECT_NAME="likelee-staging"
export COMPOSE_EXTRA_FILES="docker-compose.staging.yml"

echo "=== Pulling images ==="
docker compose --project-directory "${DEPLOY_DIR}" -p likelee-staging \
  -f docker-compose.yml -f docker-compose.prod.yml -f docker-compose.staging.yml pull

echo "=== Stopping existing containers ==="
docker compose --project-directory "${DEPLOY_DIR}" -p likelee-staging \
  -f docker-compose.yml -f docker-compose.prod.yml -f docker-compose.staging.yml down --remove-orphans || true

# Clean up any orphaned containers
docker rm -f likelee-staging-server likelee-staging-ui likelee-staging-gateway \
  likelee-staging-server-1 likelee-staging-ui-1 likelee-staging-gateway-1 2>/dev/null || true
docker ps -aq --filter "name=likelee-staging" | xargs -r docker rm -f 2>/dev/null || true

echo "=== Starting containers ==="
docker compose --project-directory "${DEPLOY_DIR}" -p likelee-staging \
  -f docker-compose.yml -f docker-compose.prod.yml -f docker-compose.staging.yml up -d --force-recreate

echo "=== Waiting for containers to start ==="
sleep 10

echo "=== Container status ==="
docker ps -a --filter "name=likelee-staging"

echo "=== Health check ==="
curl -sS http://localhost/healthz && echo " - Gateway OK" || echo " - Gateway FAILED"
curl -sS http://localhost/api/health && echo " - API OK" || echo " - API FAILED"

echo "=== Manual deploy complete ==="
echo "Check logs: docker logs likelee-staging-gateway-1"
echo "Check logs: docker logs likelee-staging-server-1"
echo "Check logs: docker logs likelee-staging-ui-1"
