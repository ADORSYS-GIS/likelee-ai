# Repository Architecture & Database Relationships

This document outlines the core relationships and interaction flows between Brands, Agencies, and Creators, specifically focusing on the **Campaign Offer Payment Gate, Deliverables, and Escrow Release** system.

## Database ER Diagram

The following diagram shows the relationships between campaigns, offers, payments (billing stubs), and deliverables.

```mermaid
erDiagram
    BRANDS ||--o{ BRAND_CAMPAIGNS : "owns"
    BRAND_CAMPAIGNS ||--o{ CAMPAIGN_OFFERS : "has"
    BRANDS ||--o{ CAMPAIGN_OFFERS : "issues"
    
    CAMPAIGN_OFFERS ||--o{ CAMPAIGN_OFFER_DELIVERABLES : "contains"
    CAMPAIGN_OFFERS ||--o{ OFFER_TALENT_ASSIGNMENTS : "linked to"
    CAMPAIGN_OFFERS ||--o| LICENSING_REQUESTS : "billing_request_id (Shadow Stub)"
    CAMPAIGN_OFFERS ||--o{ CAMPAIGN_OFFER_TRANSFERS : "escrow transfers"
    
    AGENCIES ||--o{ CAMPAIGN_OFFERS : "targeted as agency"
    CREATORS ||--o{ CAMPAIGN_OFFERS : "targeted as creator"
    
    OFFER_TALENT_ASSIGNMENTS }|--|| CREATORS : "assigns talent"
    
    CAMPAIGN_OFFER_DELIVERABLES }|--|| AGENCIES : "reviewed by"
    CAMPAIGN_OFFER_DELIVERABLES }|--|| CREATORS : "uploaded by"

    CAMPAIGN_OFFERS {
        uuid id PK
        uuid brand_campaign_id FK
        text status "contract_fully_signed, in_execution, etc."
        text payment_status "unpaid, processing, paid"
        text escrow_status "holding, releasing, released"
        uuid billing_request_id FK
    }

    LICENSING_REQUESTS {
        uuid id PK
        text context_type "licensing, campaign"
        uuid campaign_offer_id FK
    }

    CAMPAIGN_OFFER_DELIVERABLES {
        uuid id PK
        uuid offer_id FK
        text status "draft, submitted, agency_review, brand_review, brand_approved, approved"
        text asset_url
    }

    CAMPAIGN_OFFER_TRANSFERS {
        uuid id PK
        uuid offer_id FK
        text recipient_type "agency, creator"
        uuid recipient_id
        bigint amount_cents
        text status "created, failed, reversed"
    }
```

## Interaction Flow (Payment & Deliverables)

This sequence diagram illustrates the lifecycle of a campaign offer from signing to final deliverable approval, highlighting the **Payment Gate** and **Escrow Release**.

```mermaid
sequenceDiagram
    participant B as Brand
    participant S as Server/Stripe
    participant A as Agency
    participant C as Creator

    Note over B,C: 1. Contract Phase
    B->>A: Send Offer Link (DocuSeal)
    A->>B: Sign Contract
    B->>B: Sign Contract
    Note over B: Status: contract_fully_signed

    Note over B,S: 2. Escrow Payment Phase (Checkout)
    B->>S: Click "Pay Offer" (Stripe Checkout)
    S-->>B: Payment Successful
    S->>Server: Webhook: Update payment_status = 'paid'
    
    Note over A,C: 3. Execution Phase (GATED)
    A->>Server: Request Upload (Checks payment_status)
    Server-->>A: [IF PAID] Allow Upload
    C->>Server: Upload Deliverable
    Server->>Server: Status: agency_review

    Note over A,B: 4. Review Phase
    A->>Server: Approve Deliverable
    Server->>Server: Status: brand_review
    B->>Server: Approve deliverable (first approval triggers escrow)
    Server->>Server: escrow_status: holding -> releasing -> released
    Server->>S: Stripe Transfers (agency + talent splits)
    Note over Server: Internal "held" balances remain until transfer succeeds; "cashoutable" is Stripe available on connected accounts
```

## Key Interactions

### 1. The Payment Gate
The system enforces a financial boundary at the start of the `in_execution` phase. 
- **Back-end Check**: API endpoints for uploading and submitting deliverables verify that the parent `campaign_offer.payment_status` is `'paid'`.
- **Front-end Gating**: UI components (Agency & Creator dashboards) disable action buttons and show warning indicators if the offer is unpaid.

### 1b. Stable Campaign Status (Active vs Pending)
Campaign tab placement must not depend on deliverable/workflow status strings.
- **Backend-derived flag**: offers include `is_fully_signed` computed from DocuSeal contract completion.
- **Rule**: a campaign is **Active** if it has **any fully signed offer**, and remains Active until completed/expired/cancelled by campaign/timing rules.

### 2. The Billing Shadow Stub
To leverage existing financial infrastructure without duplicating logic, campaign payments utilize a "Shadow Stub" in the `licensing_requests` table:
- **`licensing_requests.context_type = 'campaign'`**: Distinguishes it from standard licensing deals.
- **`campaign_offers.billing_request_id`**: Links the offer to its financial record for tracking escrow and payouts.

### 3. Review Hierarchy
Deliverables follow a strictly enforced pipeline:
1. **Creator Draft**: Private to the creator.
2. **Submitted to Agency**: Visible to Agency for review.
3. **Submitted to Brand**: Agency-approved work is sent to the Brand.
4. **Brand Approved**: First brand approval can trigger escrow release (once per offer).
5. **Approved**: Final state for the deliverable.

### 4. Distribution & Commission (Agency collaborator offers)
For offers where the collaborator is an **agency**, the brand’s payment is collected into platform escrow and then distributed on escrow release (first brand deliverable approval trigger).

Key rules:
- The payout pool is the **net** amount (`budget_creator_payment` / `net_amount_cents`). The platform fee is tracked separately.
- Assigned recipients come from `offer_talent_assignments` and are keyed by `creator_id` (connected creators may have `talent_id = NULL`).
- If per-creator payment weights exist (`payments.gross_cents` rows for the offer billing stub), they are used as allocation weights; otherwise the net is split evenly across assigned creators.

Commission semantics (important):
- `commission_rate` is interpreted as the **agency commission percent** for each creator’s share.
- `creator_payout_percent = 100 - commission_rate`
- `creator_earnings = gross_share_cents * creator_payout_percent`
- `agency_earnings = gross_share_cents - creator_earnings`

Commission resolution order (per `creator_id`):
1) `agency_creator_commissions(agency_id, creator_id).commission_rate` (override, if present)
2) `agencies.performance_commission_config[tier].commission_rate` (tier default)
   - tier comes from `agency_talent_relationships.performance_tier_name` for connected creators
   - `agency_users.performance_tier_name` overrides when present for roster creators

Example (net = 5,000 USD, 3 creators, agency commission = 12%):
- Each creator share ≈ 1,666.67
- Each creator earns 88% ≈ 1,466.67
- Agency earns 12% ≈ 200.00 per creator → 600.00 total
