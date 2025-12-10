#!/usr/bin/env bash
set -euo pipefail
set -x

# Update EC2 stack to a specific image tag pulled from registry
# Expected env vars:
#   REGISTRY_IMAGE_SERVER
#   REGISTRY_IMAGE_UI
#   IMAGE_TAG

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
EC2_DIR="$(cd "${SCRIPT_DIR}/.." && pwd)"
cd "${EC2_DIR}"
echo "[update-images.sh] version=2025-12-05.2 EC2_DIR=${EC2_DIR}"

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


# Diagnostics for docker/compose and choose command
command -v docker || true
docker --version || true
if docker compose version >/dev/null 2>&1; then
  COMPOSE_BIN=(docker compose)
else
  command -v docker-compose || true
  docker-compose version || true || true
  if command -v docker-compose >/dev/null 2>&1; then
    COMPOSE_BIN=(docker-compose)
  else
    echo "ERROR: Neither 'docker compose' nor 'docker-compose' is available" >&2
    exit 1
  fi
fi

# Run compose with absolute files, pin project directory and name
PROJECT_NAME="likelee"

if [ "${COMPOSE_BIN[0]} ${COMPOSE_BIN[1]:-}" = "docker compose" ]; then
  "${COMPOSE_BIN[@]}" \
    --project-directory "${EC2_DIR}" \
    -p "${PROJECT_NAME}" \
    -f "${COMPOSE_BASE}" -f "${COMPOSE_PROD}" pull

  # 
  "${COMPOSE_BIN[@]}" \
    --project-directory "${EC2_DIR}" \
    -p "${PROJECT_NAME}" \
    -f "${COMPOSE_BASE}" -f "${COMPOSE_PROD}" down --remove-orphans || true

  # Fallback hard remove if any old containers still exist with fixed names
  docker rm -f likelee-server likelee-ui likelee-gateway >/dev/null 2>&1 || true

  "${COMPOSE_BIN[@]}" \
    --project-directory "${EC2_DIR}" \
    -p "${PROJECT_NAME}" \
    -f "${COMPOSE_BASE}" -f "${COMPOSE_PROD}" up -d --remove-orphans --force-recreate || {
      echo "[update-images.sh] compose up failed; attempting to resolve name conflicts and retry once" >&2
      docker rm -f likelee-server likelee-ui likelee-gateway >/dev/null 2>&1 || true
      "${COMPOSE_BIN[@]}" \
        --project-directory "${EC2_DIR}" \
        -p "${PROJECT_NAME}" \
        -f "${COMPOSE_BASE}" -f "${COMPOSE_PROD}" up -d --remove-orphans --force-recreate
    }
else
  # docker-compose (v1) fallback
  pushd "${EC2_DIR}" >/dev/null
  "${COMPOSE_BIN[@]}" -p "${PROJECT_NAME}" -f "${COMPOSE_BASE}" -f "${COMPOSE_PROD}" pull
  "${COMPOSE_BIN[@]}" -p "${PROJECT_NAME}" -f "${COMPOSE_BASE}" -f "${COMPOSE_PROD}" down --remove-orphans || true
  docker rm -f likelee-server likelee-ui likelee-gateway >/dev/null 2>&1 || true
  "${COMPOSE_BIN[@]}" -p "${PROJECT_NAME}" -f "${COMPOSE_BASE}" -f "${COMPOSE_PROD}" up -d --remove-orphans --force-recreate
  if [ $? -ne 0 ]; then
    echo "[update-images.sh] compose up failed; attempting to resolve name conflicts and retry once" >&2
    docker rm -f likelee-server likelee-ui likelee-gateway >/dev/null 2>&1 || true
    "${COMPOSE_BIN[@]}" -p "${PROJECT_NAME}" -f "${COMPOSE_BASE}" -f "${COMPOSE_PROD}" up -d --remove-orphans --force-recreate
  fi
  popd >/dev/null
fi

# Promote pending tag to current on success
mv "${CUR_TAG_FILE}.pending" "${CUR_TAG_FILE}"

echo "Updated stack to tag: ${IMAGE_TAG}"
