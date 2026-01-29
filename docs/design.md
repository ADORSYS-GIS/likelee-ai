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
   - `invoice_date` (date)
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
   - Line items
   - Optional expenses
   - Commission %, currency, tax rate, discount
   - Save as draft / Mark as sent / Preview
 
 ## Configuration Management
 
 - No new environment variables are required for the initial Accounting & Invoicing MVP.
 - If/when we add PDF rendering, emailing, or payment providers:
   - Add new variables to `likelee-server/src/config.rs` using `envconfig`.
   - Keep `likelee-server/.env.example` in sync.
   - Document the variables here under this section.
