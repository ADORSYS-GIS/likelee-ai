# Repository Architecture & Database Relationships

This document outlines the core relationships and interaction flows between Brands, Agencies, and Creators, specifically focusing on the **Campaign Deliverables & Payment Gating** system.

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
        text status "submitted, agency_review, brand_review, approved"
        text asset_url
    }
```

## Interaction Flow (Payment & Deliverables)

This sequence diagram illustrates the lifecycle of a campaign offer from signing to final deliverable approval, highlighting the **Payment Gate**.

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

    Note over B,S: 2. Escrow Payment Phase
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
    B->>Server: Final Approval
    Server->>Server: Status: approved
    Note over Server: Release funds to Balance
```

## Key Interactions

### 1. The Payment Gate
The system enforces a financial boundary at the start of the `in_execution` phase. 
- **Back-end Check**: API endpoints for uploading and submitting deliverables verify that the parent `campaign_offer.payment_status` is `'paid'`.
- **Front-end Gating**: UI components (Agency & Creator dashboards) disable action buttons and show warning indicators if the offer is unpaid.

### 2. The Billing Shadow Stub
To leverage existing financial infrastructure without duplicating logic, campaign payments utilize a "Shadow Stub" in the `licensing_requests` table:
- **`licensing_requests.context_type = 'campaign'`**: Distinguishes it from standard licensing deals.
- **`campaign_offers.billing_request_id`**: Links the offer to its financial record for tracking escrow and payouts.

### 3. Review Hierarchy
Deliverables follow a strictly enforced pipeline:
1. **Creator Draft**: Private to the creator.
2. **Submitted to Agency**: Visible to Agency for review.
3. **Submitted to Brand**: Agency-approved work is sent to the Brand.
4. **Approved**: Brand-approved work marks the deliverable as finalized.
