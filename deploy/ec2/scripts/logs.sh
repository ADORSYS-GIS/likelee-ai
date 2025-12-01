#!/usr/bin/env bash
set -euo pipefail

# Tail logs from one or all services
# Usage: logs.sh [gateway|server|ui|all] [-n <lines>]

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
EC2_DIR="$(cd "${SCRIPT_DIR}/.." && pwd)"
cd "${EC2_DIR}"

ENV_FILE="${EC2_DIR}/.env"
COMPOSE_CMD=(docker compose --env-file "${ENV_FILE}")

TARGET="${1:-all}"
LINES=200
if [[ "${2:-}" == "-n" && -n "${3:-}" ]]; then
  LINES="$3"
fi

case "$TARGET" in
  gateway|server|ui)
    "${COMPOSE_CMD[@]}" logs -n "$LINES" -f "$TARGET"
    ;;
  all|*)
    "${COMPOSE_CMD[@]}" logs -n "$LINES" -f
    ;;
esac
