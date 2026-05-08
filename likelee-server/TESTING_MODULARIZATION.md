# Testing Guide: Modularization Verification

This document outlines testing procedures to verify the modularization refactoring has not broken any functionality.

## Overview

The modularization was purely structural:
- Files moved from `src/foo.rs` → `src/foo/mod.rs` (File-to-Dir)
- Related files grouped into domain modules (e.g., `billing/`, `licenses/`, `agencies/`)
- All `crate::` import paths updated accordingly
- No logic, function signatures, or behavior changes

## Automated Tests

### 1. Compilation Check
```bash
cd likelee-server
cargo check
```
**Expected:** Clean compilation with no errors.

### 2. Clippy Lints
```bash
cargo clippy
```
**Expected:** No warnings (previously had ambiguous glob re-export warnings, now fixed).

### 3. Existing Test Suite
```bash
cargo test
```
**Expected:** All existing tests pass.

## Manual API Testing

### Quick Smoke Test
Start the server and verify core endpoints respond correctly:

```bash
# Start the server
cargo run

# In another terminal, test health endpoint
curl http://localhost:3000/health
# Expected: {"status":"ok"}
```

### Route Verification by Domain

#### Agency Routes (`/api/agency/*`)
```bash
# Agency analytics (moved to agencies/analytics.rs)
curl -H "Authorization: Bearer $TOKEN" \
  http://localhost:3000/api/agency/analytics/dashboard

# Agency roster (moved to agencies/roster.rs)
curl -H "Authorization: Bearer $TOKEN" \
  http://localhost:3000/api/agency/roster

# Performance tiers (moved to agencies/performance_tiers.rs)
curl -H "Authorization: Bearer $TOKEN" \
  http://localhost:3000/api/agency/performance-tiers
```

#### Brand Routes (`/api/brand/*`)
```bash
# Brand campaigns (moved to brands/campaigns.rs)
curl -H "Authorization: Bearer $TOKEN" \
  http://localhost:3000/api/brand/campaigns

# Brand storage (moved to brands/storage.rs)
curl -H "Authorization: Bearer $TOKEN" \
  http://localhost:3000/api/brand/storage
```

#### Billing Routes (`/api/billing/*`, `/api/payouts/*`)
```bash
# Billing (moved to billing/mod.rs)
curl -H "Authorization: Bearer $TOKEN" \
  http://localhost:3000/api/billing/subscription

# Payouts (moved to billing/payouts.rs)
curl -H "Authorization: Bearer $TOKEN" \
  http://localhost:3000/api/payouts/balance

# Payment links (moved to billing/payment_links.rs)
curl -H "Authorization: Bearer $TOKEN" \
  http://localhost:3000/api/payment-links
```

#### License Routes (`/api/licenses/*`)
```bash
# License templates (moved to licenses/templates.rs)
curl -H "Authorization: Bearer $TOKEN" \
  http://localhost:3000/api/licenses/templates

# License submissions (moved to licenses/submissions.rs)
curl -H "Authorization: Bearer $TOKEN" \
  http://localhost:3000/api/licenses/submissions

# Active licenses (moved to licenses/active.rs)
curl -H "Authorization: Bearer $TOKEN" \
  http://localhost:3000/api/licenses/active
```

#### Booking Routes (`/api/bookings/*`)
```bash
# Bookings (moved to bookings/mod.rs)
curl -H "Authorization: Bearer $TOKEN" \
  http://localhost:3000/api/bookings

# Booking campaigns (moved to bookings/campaigns.rs)
curl -H "Authorization: Bearer $TOKEN" \
  http://localhost:3000/api/bookings/campaigns

# Booking deliverables (moved to bookings/deliverables.rs)
curl -H "Authorization: Bearer $TOKEN" \
  http://localhost:3000/api/bookings/deliverables

# Book-outs (moved to bookings/book_outs.rs)
curl -H "Authorization: Bearer $TOKEN" \
  http://localhost:3000/api/book-outs
```

#### Creator Routes (`/api/creators/*`, `/api/faces/*`)
```bash
# Creators (moved to creators/mod.rs)
curl -H "Authorization: Bearer $TOKEN" \
  http://localhost:3000/api/creators

# Face profiles (moved to creators/face_profiles.rs)
curl -H "Authorization: Bearer $TOKEN" \
  http://localhost:3000/api/faces/search

# Creator agency connection (moved to creators/agency_connection.rs)
curl -H "Authorization: Bearer $TOKEN" \
  http://localhost:3000/api/creator/agency-connections

# Creator rates (moved to creators/rates.rs)
curl -H "Authorization: Bearer $TOKEN" \
  http://localhost:3000/api/creator/rates

# Talent statements (moved to creators/statements.rs)
curl -H "Authorization: Bearer $TOKEN" \
  http://localhost:3000/api/talent-statements
```

#### Scouting Routes (`/api/scouting/*`, `/api/catalogs/*`, `/api/packages/*`)
```bash
# Scouting (moved to scouting/mod.rs)
curl -H "Authorization: Bearer $TOKEN" \
  http://localhost:3000/api/scouting

# Catalogs (moved to scouting/catalogs.rs)
curl -H "Authorization: Bearer $TOKEN" \
  http://localhost:3000/api/catalogs

# Packages (moved to scouting/packages.rs)
curl -H "Authorization: Bearer $TOKEN" \
  http://localhost:3000/api/packages
```

#### Singleton Routes (File-to-Dir moves)
```bash
# Health (moved to health/mod.rs)
curl http://localhost:3000/health

# Dashboard (moved to dashboard/mod.rs)
curl -H "Authorization: Bearer $TOKEN" \
  http://localhost:3000/api/dashboard

# Invoices (moved to invoices/mod.rs)
curl -H "Authorization: Bearer $TOKEN" \
  http://localhost:3000/api/invoices

# Expenses (moved to expenses/mod.rs)
curl -H "Authorization: Bearer $TOKEN" \
  http://localhost:3000/api/expenses

# Digitals (moved to digitals/mod.rs)
curl -H "Authorization: Bearer $TOKEN" \
  http://localhost:3000/api/digitals

# Notifications (moved to notifications/mod.rs)
curl -H "Authorization: Bearer $TOKEN" \
  http://localhost:3000/api/notifications

# Messages (moved to messages/mod.rs)
curl -H "Authorization: Bearer $TOKEN" \
  http://localhost:3000/api/messages

# Job postings (moved to job_postings/mod.rs)
curl -H "Authorization: Bearer $TOKEN" \
  http://localhost:3000/api/job-postings

# Org storage (moved to org_storage/mod.rs)
curl -H "Authorization: Bearer $TOKEN" \
  http://localhost:3000/api/org-storage

# Admin (moved to admin/mod.rs)
curl -H "Authorization: Bearer $TOKEN" \
  http://localhost:3000/api/admin/users

# KYC (moved to kyc/mod.rs)
curl -H "Authorization: Bearer $TOKEN" \
  http://localhost:3000/api/kyc

# Voice (moved to voice/mod.rs)
curl -H "Authorization: Bearer $TOKEN" \
  http://localhost:3000/api/voice

# Calendly (moved to calendly/mod.rs)
curl -H "Authorization: Bearer $TOKEN" \
  http://localhost:3000/api/calendly

# Liveness (moved to liveness/mod.rs)
curl -H "Authorization: Bearer $TOKEN" \
  http://localhost:3000/api/liveness

# Moderation (moved to moderation/mod.rs)
curl -H "Authorization: Bearer $TOKEN" \
  http://localhost:3000/api/moderation

# Activity (moved to activity/mod.rs)
curl -H "Authorization: Bearer $TOKEN" \
  http://localhost:3000/api/activity

# Entitlements (moved to entitlements/mod.rs)
curl -H "Authorization: Bearer $TOKEN" \
  http://localhost:3000/api/entitlements

# Pricing defaults (moved to pricing_defaults/mod.rs)
curl -H "Authorization: Bearer $TOKEN" \
  http://localhost:3000/api/pricing-defaults
```

## Webhook Verification

Webhook endpoints that were moved:

```bash
# Stripe webhook (moved to billing/payouts.rs)
curl -X POST http://localhost:3000/webhooks/stripe \
  -H "Content-Type: application/json" \
  -d '{"type":"test"}'

# DocuSeal webhooks (moved to licenses/submissions.rs)
curl -X POST http://localhost:3000/webhooks/docuseal \
  -H "Content-Type: application/json" \
  -d '{"event":"test"}'

# Brand campaign webhook (moved to brands/campaigns.rs)
curl -X POST http://localhost:3000/webhooks/brand-campaigns \
  -H "Content-Type: application/json" \
  -d '{"event":"test"}'
```

## Integration Test Checklist

### Critical User Flows

1. **Agency Flow**
   - [ ] Agency dashboard loads
   - [ ] Agency roster displays talents
   - [ ] Analytics dashboard shows metrics
   - [ ] Performance tiers CRUD works
   - [ ] Agency clients management works
   - [ ] Marketplace contracts work

2. **Brand Flow**
   - [ ] Brand campaigns list/create
   - [ ] Brand storage upload/download
   - [ ] License request creation

3. **Billing Flow**
   - [ ] Subscription status check
   - [ ] Payout balance retrieval
   - [ ] Payment link generation
   - [ ] Invoice listing

4. **Creator Flow**
   - [ ] Face profile creation/update
   - [ ] Creator- agency connection
   - [ ] Rate management
   - [ ] Talent statements

5. **Booking Flow**
   - [ ] Booking creation
   - [ ] Deliverable upload
   - [ ] Book-out management

## Regression Testing

### Before/After Comparison

If you have API documentation or Postman collection:

1. Export pre-modularization API responses
2. Run same requests post-modularization
3. Compare responses for identical structure

### Database Operations

Verify database operations still work:

```bash
# Check that queries still execute correctly
# (These should be tested via the API endpoints above)

# Key tables to verify:
# - agencies, agency_clients, agency_roster
# - brands, brand_campaigns
# - bookings, booking_deliverables
# - licenses, license_templates, license_submissions
# - creators, face_profiles
# - billing, payouts, payment_links
```

## Common Issues to Watch For

1. **404 Not Found**: Route not registered (check router.rs)
2. **500 Internal Server Error**: Import path issue or missing re-export
3. **Authorization errors**: Auth middleware still working correctly
4. **Missing data**: Cross-module imports not resolved

## Module Structure Reference

```
src/
├── main.rs, lib.rs, router.rs, config.rs, errors.rs, utils.rs, auth.rs, jobs.rs (flat)
├── agencies/
│   ├── mod.rs, clients.rs, dashboard.rs, roster.rs
│   ├── talent_invites.rs, marketplace_contracts.rs, refs.rs
│   ├── analytics.rs, performance_tiers.rs, campaigns.rs
├── billing/
│   ├── mod.rs, payouts.rs, payment_links.rs
├── bookings/
│   ├── mod.rs, campaigns.rs, deliverables.rs, book_outs.rs
├── brands/
│   ├── mod.rs, campaigns.rs, storage.rs
├── creators/
│   ├── mod.rs, agency_connection.rs, rates.rs, face_profiles.rs, statements.rs
├── licenses/
│   ├── mod.rs, templates.rs, submissions.rs, requests.rs, brand_requests.rs, active.rs
├── scouting/
│   ├── mod.rs, catalogs.rs, packages.rs
└── [other singletons as directories with mod.rs]
```

## Sign-off Checklist

- [ ] `cargo check` passes
- [ ] `cargo clippy` passes
- [ ] `cargo test` passes
- [ ] Server starts without errors
- [ ] Health endpoint responds
- [ ] Key API endpoints respond correctly (sample each domain)
- [ ] No 500 errors in logs during normal operation
- [ ] Webhook endpoints receive requests
- [ ] Database operations work as expected
