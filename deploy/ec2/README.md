# EC2 Deployment (with self-signed TLS)

This stack runs three containers:

- gateway (Nginx): terminates HTTPS and reverse-proxies
- server (Rust likelee-server): API on port 8787, mounted under `/api/*` (and `/webhooks/*`)
- ui (Nginx): serves the Vite-built SPA

## 1) Prepare environment files

Backend (runtime): copy `likelee-server/.env.example` to `likelee-server/.env` and fill values.

Frontend (build-time): copy `deploy/ec2/.env.example` to `deploy/ec2/.env` and fill values.

## 2) Generate a self-signed certificate

Create the certs folder:

```bash
mkdir -p deploy/ec2/certs
```

Create an OpenSSL config for Subject Alternative Names (SAN). Replace example.org with your domain, or set an IP SAN for bare IP access.

`deploy/ec2/certs/openssl-san.cnf`:

```
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
CN = example.org

[ req_ext ]
subjectAltName = @alt_names

[ v3_ca ]
subjectAltName = @alt_names
basicConstraints = CA:FALSE
keyUsage = digitalSignature, keyEncipherment
extendedKeyUsage = serverAuth

[ alt_names ]
DNS.1 = example.org
# For IP address access, add e.g.:
# IP.1 = 203.0.113.10
```

Generate key and cert (valid ~825 days by default). For shorter validity, add `-days 365`.

```bash
openssl req -x509 -nodes -newkey rsa:4096 \
  -keyout deploy/ec2/certs/server.key \
  -out deploy/ec2/certs/server.crt \
  -config deploy/ec2/certs/openssl-san.cnf \
  -sha256 -days 365
```

File permissions (recommended):

```bash
chmod 600 deploy/ec2/certs/server.key
chmod 644 deploy/ec2/certs/server.crt
```

Note: Browsers will show a warning for self-signed certs. You may need to add a security exception (or import the cert into your trust store for your environment).

## 3) Build & run

```bash
cd deploy/ec2
# Build with frontend build-time env
docker compose --env-file ./.env build
# Start
docker compose --env-file ./.env up -d
```

Access the app over HTTPS:

- https://<EC2_PUBLIC_IP>/
- API: https://<EC2_PUBLIC_IP>/api/...

## 4) Logs & troubleshooting

```bash
docker compose logs -f gateway
docker compose logs -f server
docker compose logs -f ui
```

Common issues:

- 502 from gateway → ensure `server` and `ui` are healthy (`docker ps`, `compose logs`).
- Mixed content errors → ensure the frontend uses relative `VITE_API_BASE_URL=/api` (already in `.env.example`).
- TLS handshake or browser warnings → expected for self-signed; confirm cert files are mounted and paths match.

## 5) Optional hardening

- Switch runtime base of `likelee-server` to distroless and add a health endpoint for Nginx `location /health`.
- Use an ALB with a proper certificate (ACM) instead of self-signed, and run gateway on HTTP-only behind ALB.
