# Likelee AI Database Schema

**Version**: 2.0  
**Last Updated**: 2026-05-06  

This document provides a comprehensive entity-relationship diagram for all tables in the Likelee AI database.

---

## Core Entities

```mermaid
erDiagram
  AGENCIES {
    uuid id PK
    text name
    text slug
    text logo_url
    text email
    text phone
    text website
    text description
    text industry
    jsonb performance_commission_config
    integer default_commission_bps
    integer seat_count
    integer seat_count_approved
    timestamptz subscription_started_at
    timestamptz trial_ends_at
    timestamptz created_at
    timestamptz updated_at
  }

  BRANDS {
    uuid id PK
    text name
    text slug
    text logo_url
    text email
    text phone
    text website
    text description
    text industry
    text status
    timestamptz trial_ends_at
    timestamptz created_at
    timestamptz updated_at
  }

  CREATORS {
    uuid id PK
    text email
    text full_name
    text creator_type
    text city
    text state
    date birthdate
    text bio
    text gender
    text[] content_types
    text[] industries
    text primary_platform
    text instagram_handle
    text tiktok_handle
    text twitter_handle
    text representation_status
    text headshot_url
    text profile_photo_url
    integer base_monthly_price_cents
    text currency_code
    boolean accept_negotiations
    text[] content_restrictions
    text[] brand_exclusivity
    text visibility
    text status
    text kyc_status
    text liveness_status
    timestamptz verified_at
    timestamptz onboarding_completed_at
    timestamptz trial_started_at
    timestamptz created_at
    timestamptz updated_at
  }

  AGENCY_USERS {
    uuid id PK
    uuid agency_id FK
    uuid user_id FK
    text role
    text status
    text performance_tier_name
    timestamptz last_role_changed_at
    timestamptz created_at
  }

  AGENCIES ||--o{ AGENCY_USERS : "has members"
  CREATORS ||--o{ AGENCY_USERS : "user profile"
```

---

## Agency Talent Management

```mermaid
erDiagram
  AGENCIES {
    uuid id PK
  }

  AGENCY_TALENT_RELATIONSHIPS {
    uuid id PK
    uuid agency_id FK
    uuid creator_id FK
    text status
    text performance_tier_name
    integer commission_rate
    timestamptz invited_at
    timestamptz accepted_at
    timestamptz created_at
  }

  AGENCY_TALENT_INVITES {
    uuid id PK
    uuid agency_id FK
    uuid creator_id FK
    text email
    text status
    text token
    timestamptz expires_at
    timestamptz created_at
  }

  AGENCY_TALENT_PACKAGES {
    uuid id PK
    uuid agency_id FK
    uuid creator_id FK
    text name
    text status
    integer total_credits
    integer used_credits
    integer remaining_credits
    integer price_cents
    timestamptz created_at
    timestamptz updated_at
  }

  AGENCY_TALENT_PACKAGE_ITEMS {
    uuid id PK
    uuid package_id FK
    text item_type
    text name
    text description
    integer quantity
    timestamptz created_at
  }

  AGENCIES ||--o{ AGENCY_TALENT_RELATIONSHIPS : "manages"
  CREATORS ||--o{ AGENCY_TALENT_RELATIONSHIPS : "talent"
  AGENCIES ||--o{ AGENCY_TALENT_INVITES : "invites"
  AGENCIES ||--o{ AGENCY_TALENT_PACKAGES : "creates packages"
```

---

## Bookings & Calendar

```mermaid
erDiagram
  AGENCIES {
    uuid id PK
  }

  AGENCY_CLIENTS {
    uuid id PK
    uuid agency_id FK
    text company
    text contact_name
    text email
    text phone
    text status
    text[] tags
    jsonb preferences
    text notes
    date next_follow_up_date
    timestamptz created_at
    timestamptz updated_at
  }

  BOOKINGS {
    uuid id PK
    uuid agency_id FK
    uuid agency_user_id FK
    uuid creator_id FK
    uuid client_id FK
    text title
    text booking_type
    text booking_status
    date date
    boolean all_day
    text call_time
    text wrap_time
    text location
    text location_notes
    integer rate_cents
    text currency
    text rate_type
    text usage_terms
    text usage_duration
    boolean exclusive
    text notes
    timestamptz created_at
    timestamptz updated_at
  }

  BOOKING_FILES {
    uuid id PK
    uuid booking_id FK
    uuid uploaded_by
    text storage_bucket
    text storage_path
    text public_url
    text description
    timestamptz created_at
  }

  BOOKING_DELIVERABLES {
    uuid id PK
    uuid booking_id FK
    uuid creator_id FK
    text title
    text description
    text status
    text storage_path
    text public_url
    timestamptz submitted_at
    timestamptz approved_at
    timestamptz created_at
  }

  BOOKING_NOTIFICATIONS {
    uuid id PK
    uuid booking_id FK
    uuid recipient_id
    text notification_type
    text status
    timestamptz sent_at
    timestamptz created_at
  }

  BOOK_OUTS {
    uuid id PK
    uuid creator_id FK
    date start_date
    date end_date
    text reason
    timestamptz created_at
  }

  TALENT_BOOKING_PREFERENCES {
    uuid id PK
    uuid creator_id FK
    text[] preferred_booking_types
    text[] excluded_booking_types
    integer min_rate_cents
    text availability_notes
    timestamptz updated_at
  }

  AGENCIES ||--o{ AGENCY_CLIENTS : "has clients"
  AGENCIES ||--o{ BOOKINGS : "creates bookings"
  AGENCY_CLIENTS ||--o{ BOOKINGS : "client"
  CREATORS ||--o{ BOOKINGS : "talent"
  BOOKINGS ||--o{ BOOKING_FILES : "has files"
  BOOKINGS ||--o{ BOOKING_DELIVERABLES : "has deliverables"
  BOOKINGS ||--o{ BOOKING_NOTIFICATIONS : "notifications"
  CREATORS ||--o{ BOOK_OUTS : "unavailable periods"
  CREATORS ||--o{ TALENT_BOOKING_PREFERENCES : "preferences"
```

---

## Brand Campaigns & Offers

```mermaid
erDiagram
  BRANDS {
    uuid id PK
  }

  BRAND_CAMPAIGNS {
    uuid id PK
    uuid brand_id FK
    text name
    text description
    text status
    date start_date
    integer duration_days
    integer budget_cents
    timestamptz completed_at
    timestamptz created_at
    timestamptz updated_at
  }

  BRAND_ACTIVITY_EVENTS {
    uuid id PK
    uuid brand_id FK
    uuid campaign_id FK
    text type
    text actor_type
    text actor_name
    text event_type
    text description
    text subject_table
    uuid subject_id
    text title
    text subtitle
    timestamptz created_at
  }

  CAMPAIGN_OFFERS {
    uuid id PK
    uuid brand_id FK
    uuid brand_campaign_id FK
    text status
    text payment_status
    text escrow_status
    text target_type
    uuid target_agency_id FK
    uuid target_creator_id FK
    integer budget_cents
    integer platform_fee_cents
    integer net_amount_cents
    integer commission_rate
    timestamptz contract_signed_at
    timestamptz paid_at
    timestamptz created_at
    timestamptz updated_at
  }

  CAMPAIGN_OFFER_CONTRACTS {
    uuid id PK
    uuid offer_id FK
    text docuseal_submission_id
    text status
    text signed_document_url
    timestamptz created_at
    timestamptz updated_at
  }

  CAMPAIGN_OFFER_DELIVERABLES {
    uuid id PK
    uuid offer_id FK
    uuid creator_id FK
    text title
    text description
    text status
    text storage_path
    text public_url
    timestamptz submitted_at
    timestamptz approved_at
    timestamptz created_at
  }

  CAMPAIGN_OFFER_TRANSFERS {
    uuid id PK
    uuid offer_id FK
    text recipient_type
    uuid recipient_id
    integer amount_cents
    text currency
    text status
    text failure_reason
    integer retry_count
    timestamptz retried_at
    timestamptz created_at
  }

  OFFER_TALENT_ASSIGNMENTS {
    uuid id PK
    uuid offer_id FK
    uuid creator_id FK
    integer gross_cents
    timestamptz created_at
  }

  CAMPAIGN_OFFER_PACKAGES {
    uuid id PK
    uuid offer_id FK
    uuid package_id FK
    text status
    timestamptz created_at
  }

  BRANDS ||--o{ BRAND_CAMPAIGNS : "owns"
  BRAND_CAMPAIGNS ||--o{ BRAND_ACTIVITY_EVENTS : "events"
  BRAND_CAMPAIGNS ||--o{ CAMPAIGN_OFFERS : "has offers"
  CAMPAIGN_OFFERS ||--o{ CAMPAIGN_OFFER_CONTRACTS : "contracts"
  CAMPAIGN_OFFERS ||--o{ CAMPAIGN_OFFER_DELIVERABLES : "deliverables"
  CAMPAIGN_OFFERS ||--o{ CAMPAIGN_OFFER_TRANSFERS : "transfers"
  CAMPAIGN_OFFERS ||--o{ OFFER_TALENT_ASSIGNMENTS : "assigned talent"
  CAMPAIGN_OFFERS ||--o{ CAMPAIGN_OFFER_PACKAGES : "linked packages"
```

---

## Licensing & Packages

```mermaid
erDiagram
  AGENCIES {
    uuid id PK
  }

  CREATORS {
    uuid id PK
  }

  BRANDS {
    uuid id PK
  }

  LICENSING_REQUESTS {
    uuid id PK
    uuid brand_id FK
    uuid agency_id FK
    uuid creator_id FK
    text context_type
    uuid campaign_offer_id FK
    text status
    integer amount_cents
    integer platform_fee_cents
    integer net_amount_cents
    timestamptz created_at
    timestamptz updated_at
  }

  LICENSE_SUBMISSIONS {
    bigint id PK
    uuid agency_id FK
    uuid creator_id FK
    uuid talent_id FK
    uuid brand_request_id FK
    text status
    timestamptz created_at
  }

  LICENSE_TEMPLATES {
    uuid id PK
    uuid agency_id FK
    text name
    text content
    text docuseal_template_id
    timestamptz created_at
  }

  LICENSING_PAYOUTS {
    uuid id PK
    uuid licensing_request_id FK
    uuid recipient_id
    text recipient_type
    integer amount_cents
    text status
    text stripe_transfer_id
    timestamptz created_at
  }

  LICENSING_ACCESS_GRANTS {
    uuid id PK
    uuid licensing_request_id FK
    uuid brand_id FK
    text access_type
    timestamptz expires_at
    timestamptz created_at
  }

  AGENCY_TALENT_PACKAGES {
    uuid id PK
    uuid agency_id FK
    uuid creator_id FK
    text name
    text status
    integer total_credits
    integer remaining_credits
    integer price_cents
    timestamptz expires_at
    timestamptz created_at
  }

  LICENSING_REQUESTS ||--o{ LICENSING_PAYOUTS : "payouts"
  LICENSING_REQUESTS ||--o{ LICENSING_ACCESS_GRANTS : "grants access"
  AGENCIES ||--o{ LICENSE_TEMPLATES : "templates"
```

---

## Messaging & Connections

```mermaid
erDiagram
  AGENCIES {
    uuid id PK
  }

  BRANDS {
    uuid id PK
  }

  CREATORS {
    uuid id PK
  }

  CONVERSATIONS {
    uuid id PK
    uuid agency_id FK
    uuid creator_id FK
    timestamptz created_at
    timestamptz updated_at
  }

  MESSAGES {
    uuid id PK
    uuid conversation_id FK
    uuid sender_id
    text content
    boolean is_read
    timestamptz created_at
  }

  BRAND_AGENCY_CONNECTIONS {
    uuid id PK
    uuid brand_id FK
    uuid agency_id FK
    text status
    timestamptz created_at
    timestamptz updated_at
  }

  BRAND_AGENCY_CONNECTION_REQUESTS {
    uuid id PK
    uuid brand_id FK
    uuid agency_id FK
    text status
    text message
    timestamptz created_at
  }

  BRAND_CREATOR_CONNECTIONS {
    uuid id PK
    uuid brand_id FK
    uuid creator_id FK
    text status
    timestamptz created_at
    timestamptz updated_at
  }

  BRAND_CREATOR_CONNECTION_REQUESTS {
    uuid id PK
    uuid brand_id FK
    uuid creator_id FK
    text status
    text message
    timestamptz created_at
  }

  AGENCIES ||--o{ CONVERSATIONS : "conversations"
  CREATORS ||--o{ CONVERSATIONS : "conversations"
  CONVERSATIONS ||--o{ MESSAGES : "messages"
  BRANDS ||--o{ BRAND_AGENCY_CONNECTIONS : "connections"
  AGENCIES ||--o{ BRAND_AGENCY_CONNECTIONS : "connections"
  BRANDS ||--o{ BRAND_CREATOR_CONNECTIONS : "connections"
  CREATORS ||--o{ BRAND_CREATOR_CONNECTIONS : "connections"
```

---

## Studio & AI Generation

```mermaid
erDiagram
  CREATORS {
    uuid id PK
  }

  STUDIO_WALLETS {
    uuid id PK
    uuid creator_id FK
    integer balance_credits
    integer total_purchased_credits
    integer total_used_credits
    text current_plan
    timestamptz created_at
    timestamptz updated_at
  }

  STUDIO_GENERATIONS {
    uuid id PK
    uuid creator_id FK
    text provider
    text model_id
    text status
    text prompt
    text negative_prompt
    text result_url
    text error_message
    integer credits_used
    jsonb metadata
    timestamptz created_at
    timestamptz completed_at
  }

  STUDIO_CREDIT_TRANSACTIONS {
    uuid id PK
    uuid wallet_id FK
    text transaction_type
    integer amount
    integer balance_after
    text description
    uuid reference_id
    timestamptz created_at
  }

  STUDIO_PRICING_TIERS {
    uuid id PK
    text name
    integer credits
    integer price_cents
    text stripe_price_id
    timestamptz created_at
  }

  CREATORS ||--o| STUDIO_WALLETS : "has wallet"
  CREATORS ||--o{ STUDIO_GENERATIONS : "generations"
  STUDIO_WALLETS ||--o{ STUDIO_CREDIT_TRANSACTIONS : "transactions"
```

---

## Storage & Assets

```mermaid
erDiagram
  AGENCIES {
    uuid id PK
  }

  BRANDS {
    uuid id PK
  }

  CREATORS {
    uuid id PK
  }

  STORAGE_ASSETS {
    uuid id PK
    text owner_type
    uuid owner_id FK
    text asset_type
    text context
    text storage_bucket
    text storage_path
    text public_url
    bigint size_bytes
    text mime_type
    text sha256
    uuid uploaded_by
    bigint quota_bytes_attribution
    timestamptz created_at
    timestamptz deleted_at
  }

  AGENCY_FILES {
    uuid id PK
    uuid agency_id FK
    uuid folder_id FK
    text storage_bucket
    text storage_path
    text filename
    bigint size_bytes
    timestamptz created_at
  }

  AGENCY_FOLDERS {
    uuid id PK
    uuid agency_id FK
    uuid parent_id FK
    text name
    timestamptz created_at
  }

  BRAND_FILES {
    uuid id PK
    uuid brand_id FK
    uuid folder_id FK
    text storage_bucket
    text storage_path
    text filename
    bigint size_bytes
    timestamptz created_at
  }

  BRAND_FOLDERS {
    uuid id PK
    uuid brand_id FK
    uuid parent_id FK
    text name
    timestamptz created_at
  }

  REFERENCE_IMAGES {
    uuid id PK
    uuid creator_id FK
    text section_id
    text storage_bucket
    text storage_path
    text public_url
    integer width
    integer height
    bigint size_bytes
    text mime_type
    text sha256
    text moderation_status
    timestamptz created_at
  }

  TALENT_PORTFOLIO_ITEMS {
    uuid id PK
    uuid creator_id FK
    integer sort_order
    text storage_bucket
    text storage_path
    text public_url
    boolean is_showcase
    timestamptz created_at
  }

  AGENCIES ||--o{ AGENCY_FILES : "files"
  AGENCIES ||--o{ AGENCY_FOLDERS : "folders"
  BRANDS ||--o{ BRAND_FILES : "files"
  BRANDS ||--o{ BRAND_FOLDERS : "folders"
  CREATORS ||--o{ REFERENCE_IMAGES : "reference images"
  CREATORS ||--o{ TALENT_PORTFOLIO_ITEMS : "portfolio"
```

---

## Voice Assets

```mermaid
erDiagram
  CREATORS {
    uuid id PK
  }

  BRANDS {
    uuid id PK
  }

  VOICE_RECORDINGS {
    uuid id PK
    uuid creator_id FK
    text storage_bucket
    text storage_path
    text public_url
    integer duration_sec
    text mime_type
    text emotion_tag
    boolean accessible
    timestamptz created_at
  }

  VOICE_MODELS {
    uuid id PK
    uuid creator_id FK
    text provider
    text provider_voice_id
    text status
    uuid source_recording_id FK
    jsonb metadata
    timestamptz created_at
  }

  BRAND_VOICE_FOLDERS {
    uuid id PK
    uuid brand_id FK
    uuid creator_id FK
    text name
    timestamptz created_at
  }

  BRAND_VOICE_ASSETS {
    uuid id PK
    uuid folder_id FK
    text asset_type
    uuid recording_id FK
    uuid model_id FK
    text storage_bucket
    text storage_path
    timestamptz created_at
  }

  CREATORS ||--o{ VOICE_RECORDINGS : "recordings"
  CREATORS ||--o{ VOICE_MODELS : "voice models"
  BRANDS ||--o{ BRAND_VOICE_FOLDERS : "voice folders"
  BRAND_VOICE_FOLDERS ||--o{ BRAND_VOICE_ASSETS : "assets"
  VOICE_RECORDINGS ||--o{ BRAND_VOICE_ASSETS : "recording"
  VOICE_MODELS ||--o{ BRAND_VOICE_ASSETS : "model"
```

---

## Invoicing & Payments

```mermaid
erDiagram
  AGENCIES {
    uuid id PK
  }

  AGENCY_CLIENTS {
    uuid id PK
  }

  BOOKINGS {
    uuid id PK
  }

  AGENCY_INVOICES {
    uuid id PK
    uuid agency_id FK
    uuid client_id FK
    uuid booking_id FK
    text invoice_number
    text status
    date invoice_date
    date due_date
    integer subtotal_cents
    integer expenses_cents
    integer tax_cents
    integer total_cents
    integer agency_fee_cents
    integer talent_net_cents
    text stripe_invoice_id
    text stripe_payment_intent_id
    timestamptz created_at
    timestamptz updated_at
  }

  AGENCY_INVOICE_ITEMS {
    uuid id PK
    uuid invoice_id FK
    integer sort_order
    text description
    uuid talent_id FK
    date date_of_service
    numeric quantity
    integer unit_price_cents
    integer line_total_cents
    timestamptz created_at
  }

  AGENCY_INVOICE_EXPENSES {
    uuid id PK
    uuid invoice_id FK
    integer sort_order
    text description
    integer amount_cents
    boolean taxable
    timestamptz created_at
  }

  AGENCY_INVOICE_COUNTERS {
    uuid agency_id PK
    integer counter
    timestamptz updated_at
  }

  AGENCY_INVOICE_REMINDER_SETTINGS {
    uuid id PK
    uuid agency_id FK
    boolean enabled
    integer days_before_due
    integer days_after_overdue
    timestamptz updated_at
  }

  PAYMENTS {
    uuid id PK
    uuid invoice_id FK
    text payment_method
    text status
    integer amount_cents
    text stripe_payment_intent_id
    timestamptz created_at
  }

  AGENCIES ||--o{ AGENCY_INVOICES : "invoices"
  AGENCY_CLIENTS ||--o{ AGENCY_INVOICES : "client"
  BOOKINGS ||--o{ AGENCY_INVOICES : "booking"
  AGENCY_INVOICES ||--o{ AGENCY_INVOICE_ITEMS : "items"
  AGENCY_INVOICES ||--o{ AGENCY_INVOICE_EXPENSES : "expenses"
  AGENCY_INVOICES ||--o{ PAYMENTS : "payments"
```

---

## Payouts & Balances

```mermaid
erDiagram
  AGENCIES {
    uuid id PK
  }

  CREATORS {
    uuid id PK
  }

  AGENCY_BALANCES {
    uuid agency_id PK
    integer available_cents
    integer pending_cents
    integer total_earned_cents
    integer total_paid_cents
    timestamptz updated_at
  }

  CREATOR_BALANCES {
    uuid creator_id PK
    integer available_cents
    integer pending_cents
    integer total_earned_cents
    integer total_paid_cents
    timestamptz updated_at
  }

  AGENCY_PAYOUT_REQUESTS {
    uuid id PK
    uuid agency_id FK
    integer amount_cents
    text status
    text stripe_transfer_id
    timestamptz requested_at
    timestamptz processed_at
  }

  CREATOR_PAYOUT_REQUESTS {
    uuid id PK
    uuid creator_id FK
    integer amount_cents
    text status
    text stripe_transfer_id
    timestamptz requested_at
    timestamptz processed_at
  }

  AGENCIES ||--o| AGENCY_BALANCES : "balance"
  CREATORS ||--o| CREATOR_BALANCES : "balance"
  AGENCIES ||--o{ AGENCY_PAYOUT_REQUESTS : "payouts"
  CREATORS ||--o{ CREATOR_PAYOUT_REQUESTS : "payouts"
```

---

## Subscriptions & Billing

```mermaid
erDiagram
  AGENCIES {
    uuid id PK
  }

  CREATORS {
    uuid id PK
  }

  BRANDS {
    uuid id PK
  }

  AGENCY_SUBSCRIPTIONS {
    uuid id PK
    uuid agency_id FK
    text plan_type
    text status
    text stripe_subscription_id
    text stripe_customer_id
    integer seat_count
    integer monthly_price_cents
    timestamptz current_period_start
    timestamptz current_period_end
    timestamptz created_at
  }

  CREATOR_SUBSCRIPTION_EVENTS {
    uuid id PK
    uuid creator_id FK
    text event_type
    text plan_type
    text stripe_subscription_id
    text stripe_customer_id
    timestamptz created_at
  }

  BRAND_PAYMENT_METHODS {
    uuid id PK
    uuid brand_id FK
    text stripe_payment_method_id
    text type
    text last4
    text brand
    integer exp_month
    integer exp_year
    boolean is_default
    timestamptz created_at
  }

  AGENCIES ||--o| AGENCY_SUBSCRIPTIONS : "subscription"
  CREATORS ||--o{ CREATOR_SUBSCRIPTION_EVENTS : "subscription events"
  BRANDS ||--o{ BRAND_PAYMENT_METHODS : "payment methods"
```

---

## Notifications & Settings

```mermaid
erDiagram
  AGENCIES {
    uuid id PK
  }

  CREATORS {
    uuid id PK
  }

  BRANDS {
    uuid id PK
  }

  AGENCY_NOTIFICATION_SETTINGS {
    uuid id PK
    uuid agency_id FK
    boolean email_invoices
    boolean email_bookings
    boolean email_deliverables
    boolean sms_urgent
    timestamptz updated_at
  }

  TALENT_NOTIFICATIONS {
    uuid id PK
    uuid creator_id FK
    text notification_type
    text title
    text message
    text status
    timestamptz read_at
    timestamptz created_at
  }

  BRAND_NOTIFICATIONS {
    uuid id PK
    uuid brand_id FK
    text notification_type
    text title
    text message
    text status
    timestamptz read_at
    timestamptz created_at
  }

  TALENT_PORTAL_SETTINGS {
    uuid id PK
    uuid creator_id FK
    jsonb preferences
    timestamptz updated_at
  }

  AGENCIES ||--o| AGENCY_NOTIFICATION_SETTINGS : "settings"
  CREATORS ||--o{ TALENT_NOTIFICATIONS : "notifications"
  BRANDS ||--o{ BRAND_NOTIFICATIONS : "notifications"
  CREATORS ||--o| TALENT_PORTAL_SETTINGS : "settings"
```

---

## Scouting Module

```mermaid
erDiagram
  AGENCIES {
    uuid id PK
  }

  SCOUTING_TRIPS {
    uuid id PK
    uuid agency_id FK
    text name
    text location
    date start_date
    date end_date
    text status
    timestamptz created_at
  }

  SCOUTING_PROSPECTS {
    uuid id PK
    uuid trip_id FK
    text name
    text email
    text phone
    text instagram_handle
    text notes
    text status
    timestamptz created_at
  }

  SCOUTING_EVENTS {
    uuid id PK
    uuid trip_id FK
    text name
    text location
    date date
    text notes
    timestamptz created_at
  }

  SCOUTING_SUBMISSIONS {
    uuid id PK
    uuid prospect_id FK
    uuid event_id FK
    text status
    timestamptz created_at
  }

  SCOUTING_OFFERS {
    uuid id PK
    uuid submission_id FK
    text status
    timestamptz offered_at
    timestamptz responded_at
  }

  AGENCIES ||--o{ SCOUTING_TRIPS : "trips"
  SCOUTING_TRIPS ||--o{ SCOUTING_PROSPECTS : "prospects"
  SCOUTING_TRIPS ||--o{ SCOUTING_EVENTS : "events"
  SCOUTING_PROSPECTS ||--o{ SCOUTING_SUBMISSIONS : "submissions"
  SCOUTING_EVENTS ||--o{ SCOUTING_SUBMISSIONS : "submissions"
  SCOUTING_SUBMISSIONS ||--o{ SCOUTING_OFFERS : "offers"
```

---

## Webhooks & Integrations

```mermaid
erDiagram
  WEBHOOK_EVENTS {
    uuid id PK
    text source
    text event_type
    jsonb payload
    text status
    timestamptz processed_at
    timestamptz created_at
  }

  CALENDLY_BOOKING_EVENTS {
    uuid id PK
    uuid agency_id FK
    uuid creator_id FK
    text calendly_event_id
    text status
    timestamptz event_start
    timestamptz event_end
    timestamptz created_at
  }

  AGENCY_CALENDLY_SETTINGS {
    uuid id PK
    uuid agency_id FK
    text calendly_user_uri
    text booking_url
    timestamptz created_at
  }

  INSTAGRAM_DATA_CACHE {
    uuid id PK
    uuid creator_id FK
    jsonb profile_data
    jsonb media_data
    timestamptz fetched_at
    timestamptz expires_at
  }

  AGENCIES ||--o{ CALENDLY_BOOKING_EVENTS : "calendly events"
  AGENCIES ||--o| AGENCY_CALENDLY_SETTINGS : "calendly settings"
  CREATORS ||--o| INSTAGRAM_DATA_CACHE : "instagram cache"
```

---

## Tax & Compliance

```mermaid
erDiagram
  AGENCIES {
    uuid id PK
  }

  CREATORS {
    uuid id PK
  }

  AGENCY_VERIFF_SESSIONS {
    uuid id PK
    uuid agency_id FK
    text veriff_session_id
    text status
    timestamptz created_at
    timestamptz completed_at
  }

  TALENT_TAX_DOCUMENTS {
    uuid id PK
    uuid creator_id FK
    text document_type
    text tax_year
    text storage_bucket
    text storage_path
    text status
    timestamptz created_at
  }

  AGENCY_TAX_CURRENCY_SETTINGS {
    uuid id PK
    uuid agency_id FK
    text default_currency
    text tax_id
    text tax_region
    timestamptz updated_at
  }

  AGENCIES ||--o{ AGENCY_VERIFF_SESSIONS : "kyc sessions"
  CREATORS ||--o{ TALENT_TAX_DOCUMENTS : "tax docs"
  AGENCIES ||--o| AGENCY_TAX_CURRENCY_SETTINGS : "settings"
```

---

## Table Count Summary

| Domain | Table Count |
|--------|-------------|
| Core Entities | 4 |
| Agency Talent Management | 4 |
| Bookings & Calendar | 7 |
| Brand Campaigns & Offers | 8 |
| Licensing & Packages | 6 |
| Messaging & Connections | 7 |
| Studio & AI Generation | 4 |
| Storage & Assets | 7 |
| Voice Assets | 4 |
| Invoicing & Payments | 7 |
| Payouts & Balances | 6 |
| Subscriptions & Billing | 3 |
| Notifications & Settings | 5 |
| Scouting Module | 5 |
| Webhooks & Integrations | 4 |
| Tax & Compliance | 3 |
| **Total** | **74 tables** |

---

## Notes

1. **Primary Keys**: All tables use `uuid` primary keys with `gen_random_uuid()` default
2. **Timestamps**: Standard pattern uses `created_at` and `updated_at` columns
3. **Soft Deletes**: Tables like `storage_assets` use `deleted_at` for soft deletes
4. **RLS**: All tables have Row Level Security policies enforced
5. **Foreign Keys**: References use `ON DELETE CASCADE` for dependent records, `ON DELETE SET NULL` for optional references
