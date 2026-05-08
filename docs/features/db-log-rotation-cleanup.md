# Database Log Rotation & Data Cleanup

**Status**: Planned (Future Work)  
**Priority**: Medium  
**Complexity**: Medium  

## Problem Statement

As the Likelee platform grows, database tables accumulate log/event data, notifications, webhook payloads, and transactional records that can grow unboundedly. Without a cleanup mechanism:

- Database storage costs increase linearly
- Query performance degrades on large tables
- Backup/restore times increase
- GDPR/data retention requirements may be violated

## Proposed Solution

Implement a systematic log rotation and data cleanup mechanism using:
1. PostgreSQL functions for each cleanup category
2. `pg_cron` for scheduled daily execution at 3 AM UTC
3. A master cleanup function that orchestrates all sub-cleanup functions
4. A cleanup log table for observability

## Table Analysis

### Category 1: High-Growth Log/Event Tables (Cleanup Candidates)

These tables grow with every action and are primarily for audit/debug/observability.

| Table | Growth Driver | Recommended Retention |
|-------|--------------|----------------------|
| `webhook_events` | Every Stripe/Calendly webhook | 90 days |
| `brand_activity_events` | Every brand action | 180 days |
| `organization_audit_logs` | Every team member action | 365 days |
| `talent_notifications` | Every notification sent | 90 days (read) / 180 days (unread) |
| `brand_notifications` | Every notification sent | 90 days (read) / 180 days (unread) |
| `agency_invoice_reminder_events` | Per invoice reminder cycle | 180 days |
| `calendly_booking_events` | Per booking event | 180 days (completed/canceled) |
| `studio_credit_transactions` | Per credit movement | 365 days |
| `studio_generations` | Per AI generation | 90 days (failed/cancelled) |
| `agency_veriff_sessions` | Per KYC attempt | 365 days |
| `creator_subscription_events` | Per subscription webhook | 365 days |
| `instagram_data_cache` | Per scrape | 30 days stale |
| `storage_assets` (soft-deleted) | Per file upload | 30 days after `deleted_at` |
| `agency_talent_invites` (terminal) | Per invite | 30 days after terminal status |
| `organization_invites` (terminal) | Per invite | 30 days after terminal status |
| `licensing_checkout_sessions` (expired) | Per checkout | 30 days after expiry |

### Category 2: Transactional Tables with Lifecycle (Future Work)

These require more careful analysis before implementing auto-cleanup.

| Table | Terminal Status | Proposed Retention | Notes |
|-------|----------------|-------------------|-------|
| `campaign_offers` | `expired`, `cancelled` | 180 days after terminal | Cascades to deliverables/packages/contracts — brands may need history |
| `brand_campaigns` | `completed`, `archived` | 365 days | Brands may reference for reporting/analytics |
| `brand_license_requests` | `declined` | 90 days | Keep approved for reference |
| `agency_talent_packages` (expired) | Via `expires_at` | 90 days after expiry | Agencies may want to review old packages |
| `agency_catalogs` (expired) | Via `expires_at` | 90 days after expiry | May still be referenced by active licenses |

### Category 3: Core Business Data (No Cleanup)

These tables should never be auto-cleaned:
- `brands`, `agencies`, `creators`, `agency_users` (core identity)
- `agency_talent_relationships` (active contracts)
- `agency_invoices`, `agency_invoice_items` (financial records)
- `agency_balances`, `creator_balances` (financial state)
- `agency_payout_requests`, `creator_payout_requests` (financial records)
- `licensing_payouts`, `campaign_offer_transfers` (financial records)
- `agency_subscriptions`, `licensing_access_grants` (entitlements)
- `studio_wallets` (credit balance)
- All user content: `agency_folders`, `agency_files`, `brand_folders`, `brand_files`

## Implementation Plan

### Step 1: Create Master Cleanup Function

```sql
CREATE OR REPLACE FUNCTION public.db_cleanup_rotation()
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
-- Deletes old records from log/event tables
-- Returns JSON with count of deleted rows per table
-- Inserts summary into db_cleanup_log table
$$;
```

### Step 2: Schedule with pg_cron

```sql
-- Run daily at 3 AM UTC
SELECT cron.schedule(
  'db-cleanup-daily',
  '0 3 * * *',
  $$SELECT public.db_cleanup_rotation()$$
);
```

### Step 3: Add Cleanup Log Table

```sql
CREATE TABLE public.db_cleanup_log (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  run_at timestamptz NOT NULL DEFAULT now(),
  results jsonb NOT NULL,
  duration_ms integer
);
```

### Step 4: Add Indexes for Efficient Cleanup

Partial indexes on `created_at` for tables with high volume:
```sql
CREATE INDEX idx_webhook_events_cleanup
  ON public.webhook_events(created_at)
  WHERE created_at < NOW() - INTERVAL '90 days';
```

## Decisions Made

1. **Campaign offers/brand_campaigns**: NOT included in initial implementation. Too sensitive. Deferred as future work.
2. **pg_cron**: Available on Supabase plan. Will use for scheduling.
3. **studio_credit_transactions**: Hard delete after 365 days (financial ledger, 1-year retention).

## Future Work (Phase 2)

Before implementing cleanup for transactional tables:

1. Add `deleted_at` column to `campaign_offers` and `brand_campaigns` for soft-delete pattern
2. Build admin UI to review/restore soft-deleted records
3. Create reporting/aggregation tables to preserve analytics before deleting transactional records
4. Analyze business impact of deleting completed campaign history

## Risks & Mitigations

| Risk | Mitigation |
|------|-----------|
| Accidental data loss | All queries use time-based filters with generous retention periods |
| FK constraint violations | Delete parent records first; CASCADE handles children |
| Performance impact | Run at 3 AM UTC (low traffic); use batched deletes if needed |
| Financial audit requirements | Keep core financial tables indefinitely; studio_credit_transactions deleted after 365 days |

## Reference

- Existing cleanup: `cleanup_archived_licensing_records()` in migration `0045_licensing_log_rotation_archival.sql`
- Plan file: `.kilo/plans/1778185761463-glowing-nebula.md`
