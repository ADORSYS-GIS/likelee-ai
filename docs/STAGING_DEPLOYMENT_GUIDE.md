# Staging Environment Deployment Guide

This guide walks you through setting up a complete staging environment from scratch, enabling you to test incremental features safely before deploying to production.

## Overview

```
Production: main branch → prod EC2 → prod Supabase database
Staging:   develop branch → staging EC2 → staging Supabase database
```

**Key Benefits:**
- Complete isolation — staging database is separate from production
- Safe testing of new features, migrations, and changes
- No risk to production data or users
- Client can test on staging before approving production deploy

---

## Prerequisites

Before starting, ensure you have:
- AWS account with EC2 access
- GitHub repository with Actions enabled
- Existing production Supabase project
- Domain (optional, for custom staging URL)

---

## Step 1: Create Staging Supabase Project

1. Go to [Supabase Dashboard](https://supabase.com/dashboard)
2. Click **New Project**
3. Configure:
   - **Name**: `likelee-staging`
   - **Database Password**: Generate a strong password (save this!)
   - **Region**: Same as production for easier data sync if needed
4. Wait for project to be provisioned (~2 minutes)

### Get Staging Credentials

From your staging project dashboard, note:
- **Project URL**: `https://<project-ref>.supabase.co`
- **Anon/Public Key**: From Settings → API → Project API keys

### Run Migrations on Staging

Option A — From local machine with Supabase CLI:
```bash
# Link to staging project
supabase link --project-ref <staging-project-ref>

# Push all migrations
supabase db push
```

Option B — Run SQL directly in Supabase dashboard:
1. Go to SQL Editor
2. Copy/paste each migration file from `supabase/migrations/`
3. Execute in order

### Seed Staging Data (Optional)

For realistic testing, seed your staging database:
```bash
# If you have seed scripts
supabase db seed

# Or manually in SQL Editor
```

---

## Step 2: Create Staging EC2 Instance

### 2.1 Launch EC2 Instance

1. Go to AWS EC2 Console → **Launch Instance**
2. Configure:
   - **Name**: `likelee-staging`
   - **AMI**: Ubuntu Server 24.04 LTS (or 22.04)
   - **Instance Type**: `t3.small` (staging can be smaller than prod)
   - **Key Pair**: Create new or use existing (save the `.pem` file!)
   - **Network**: 
     - Create new VPC or use existing
     - Enable **Auto-assign Public IP**
   - **Storage**: 20 GB gp3 (minimum)

3. Click **Launch Instance**

### 2.2 Configure Security Group

Create a security group for staging:

**Inbound Rules:**
| Type | Port | Source | Description |
|------|------|--------|-------------|
| SSH | 22 | Your IP only | For deployment/admin |
| HTTP | 80 | Load Balancer SG (later) | From ALB only |

**Outbound Rules:**
| Type | Port | Destination |
|------|------|-------------|
| All traffic | All | 0.0.0.0/0 |

### 2.3 Get Instance Public IP

After launch, note:
- **Public IPv4 address**: e.g., `54.123.45.67`
- **Public IPv4 DNS**: e.g., `ec2-54-123-45-67.eu-central-1.compute.amazonaws.com`

This is your staging access point.

---

## Step 3: Set Up Load Balancer (Recommended)

For HTTPS access and better reliability, set up an Application Load Balancer.

### 3.1 Request ACM Certificate

1. Go to AWS Certificate Manager → **Request Certificate**
2. Choose **Request a public certificate**
3. Domain: `staging.yourdomain.com` (or similar)
4. Validation: DNS (recommended) or Email
5. Complete validation per AWS instructions

### 3.2 Create Target Group

1. Go to EC2 → **Target Groups** → **Create target group**
2. Configure:
   - **Target type**: Instances
   - **Name**: `likelee-staging-tg`
   - **Protocol**: HTTP
   - **Port**: 80
   - **Health check path**: `/api/health`
   - **Health check interval**: 30 seconds
3. Register your staging EC2 instance
4. Click **Create target group**

### 3.3 Create Application Load Balancer

1. Go to EC2 → **Load Balancers** → **Create Load Balancer**
2. Choose **Application Load Balancer**
3. Configure:
   - **Name**: `likelee-staging-alb`
   - **Scheme**: Internet-facing
   - **IP address type**: IPv4
   - **VPC**: Same as your EC2
   - **Subnets**: Select 2+ subnets in different AZs
4. **Listener - HTTP (port 80)**: Redirect to HTTPS
5. **Listener - HTTPS (port 443)**:
   - Forward to: `likelee-staging-tg`
   - Certificate: Your ACM certificate from Step 3.1
6. Click **Create Load Balancer**

### 3.4 Get Load Balancer DNS

Note the **DNS name** of your ALB:
- e.g., `likelee-staging-alb-123456789.eu-central-1.elb.amazonaws.com`

### 3.5 Configure DNS (Optional)

Create a CNAME record:
- **Name**: `staging`
- **Value**: Load Balancer DNS name
- Results in: `staging.yourdomain.com`

---

## Step 4: Prepare EC2 Instance

### 4.1 SSH into Instance

```bash
chmod 400 your-key.pem
ssh -i your-key.pem ubuntu@<staging-public-ip-or-dns>
```

### 4.2 Install Docker

```bash
# Update system
sudo apt update && sudo apt upgrade -y

# Install Docker
curl -fsSL https://get.docker.com -o get-docker.sh
sudo sh get-docker.sh

# Add user to docker group
sudo usermod -aG docker $USER
newgrp docker

# Verify
docker --version
docker compose version
```

### 4.3 Create Deployment Directory

```bash
sudo mkdir -p /opt/likelee-staging/deploy/ec2
sudo chown -R $USER:$USER /opt/likelee-staging
```

### 4.4 Create Environment File

```bash
nano /opt/likelee-staging/deploy/ec2/.env
```

Paste and configure:

```env
# === STAGING ENVIRONMENT ===
# Frontend build-time variables

# Keycloak (use staging realm if available, or same as prod for testing)
VITE_KEYCLOAK_URL=https://your-keycloak.example.com/auth
VITE_KEYCLOAK_REALM=likelee-staging
VITE_KEYCLOAK_CLIENT_ID=likelee-web-staging

# STAGING Supabase (NOT production!)
VITE_SUPABASE_URL=https://<staging-project-ref>.supabase.co
VITE_SUPABASE_ANON_KEY=<staging-anon-key>

# API base URL
VITE_API_BASE_URL=/api

# Brand trial period
VITE_BRAND_TRIAL_DAYS=14

# AWS (if using Cognito)
VITE_AWS_REGION=eu-central-1
VITE_COGNITO_IDENTITY_POOL_ID=<staging-identity-pool-if-used>
```

Save with `Ctrl+O`, exit with `Ctrl+X`.

### 4.5 Create Backend Environment File

```bash
# If your backend needs server-side env vars, create:
nano /opt/likelee-staging/deploy/ec2/.env.server
```

Include staging database credentials and other secrets.

---

## Step 5: Configure GitHub Secrets

Go to your GitHub repository → Settings → Secrets and variables → Actions

Add these **repository secrets**:

### Staging EC2 Access
| Secret Name | Value | Description |
|-------------|-------|-------------|
| `STAGING_EC2_HOST` | `<staging-ec2-public-ip>` | Staging EC2 public IP or DNS |
| `STAGING_EC2_USER` | `ubuntu` | EC2 username |
| `STAGING_EC2_SSH_KEY` | `<private-key-content>` | Contents of your .pem file |

### Staging Supabase (for frontend build)
| Secret Name | Value |
|-------------|-------|
| `STAGING_VITE_SUPABASE_URL` | `https://<staging-ref>.supabase.co` |
| `STAGING_VITE_SUPABASE_ANON_KEY` | `<staging-anon-key>` |

### Container Registry (optional, for private images)
| Secret Name | Value |
|-------------|-------|
| `STAGING_GHCR_USER` | Your GitHub username |
| `STAGING_GHCR_TOKEN` | GitHub Personal Access Token with `read:packages` |

---

## Step 6: Initial Manual Deployment

Before relying on CI/CD, test deployment manually:

```bash
# On your local machine, from repo root
cd deploy/ec2

# Copy scripts to staging EC2
scp -i your-key.pem -r scripts ubuntu@<staging-ip>:/tmp/

# SSH and run
ssh -i your-key.pem ubuntu@<staging-ip>
sudo mkdir -p /opt/likelee-staging/deploy/ec2
sudo cp -r /tmp/scripts /opt/likelee-staging/deploy/ec2/
cd /opt/likelee-staging/deploy/ec2

# Pull and run images
docker login ghcr.io -u <your-gh-username> -p <your-pat>

export REGISTRY_IMAGE_SERVER=ghcr.io/<org>/likelee-server
export REGISTRY_IMAGE_UI=ghcr.io/<org>/likelee-ui
export IMAGE_TAG=staging-latest
export COMPOSE_PROJECT_NAME=likelee-staging

docker compose -p likelee-staging --env-file ./.env \
  -f docker-compose.yml \
  -f docker-compose.prod.yml up -d
```

Verify:
```bash
curl http://localhost/
curl http://localhost/api/health
```

---

## Step 7: Verify Complete Setup

### Check Endpoints

1. **Load Balancer health**: 
   ```bash
   curl https://staging.yourdomain.com/api/health
   ```

2. **Frontend**: Visit `https://staging.yourdomain.com/`

3. **API**: Visit `https://staging.yourdomain.com/api/health`

### Check Logs

```bash
ssh -i your-key.pem ubuntu@<staging-ip>
cd /opt/likelee-staging/deploy/ec2
docker compose -p likelee-staging logs -f
```

---

## Step 8: Test CI/CD Pipeline

1. Make a small change on `develop` branch
2. Push to GitHub:
   ```bash
   git checkout develop
   git pull
   # make your change
   git add .
   git commit -m "test staging deploy"
   git push origin develop
   ```
3. Monitor GitHub Actions → `Deploy to Staging EC2` workflow
4. Verify the change appears on staging URL

---

## Architecture Diagram

```
┌─────────────────────────────────────────────────────────────────┐
│                         STAGING ENVIRONMENT                      │
├─────────────────────────────────────────────────────────────────┤
│                                                                   │
│   Developer ──push──▶ develop branch ──▶ GitHub Actions          │
│                                              │                    │
│                                              ▼                    │
│                                    Build & Push to GHCR           │
│                                              │                    │
│                                              ▼                    │
│   ┌─────────────────────────────────────────────────────────┐   │
│   │                    AWS Infrastructure                     │   │
│   │                                                           │   │
│   │   User ──HTTPS──▶ ALB ──HTTP──▶ EC2 Staging Instance     │   │
│   │                         │              │                  │   │
│   │                         │              ▼                  │   │
│   │                         │        ┌──────────┐             │   │
│   │                         │        │  Nginx   │             │   │
│   │                         │        │ Gateway  │             │   │
│   │                         │        └────┬─────┘             │   │
│   │                         │             │                    │   │
│   │                         │      ┌──────┴──────┐            │   │
│   │                         │      ▼             ▼            │   │
│   │                         │   ┌──────┐    ┌──────────┐      │   │
│   │                         │   │  UI  │    │  Server  │      │   │
│   │                         │   │(SPA) │    │  (Rust)  │      │   │
│   │                         │   └──────┘    └─────┬────┘      │   │
│   │                         │                      │           │   │
│   └─────────────────────────│──────────────────────│───────────┘   │
│                             │                      │               │
│                             ▼                      ▼               │
│                    ACM Certificate          Staging Supabase       │
│                    (staging.domain)         (separate DB)          │
│                                                                   │
└─────────────────────────────────────────────────────────────────┘
```

---

## Workflow Summary

| Environment | Branch | Database | Deploy Trigger | URL |
|-------------|--------|----------|----------------|-----|
| **Production** | `main` | Prod Supabase | Push to `main` | `app.yourdomain.com` |
| **Staging** | `develop` | Staging Supabase | Push to `develop` | `staging.yourdomain.com` |

---

## Troubleshooting

### Deployment fails
```bash
# Check logs
docker compose -p likelee-staging logs

# Verify env file
cat /opt/likelee-staging/deploy/ec2/.env

# Check container status
docker ps -a
```

### Health check fails
```bash
# Test internally
curl http://localhost/api/health

# Check nginx config
docker compose -p likelee-staging exec gateway cat /etc/nginx/nginx.conf
```

### Cannot connect to Supabase
- Verify staging Supabase URL and keys in `.env`
- Check Supabase project is not paused (free tier pauses after inactivity)
- Verify network connectivity from EC2

### Load Balancer shows unhealthy
- Verify target group health check settings
- Check security group allows traffic from ALB to EC2
- Review ALB access logs

---

## Quick Reference Commands

```bash
# SSH into staging
ssh -i your-key.pem ubuntu@<staging-ip>

# View logs
cd /opt/likelee-staging/deploy/ec2
docker compose -p likelee-staging logs -f

# Restart services
docker compose -p likelee-staging restart

# Pull latest and redeploy
docker compose -p likelee-staging --env-file ./.env \
  -f docker-compose.yml -f docker-compose.prod.yml pull
docker compose -p likelee-staging --env-file ./.env \
  -f docker-compose.yml -f docker-compose.prod.yml up -d

# Stop everything
docker compose -p likelee-staging down
```

---

## Next Steps

1. **Test your workflow**: Make a change on `develop`, push, verify it appears on staging
2. **Share staging URL with your client**: They can test new features before production deploy
3. **Document your release process**: PR from `develop` to `main` = staging to production
4. **Set up database backups**: Enable Supabase backups for staging (automatic on paid plans)

---

## Cost Estimate

| Resource | Type | Est. Monthly Cost |
|----------|------|-------------------|
| EC2 (t3.small) | On-demand | ~$15-20 |
| Application Load Balancer | Standard | ~$20 |
| NAT Gateway (if needed) | Standard | ~$30 |
| Supabase (Staging) | Free tier | $0 |
| **Total** | | **~$35-70/month** |

For cost savings:
- Use Spot instances for staging (can be interrupted)
- Schedule staging to shut down outside work hours
- Skip ALB and use direct EC2 access for internal testing only
