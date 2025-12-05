#!/usr/bin/env bash
set -euo pipefail

# Update EC2 stack to a specific image tag pulled from registry
# Expected env vars:
#   REGISTRY_IMAGE_SERVER
#   REGISTRY_IMAGE_UI
#   IMAGE_TAG

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
EC2_DIR="$(cd "${SCRIPT_DIR}/.." && pwd)"
cd "${EC2_DIR}"

if [[ -z "${REGISTRY_IMAGE_SERVER:-}" || -z "${REGISTRY_IMAGE_UI:-}" || -z "${IMAGE_TAG:-}" ]]; then
  echo "ERROR: REGISTRY_IMAGE_SERVER, REGISTRY_IMAGE_UI, and IMAGE_TAG must be set" >&2
  exit 1
fi

STATE_DIR="${EC2_DIR}/.state"
mkdir -p "${STATE_DIR}"
CUR_TAG_FILE="${STATE_DIR}/current_tag"
PREV_TAG_FILE="${STATE_DIR}/previous_tag"

# Save previous tag
if [[ -f "${CUR_TAG_FILE}" ]]; then
  cp "${CUR_TAG_FILE}" "${PREV_TAG_FILE}"
fi

echo "${IMAGE_TAG}" > "${CUR_TAG_FILE}.pending"

# Pull and deploy using prod override with prebuilt images
export REGISTRY_IMAGE_SERVER
export REGISTRY_IMAGE_UI
export IMAGE_TAG

COMPOSE_BASE="${EC2_DIR}/docker-compose.yml"
COMPOSE_PROD="${EC2_DIR}/docker-compose.prod.yml"

docker compose -f "${COMPOSE_BASE}" -f "${COMPOSE_PROD}" pull

docker compose -f "${COMPOSE_BASE}" -f "${COMPOSE_PROD}" up -d

# Promote pending tag to current on success
mv "${CUR_TAG_FILE}.pending" "${CUR_TAG_FILE}"

echo "Updated stack to tag: ${IMAGE_TAG}"
