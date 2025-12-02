#!/usr/bin/env bash
set -euo pipefail

# Roll back the EC2 stack to a previous (known-good) image tag
# Usage:
#   rollback.sh [<tag>]  # If no tag provided, uses .state/previous_tag

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
EC2_DIR="$(cd "${SCRIPT_DIR}/.." && pwd)"
cd "${EC2_DIR}"

STATE_DIR="${EC2_DIR}/.state"
CUR_TAG_FILE="${STATE_DIR}/current_tag"
PREV_TAG_FILE="${STATE_DIR}/previous_tag"

TAG="${1:-}"
if [[ -z "${TAG}" ]]; then
  if [[ ! -f "${PREV_TAG_FILE}" ]]; then
    echo "ERROR: No previous tag recorded at ${PREV_TAG_FILE}" >&2
    exit 1
  fi
  TAG="$(cat "${PREV_TAG_FILE}")"
fi

if [[ -z "${REGISTRY_IMAGE_SERVER:-}" || -z "${REGISTRY_IMAGE_UI:-}" ]]; then
  echo "ERROR: REGISTRY_IMAGE_SERVER and REGISTRY_IMAGE_UI must be set" >&2
  exit 1
fi

export IMAGE_TAG="${TAG}"

# Pull and redeploy using prod override

docker compose -f docker-compose.yml -f docker-compose.prod.yml pull || true

docker compose -f docker-compose.yml -f docker-compose.prod.yml up -d

echo "Rolled back to tag: ${IMAGE_TAG}"
