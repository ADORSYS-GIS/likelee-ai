
# EC2 Deployment (AWS Load Balancer + ACM + Nginx Gateway)

This stack runs three containers:

- gateway (Nginx): reverse-proxies (HTTP behind the AWS Load Balancer)
- server (Rust likelee-server): API on port 8787, mounted under `/api/*` (and `/webhooks/*`)
- ui (Nginx): serves the Vite-built SPA

## Architecture overview

Traffic flow:

1. Client -> AWS Load Balancer (HTTPS :443)
2. Load Balancer terminates TLS using an ACM certificate
3. Load Balancer forwards requests to the EC2 "application gateway" (Nginx) target group
4. Application gateway (Nginx) routes internally:
   - `/api/*` and `/webhooks/*` -> `server` container (Rust, port 8787)
   - everything else -> `ui` container (static SPA)

```mermaid
flowchart TB
  %% Entry
  U[User / Browser] -->|HTTPS 443| DNS[DNS: app.example.com]

  %% Edge / TLS termination
  DNS --> ALB[AWS Application Load Balancer\nListener :443\nACM Certificate]

  %% Optional redirect
  ALB80[ALB Listener :80 (optional)] -->|301 Redirect to HTTPS| ALB

  %% Forwarding to gateway
  ALB -->|Forward all paths /*\n(or rules-based)| TG[Target Group: EC2 App Gateway\nProtocol: HTTP\nPort: 80]
  TG --> EC2[EC2 Instance(s)]

  %% On-instance gateway
  subgraph EC2Stack[EC2: docker compose stack]
    GW[Nginx Application Gateway\nHTTP :80\nInternal routing rules]
    UI[UI Container (Nginx)\nserves SPA]
    API[likelee-server (Rust)\nAPI :8787]
  end

  EC2 --> GW

  %% Gateway routing
  GW -->|/api/*\n/webhooks/*| API
  GW -->|/* (everything else)| UI

  %% Health check
  ALB -.->|Health check HTTP /health (recommended)| GW
```

The EC2 gateway is HTTP-only behind the Load Balancer (no self-signed certs on the instance).

## 1) Prepare environment files

Backend (runtime): copy `likelee-server/.env.example` to `likelee-server/.env` and fill values.

Frontend (build-time): copy `deploy/ec2/.env.example` to `deploy/ec2/.env` and fill values.

## 2) AWS Load Balancer + ACM TLS

### ACM certificate

Create/validate an ACM certificate for your domain (e.g. `app.example.com`).

Attach the ACM certificate to the Load Balancer HTTPS listener on port `443`.

### Listener rules / routing

Configure the Load Balancer to forward requests to the EC2 application gateway:

- **Listener**: HTTPS `:443` (certificate from ACM)
- **Target group**: forwards to EC2 instances running the `gateway` container
- **Health check**: must hit an HTTP endpoint on the gateway (see "Health checks" below)

Routing policy depends on your Load Balancer setup:

- **Single target group** (recommended): forward all paths `/*` to the gateway target group. The gateway then does all path routing.
- **Multiple rules** (optional): you can also route specific paths (e.g. `/api/*`) to the same gateway target group; this is usually redundant since Nginx already routes.

### DNS

Point your domain to the Load Balancer:

- Route 53: `A/AAAA` Alias to the Load Balancer
- Or external DNS: `CNAME` to the Load Balancer DNS name

## 3) Run the stack on EC2

On the EC2 instance, run the containers normally (the gateway is HTTP-only):

```bash
# From repo root
cd deploy/ec2
# Build with frontend build-time env
docker compose --env-file ./.env build
# Start
docker compose --env-file ./.env up -d
```

### Ports / Security Groups

Minimum recommended:

- **Load Balancer Security Group**
  - Inbound: `443` from the internet (and optionally `80` if you do HTTP->HTTPS redirects)
  - Outbound: to EC2 security group on the gateway listener port (commonly `80`)
- **EC2 Security Group**
  - Inbound: gateway HTTP port (commonly `80`) from the Load Balancer security group only

Do not expose the gateway directly to the public internet.

## 4) Health checks

Your Load Balancer target group health check should call a lightweight gateway endpoint over HTTP.

If your Nginx config exposes `/health` (recommended), set:

- **Protocol**: HTTP
- **Path**: `/health`
- **Matcher**: `200`

If `/health` is not configured yet, you can temporarily use `/` (but it’s less robust for distinguishing UI errors).

## 5) Verify

After the target group shows healthy, verify via the public domain:

- `https://<your-domain>/`
- `https://<your-domain>/api/health`

Also verify that the gateway is not publicly reachable (it should only be reachable from the Load Balancer).

## 6) Logs & troubleshooting

```bash
docker compose logs -f gateway
docker compose logs -f server
docker compose logs -f ui
```

Common issues:

- **502/504 from the Load Balancer**
  - Check the target group health status
  - Ensure EC2 security group allows inbound from the Load Balancer security group
  - Check `docker compose logs -f gateway`

- **Target unhealthy**
  - Confirm the health check path exists and returns `200`
  - Confirm the gateway is listening on the expected port

- **Mixed content errors**
  - Ensure the frontend uses relative API base URL (e.g. `VITE_API_BASE_URL=/api`) so the browser stays on `https://...`

- **Wrong route (UI served for API path or vice versa)**
  - Validate the gateway Nginx location rules for `/api/` and `/webhooks/`

## 7) Notes

- TLS is terminated at the Load Balancer via ACM, so you should not generate or mount instance certificates in this deployment.
- Internal routing remains the responsibility of the gateway (Nginx) container.

## 8) Optional hardening

- Ensure the gateway health endpoint does not depend on upstreams (or implement a separate `/healthz` that only checks Nginx).
- Lock down EC2 inbound rules to the Load Balancer security group only.
- Enable access logs on the Load Balancer for auditing and debugging.
