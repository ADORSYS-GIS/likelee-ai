# Likelee AI — Design

## Accounting & Invoicing (Agency Dashboard)

### Goals

- Enable agencies to create, manage, and send invoices to their clients.
- Support invoice creation from an existing booking (preferred path) and manual entry.
- Provide consistent financial calculations (totals, commission split, tax/discount) with an auditable record.
- Keep invoices tenant-isolated (agency-only) using Supabase RLS and server-side enforcement.

### Non-Goals (Initial MVP)

- Payment processing / Stripe invoice issuing.
- Automated dunning (reminders), partial payments, credit notes.
- Full accounting ledger / double-entry accounting.
- PDF rendering and emailing from the backend (a preview endpoint can be added first).

### Key Concepts

- An invoice belongs to exactly one agency and one agency client.
- An invoice can be created from a booking:
  - Booking provides suggested talent, date of service, and base rate.
- An invoice contains:
  - Header fields (number, dates, PO/project reference)
  - Line items (services)
  - Optional expenses
  - Financial settings (commission, currency, tax, discount)
  - Notes and payment instructions

### Invoice Lifecycle

- `draft`
  - Editable by the agency.
- `sent`
  - Invoice has been issued to the client (MVP: marked manually).
  - Editing rules: limited in later phases (MVP can allow edits if needed).
- `paid`
  - Marked paid (manual for MVP).
- `void`
  - Cancelled invoice (manual for MVP).

### Data Model (Supabase)

#### `agency_invoices`

- **Ownership**
  - `agency_id` (uuid, FK to `public.agencies(id)`)
- **Associations**
  - `client_id` (uuid, FK to `public.agency_clients(id)`)
  - `booking_id` (uuid, optional, FK to `public.bookings(id)`)
- **Identity**
  - `invoice_number` (text)
  - `status` (text enum-like constraint: `draft`, `sent`, `paid`, `void`)
- **Dates**
  - `invoice_date` (date) b
  - `due_date` (date)
  - `sent_at` (timestamptz, nullable)
  - `paid_at` (timestamptz, nullable)
- **Client snapshot**
  - `bill_to_company` (text)
  - `bill_to_contact_name` (text)
  - `bill_to_email` (text)
  - `bill_to_phone` (text)
- **Commercial fields**
  - `po_number` (text, nullable)
  - `project_reference` (text, nullable)
  - `currency` (text, default `USD`)
  - `payment_terms` (text, default `net_30`)
- **Financial settings**
  - `agency_commission_bps` (integer, default `2000` for 20.00%)
  - `tax_rate_bps` (integer, default `0`)
  - `tax_exempt` (boolean, default `false`)
  - `discount_cents` (integer, default `0`)
- **Notes**
  - `notes_internal` (text, nullable)
  - `payment_instructions` (text, nullable)
  - `footer_text` (text, nullable)
- **Computed totals (stored)**
  - `subtotal_cents`
  - `expenses_cents`
  - `tax_cents`
  - `total_cents`
  - `agency_fee_cents`
  - `talent_net_cents`
- **Audit**
  - `created_at`, `updated_at`

#### `agency_invoice_items`

- `invoice_id` (uuid, FK to `agency_invoices(id)`)
- `sort_order` (integer)
- `description` (text)
- `talent_id` (uuid, nullable)
- `talent_name` (text, nullable)
- `date_of_service` (date, nullable)
- `rate_type` (text, nullable; aligns to booking rate types when sourced from booking)
- `quantity` (numeric)
- `unit_price_cents` (integer)
- `line_total_cents` (integer)
- `created_at`

#### `agency_invoice_expenses` (optional, MVP)

- `invoice_id` (uuid, FK to `agency_invoices(id)`)
- `sort_order` (integer)
- `description` (text)
- `amount_cents` (integer)
- `taxable` (boolean, default false)
- `created_at`

### Calculation Rules (MVP)

- `line_total_cents = round(quantity * unit_price_cents)`
- `subtotal_cents = sum(line_total_cents)`
- `expenses_cents = sum(expense.amount_cents)`
- `discount_cents` is applied once at invoice level.
- `taxable_base_cents` defaults to `subtotal_cents + (sum(taxable_expenses)) - discount_cents`, not below zero.

### Invoice Numbering (MVP)

- Invoice id is stored as a uuid.
- Default generation is performed server-side at creation time.
- Format: `INVC[A-Z][0-9]{7}` (example: `INVCZ9930308`).
- Invoice number is system-generated and cannot be provided or edited by users.

### Permissions & RLS

- Agencies can only read/write their own invoices and related rows.
- Ownership is by `agency_id` matching the authenticated agency user id.
- When a server endpoint accepts `invoice_id`, it must validate `agency_id = auth_user.id`.

### Backend API (likelee-server)

#### Existing dependencies

- Bookings and clients already exist and can be used for invoice creation:
  - `GET /api/bookings`
  - `GET /api/agency/clients`
  - `GET /api/agency/talents`

#### New endpoints (MVP)

- `GET /api/invoices`
  - List invoices for the agency (filters: status, date range optional).
- `POST /api/invoices`
  - Create invoice draft.
  - Supports `source_booking_id` optional.
- `GET /api/invoices/:id`
  - Get invoice header + items + expenses.
- `POST /api/invoices/:id`
  - Update invoice draft fields and replace/update items/expenses.
- `POST /api/invoices/:id/mark-sent`
  - Set status to `sent` and `sent_at = now()`.
- `POST /api/invoices/:id/mark-paid`
  - Set status to `paid` and `paid_at = now()`.
- `POST /api/invoices/:id/void`
  - Set status to `void`.

### UI (likelee-ui)

- Add “Accounting & Invoicing” section under the Agency Dashboard.
- Invoice Generation page supports:
  - Create from Existing Booking
  - Manual Entry

## Configuration Management

- No new environment variables are required for the initial Accounting & Invoicing MVP.
- If/when we add PDF rendering, emailing, or payment providers:
  - Add new variables to `likelee-server/src/config.rs` using `envconfig`.
  - Keep `likelee-server/.env.example` in sync.
  - Document the variables here under this section.

### KYC / Veriff

- `KYC_BYPASS_VERIFF_LIMIT` (bool, default `false`)
  - Temporary testing flag to bypass the agency Veriff monthly session limit.
  - Must remain disabled in normal environments.

### Stripe Subscriptions (Agency Billing)

- `STRIPE_AGENCY_PRICE_ID`
  - Stripe Price ID for the Agency subscription tier.
- `STRIPE_SCALE_PRICE_ID`
  - Stripe Price ID for the Scale subscription tier.
- `STRIPE_AGENCY_BASIC_PACKAGE_PRICE_ID`
  - Stripe Price ID for the Basic all-inclusive package (recurring).
- `STRIPE_AGENCY_PRO_PACKAGE_PRICE_ID`
  - Stripe Price ID for the Pro all-inclusive package (recurring).
- `STRIPE_AGENCY_BASIC_BASE_PRICE_ID`
  - Legacy (not used for Basic/Pro package checkout).
- `STRIPE_AGENCY_PRO_BASE_PRICE_ID`
  - Legacy (not used for Basic/Pro package checkout).
- `STRIPE_AGENCY_ROSTER_5_10_PRICE_ID`
  - Legacy (not used for Basic/Pro package checkout).
- `STRIPE_AGENCY_ROSTER_11_50_PRICE_ID`
  - Legacy (not used for Basic/Pro package checkout).
- `STRIPE_AGENCY_ROSTER_51_100_PRICE_ID`
  - Legacy (not used for Basic/Pro package checkout).
- `STRIPE_AGENCY_ROSTER_100_PLUS_PRICE_ID`
  - Legacy (not used for Basic/Pro package checkout).
- `STRIPE_AGENCY_ADDON_IRL_BOOKING_PRICE_ID`
  - Legacy (not used for Basic/Pro package checkout).
- `STRIPE_AGENCY_ADDON_DEEPFAKE_5_10_PRICE_ID`
  - Legacy (not used for Basic/Pro package checkout).
- `STRIPE_AGENCY_ADDON_DEEPFAKE_11_50_PRICE_ID`
  - Legacy (not used for Basic/Pro package checkout).
- `STRIPE_AGENCY_ADDON_DEEPFAKE_51_100_PRICE_ID`
  - Legacy (not used for Basic/Pro package checkout).
- `STRIPE_AGENCY_ADDON_DEEPFAKE_100_PLUS_PRICE_ID`
  - Legacy (not used for Basic/Pro package checkout).
- `STRIPE_AGENCY_ADDON_TEAM_1_5_PRICE_ID`
  - Legacy (not used for Basic/Pro package checkout).
- `STRIPE_AGENCY_ADDON_TEAM_6_10_PRICE_ID`
  - Legacy (not used for Basic/Pro package checkout).
- `STRIPE_AGENCY_ADDON_TEAM_11_30_PRICE_ID`
  - Legacy (not used for Basic/Pro package checkout).
- `STRIPE_CHECKOUT_SUCCESS_URL`
  - URL Stripe redirects to after successful checkout.
- `STRIPE_CHECKOUT_CANCEL_URL`
  - URL Stripe redirects to after checkout is canceled.

### Stripe Subscriptions (Client Licensing / Package Paywall)

- `STRIPE_LICENSING_BASIC_PRICE_ID`
  - Stripe Price ID for Basic licensing tier.
- `STRIPE_LICENSING_PRO_PRICE_ID`
  - Stripe Price ID for Pro licensing tier.
- `STRIPE_LICENSING_ENTERPRISE_PRICE_ID`
  - Stripe Price ID for Enterprise licensing tier.
- `STRIPE_LICENSING_SUCCESS_URL`
  - URL Stripe redirects to after successful licensing checkout (should route back to `/share/package/:token`).
  - Should include Stripe's `{CHECKOUT_SESSION_ID}` placeholder.
- `STRIPE_LICENSING_CANCEL_URL`
  - URL Stripe redirects to after licensing checkout is canceled.

### Stripe Connect (Agency Bank Connection)

- `PAYOUTS_ENABLED` (bool)
  - Enables Stripe Connect onboarding endpoints.
- `STRIPE_SECRET_KEY`
  - Stripe secret key used server-side.
- `STRIPE_CLIENT_ID`
  - Stripe Connect client id (kept for future OAuth flows; current implementation uses Account Links).
- `STRIPE_RETURN_URL`
  - URL Stripe redirects to after a successful onboarding.
- `STRIPE_REFRESH_URL`
  - URL Stripe redirects to if the user abandons or needs to restart onboarding.
- `STRIPE_WEBHOOK_SECRET`
  - Used to validate Stripe webhook signatures.

### Agency Payout Scheduler

- `AGENCY_PAYOUT_SCHEDULER_ENABLED` (bool, default `false`)
  - Enables the background job that schedules agency payouts based on payout settings.
- `AGENCY_PAYOUT_SCHEDULER_INTERVAL_SECS` (u64, default `3600`)
  - The interval at which the scheduler wakes up to check due payouts.

## Supabase ER Diagram (Migrations 0035-0037)

```mermaid
erDiagram
  AGENCIES {
    uuid id PK
  }
  AGENCY_TALENT_PACKAGES {
    uuid id PK
  }
  LICENSING_CHECKOUT_SESSIONS {
    uuid id PK
    uuid agency_id FK
    uuid package_id FK
    text stripe_checkout_session_id
    text stripe_subscription_id
  }
  LICENSING_ACCESS_GRANTS {
    uuid id PK
    uuid agency_id FK
    uuid package_id FK
    text stripe_subscription_id
  }
  AGENCY_BALANCES {
    uuid agency_id PK
    bigint available_cents
    text currency
  }
  AGENCY_PAYOUT_REQUESTS {
    uuid id PK
    uuid agency_id FK
    bigint amount_cents
    text currency
    text payout_method
    text status
  }
  LICENSING_PAYOUTS {
    uuid id PK
    uuid agency_id FK
    bigint amount_cents
    text currency
  }

  AGENCIES ||--o{ LICENSING_CHECKOUT_SESSIONS : "has"
  AGENCY_TALENT_PACKAGES ||--o{ LICENSING_CHECKOUT_SESSIONS : "has"

  AGENCIES ||--o{ LICENSING_ACCESS_GRANTS : "has"
  AGENCY_TALENT_PACKAGES ||--o{ LICENSING_ACCESS_GRANTS : "has"

  AGENCIES ||--|| AGENCY_BALANCES : "has"
  AGENCIES ||--o{ AGENCY_PAYOUT_REQUESTS : "requests"
  AGENCIES ||--o{ LICENSING_PAYOUTS : "earns"
