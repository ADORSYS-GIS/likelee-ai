#!/usr/bin/env bash
set -euo pipefail

# Stop the Likelee EC2 stack

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
EC2_DIR="$(cd "${SCRIPT_DIR}/.." && pwd)"
cd "${EC2_DIR}"

ENV_FILE="${EC2_DIR}/.env"
COMPOSE_CMD=(docker compose --env-file "${ENV_FILE}")

if [[ ! -f "${ENV_FILE}" ]]; then
  echo "WARN: ${ENV_FILE} not found; proceeding without env file."
  COMPOSE_CMD=(docker compose)
fi

"${COMPOSE_CMD[@]}" down

echo "Stack stopped."
