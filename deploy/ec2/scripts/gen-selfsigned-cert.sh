#!/usr/bin/env bash
set -euo pipefail

# Generate a self-signed certificate for the EC2 gateway
# Usage:
#   gen-selfsigned-cert.sh -d example.org [-i 203.0.113.10] [-D 365]
# Output files:
#   ../certs/server.key
#   ../certs/server.crt

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
EC2_DIR="$(cd "${SCRIPT_DIR}/.." && pwd)"
CERTS_DIR="${EC2_DIR}/certs"
OPENSSL_CNF="${CERTS_DIR}/openssl-san.cnf"
DAYS=365
DOMAIN=""
IP=""

while getopts ":d:i:D:" opt; do
  case ${opt} in
    d) DOMAIN="$OPTARG" ;;
    i) IP="$OPTARG" ;;
    D) DAYS="$OPTARG" ;;
    *) echo "Usage: $0 -d <domain> [-i <ip>] [-D <days>]" >&2; exit 2 ;;
  esac
done

if [[ -z "${DOMAIN}" ]]; then
  echo "ERROR: domain is required (-d)." >&2
  exit 2
fi

mkdir -p "${CERTS_DIR}"

cat > "${OPENSSL_CNF}" <<EOF
[ req ]
default_bits       = 4096
distinguished_name = req_distinguished_name
req_extensions     = req_ext
x509_extensions    = v3_ca
prompt             = no

[ req_distinguished_name ]
C  = US
ST = State
L  = City
O  = Likelee
OU = Engineering
CN = ${DOMAIN}

[ req_ext ]
subjectAltName = @alt_names

[ v3_ca ]
subjectAltName = @alt_names
basicConstraints = CA:FALSE
keyUsage = digitalSignature, keyEncipherment
extendedKeyUsage = serverAuth

[ alt_names ]
DNS.1 = ${DOMAIN}
EOF

if [[ -n "${IP}" ]]; then
  echo "IP.1 = ${IP}" >> "${OPENSSL_CNF}"
fi

openssl req -x509 -nodes -newkey rsa:4096 \
  -keyout "${CERTS_DIR}/server.key" \
  -out "${CERTS_DIR}/server.crt" \
  -config "${OPENSSL_CNF}" \
  -sha256 -days "${DAYS}"

chmod 600 "${CERTS_DIR}/server.key"
chmod 644 "${CERTS_DIR}/server.crt"

echo "Self-signed certificate generated:"
echo "  Key:  ${CERTS_DIR}/server.key"
echo "  Cert: ${CERTS_DIR}/server.crt"
