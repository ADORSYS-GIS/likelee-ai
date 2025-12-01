#!/usr/bin/env bash
set -euo pipefail

# Start the Likelee EC2 stack with docker-compose
# Usage: up.sh [--rebuild]

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
EC2_DIR="$(cd "${SCRIPT_DIR}/.." && pwd)"
cd "${EC2_DIR}"

ENV_FILE="${EC2_DIR}/.env"
COMPOSE_CMD=(docker compose --env-file "${ENV_FILE}")

if [[ ! -f "${ENV_FILE}" ]]; then
  echo "ERROR: ${ENV_FILE} not found. Copy .env.example to .env and fill values." >&2
  exit 1
fi

if [[ "${1:-}" == "--rebuild" ]]; then
  "${COMPOSE_CMD[@]}" build --no-cache
else
  "${COMPOSE_CMD[@]}" build
fi

"${COMPOSE_CMD[@]}" up -d

echo "Stack is starting. Services: gateway (80/443), server, ui"
