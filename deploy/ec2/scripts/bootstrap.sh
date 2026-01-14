#!/usr/bin/env bash
set -euo pipefail

# Bootstrap one-command deployment on EC2
# - Ensures certs exist (generates self-signed if missing and domain provided)
# - Verifies env files
# - Starts the stack
#
# Usage:
#   bootstrap.sh [-d domain] [-i ip] [-D days] [--rebuild]
# Examples:
#   ./scripts/bootstrap.sh -d app.example.com
#   ./scripts/bootstrap.sh --rebuild -d app.example.com -i 203.0.113.10 -D 365

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
EC2_DIR="$(cd "${SCRIPT_DIR}/.." && pwd)"
CERTS_DIR="${EC2_DIR}/certs"
ENV_FILE_UI="${EC2_DIR}/.env"
ENV_FILE_SERVER="${EC2_DIR}/../../likelee-server/.env"
REBUILD=false
DOMAIN=""
IP=""
DAYS="365"

# Parse args
while [[ $# -gt 0 ]]; do
  case "$1" in
    --rebuild) REBUILD=true; shift ;;
    -d) DOMAIN="$2"; shift 2 ;;
    -i) IP="$2"; shift 2 ;;
    -D) DAYS="$2"; shift 2 ;;
    *) echo "Unknown option: $1" >&2; exit 2 ;;
  esac
done

# Basic checks
command -v docker >/dev/null 2>&1 || { echo "ERROR: docker is not installed" >&2; exit 1; }
if ! docker compose version >/dev/null 2>&1; then
  echo "ERROR: docker compose plugin not installed" >&2; exit 1
fi

# Ensure env files exist
if [[ ! -f "${ENV_FILE_UI}" ]]; then
  echo "ERROR: Missing ${ENV_FILE_UI}. Copy deploy/ec2/.env.example to deploy/ec2/.env and fill values." >&2
  exit 1
fi
if [[ ! -f "${ENV_FILE_SERVER}" ]]; then
  echo "ERROR: Missing ${ENV_FILE_SERVER}. Copy likelee-server/.env.example to likelee-server/.env and fill values." >&2
  exit 1
fi

# Generate self-signed certs if missing and domain provided
NEED_CERT=false
if [[ ! -f "${CERTS_DIR}/server.key" || ! -f "${CERTS_DIR}/server.crt" ]]; then
  NEED_CERT=true
fi

if ${NEED_CERT}; then
  if [[ -z "${DOMAIN}" ]]; then
    echo "WARN: No certs found in ${CERTS_DIR} and no -d <domain> provided; skipping cert generation."
    echo "      HTTPS will fail to start unless you add certs manually (deploy/ec2/README.md)."
  else
    echo "Generating self-signed certificate for domain: ${DOMAIN}"
    chmod +x "${SCRIPT_DIR}/gen-selfsigned-cert.sh" || true
    "${SCRIPT_DIR}/gen-selfsigned-cert.sh" -d "${DOMAIN}" ${IP:+-i "$IP"} -D "${DAYS}"
  fi
fi

# Start stack
chmod +x "${SCRIPT_DIR}/up.sh" || true
if ${REBUILD}; then
  "${SCRIPT_DIR}/up.sh" --rebuild
else
  "${SCRIPT_DIR}/up.sh"
fi

echo "Bootstrap complete. Access your app at:"
echo "  https://<EC2_PUBLIC_IP>/ (self-signed; browser warning expected)"
echo "  https://<EC2_PUBLIC_IP>/api/"
