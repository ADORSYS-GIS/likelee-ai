# Cron Job Setup Guide

This document explains how to set up automated cron jobs for the Likelee billing system.

## Overview

The following cron endpoints are available:

1. **Budget Alerts** - `POST /api/cron/budget-alerts`
   - Checks brand spending and sends notifications at 80% and 100% of budget
   - Recommended: Run hourly or daily

2. **Monthly Reset** - `POST /api/cron/reset-monthly-budget-alerts`
   - Resets budget alert flags at the start of each month
   - Required: Run on the 1st of each month

3. **License Expiration Alerts** - `POST /api/cron/license-expiration-alerts`
   - Checks all brands for licenses expiring within 10 days and sends notifications
   - Recommended: Run daily

## Authentication

All cron endpoints require Bearer token authentication via the `Authorization` header:

```bash
Authorization: Bearer YOUR_CRON_SECRET
```

### Setting Up CRON_SECRET

1. Generate a secure random token:
   ```bash
   openssl rand -hex 32
   ```

2. Add to your `.env` file:
   ```bash
   CRON_SECRET=your-generated-token-here
   ```

3. Set the same secret in your cron service configuration.

## Cron Service Configuration

### Option 1: Supabase pg_cron (Recommended for Supabase deployments)

```sql
-- Enable pg_cron extension (if not already enabled)
CREATE EXTENSION IF NOT EXISTS pg_cron;

-- Schedule budget alerts check (every hour)
SELECT cron.schedule(
  'budget-alerts-hourly',
  '0 * * * *',
  $$
  SELECT
    net.http_post(
      url := 'https://your-api-domain.com/api/cron/budget-alerts',
      headers := jsonb_build_object(
        'Content-Type', 'application/json',
        'Authorization', 'Bearer YOUR_CRON_SECRET'
      ),
      body := '{}'::jsonb
    );
  $$
);

-- Schedule monthly reset (1st of each month at midnight UTC)
SELECT cron.schedule(
  'budget-alerts-monthly-reset',
  '0 0 1 * *',
  $$
  SELECT
    net.http_post(
      url := 'https://your-api-domain.com/api/cron/reset-monthly-budget-alerts',
      headers := jsonb_build_object(
        'Content-Type', 'application/json',
        'Authorization', 'Bearer YOUR_CRON_SECRET'
      ),
      body := '{}'::jsonb
    );
  $$
);

-- Schedule license expiration alerts (daily at 9am UTC)
SELECT cron.schedule(
  'license-expiration-alerts-daily',
  '0 9 * * *',
  $$
  SELECT
    net.http_post(
      url := 'https://your-api-domain.com/api/cron/license-expiration-alerts',
      headers := jsonb_build_object(
        'Content-Type', 'application/json',
        'Authorization', 'Bearer YOUR_CRON_SECRET'
      ),
      body := '{}'::jsonb
    );
  $$
);
```

### Option 2: Vercel Cron Jobs

Create `vercel.json` in your project root:

```json
{
  "crons": [
    {
      "path": "/api/cron/budget-alerts",
      "schedule": "0 * * * *"
    },
    {
      "path": "/api/cron/reset-monthly-budget-alerts",
      "schedule": "0 0 1 * *"
    },
    {
      "path": "/api/cron/license-expiration-alerts",
      "schedule": "0 9 * * *"
    }
  ]
}
```

Set the Authorization header in Vercel dashboard:
- Go to Settings > Environment Variables
- Add `CRON_SECRET` with your token

Note: Vercel automatically adds the `Authorization: Bearer ${CRON_SECRET}` header.

### Option 3: External Cron Service (cron-job.org, EasyCron)

**URL:** `https://your-api-domain.com/api/cron/budget-alerts`
**Method:** POST
**Headers:**
```
Authorization: Bearer YOUR_CRON_SECRET
Content-Type: application/json
```
**Schedule:** Every hour (`0 * * * *`)

**For monthly reset:**
**URL:** `https://your-api-domain.com/api/cron/reset-monthly-budget-alerts`
**Schedule:** 1st of each month (`0 0 1 * *`)

**For license expiration alerts:**
**URL:** `https://your-api-domain.com/api/cron/license-expiration-alerts`
**Schedule:** Daily at 9am UTC (`0 9 * * *`)

### Option 4: GitHub Actions

Create `.github/workflows/cron-budget-alerts.yml`:

```yaml
name: Budget Alerts Cron

on:
  schedule:
    # Every hour
    - cron: '0 * * * *'

jobs:
  check-budget-alerts:
    runs-on: ubuntu-latest
    steps:
      - name: Trigger budget alerts
        run: |
          curl -X POST "${{ secrets.API_URL }}/api/cron/budget-alerts" \
            -H "Authorization: Bearer ${{ secrets.CRON_SECRET }}" \
            -H "Content-Type: application/json"
```

Create `.github/workflows/cron-monthly-reset.yml`:

```yaml
name: Monthly Budget Reset

on:
  schedule:
    # 1st of each month at midnight UTC
    - cron: '0 0 1 * *'

jobs:
  reset-budget-alerts:
    runs-on: ubuntu-latest
    steps:
      - name: Trigger monthly reset
        run: |
          curl -X POST "${{ secrets.API_URL }}/api/cron/reset-monthly-budget-alerts" \
            -H "Authorization: Bearer ${{ secrets.CRON_SECRET }}" \
            -H "Content-Type: application/json"
```

Set secrets in GitHub repository settings:
- `API_URL`: Your API base URL
- `CRON_SECRET`: Your cron authentication token

Create `.github/workflows/cron-license-expiration.yml`:

```yaml
name: License Expiration Alerts Cron

on:
  schedule:
    # Daily at 9am UTC
    - cron: '0 9 * * *'

jobs:
  check-license-expiration:
    runs-on: ubuntu-latest
    steps:
      - name: Trigger license expiration alerts
        run: |
          curl -X POST "${{ secrets.API_URL }}/api/cron/license-expiration-alerts" \
            -H "Authorization: Bearer ${{ secrets.CRON_SECRET }}" \
            -H "Content-Type: application/json"
```

## Manual Testing

Test the cron endpoints manually using curl:

```bash
# Test budget alerts
curl -X POST "https://your-api-domain.com/api/cron/budget-alerts" \
  -H "Authorization: Bearer YOUR_CRON_SECRET" \
  -H "Content-Type: application/json"

# Test monthly reset
curl -X POST "https://your-api-domain.com/api/cron/reset-monthly-budget-alerts" \
  -H "Authorization: Bearer YOUR_CRON_SECRET" \
  -H "Content-Type: application/json"

# Test license expiration alerts
curl -X POST "https://your-api-domain.com/api/cron/license-expiration-alerts" \
  -H "Authorization: Bearer YOUR_CRON_SECRET" \
  -H "Content-Type: application/json"
```

Expected response:
```json
{
  "success": true,
  "alerts_sent": 5,
  "brands_checked": 20
}
```

## Security Considerations

1. **Never commit CRON_SECRET** to version control
2. **Use a strong random token** (at least 32 characters)
3. **Rotate secrets periodically** (every 3-6 months)
4. **Monitor cron job logs** for unauthorized access attempts
5. **Restrict by IP** if your cron service supports it (optional additional security)

## Troubleshooting

### 401 Unauthorized
- Check that `CRON_SECRET` is set in your environment
- Verify the Authorization header is correctly formatted: `Bearer <token>`
- Ensure the secret matches between server config and cron service

### 500 Internal Server Error
- Check server logs for detailed error messages
- Verify database connectivity
- Ensure `monthly_budget_limit` column exists in `brands` table

### No alerts being sent
- Verify brands have `budget_alert_enabled = true`
- Check brands have `monthly_budget_limit` set
- Verify campaign offers with `payment_status = 'paid'` or `'released'` exist
