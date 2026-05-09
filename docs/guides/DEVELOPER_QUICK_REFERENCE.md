# Developer Quick Reference

## Essential Documentation

### Core Systems

| System                 | Documentation                                                | Key Files                               |
| ---------------------- | ------------------------------------------------------------ | --------------------------------------- |
| **RBAC Permissions**   | [ACCESS_CONTROL_SYSTEM.md](ACCESS_CONTROL_SYSTEM.md)         | `team/permissions.rs`, `team/access.rs` |
| **Cache Invalidation** | [CACHE_INVALIDATION.md](CACHE_INVALIDATION.md)               | `cache/*.rs`, `team/handlers.rs`        |
| **Team Management**    | [team-member-functionality.md](team-member-functionality.md) | `team/handlers.rs`, `team/types.rs`     |
| **Architecture**       | [knowledge/architecture.md](knowledge/architecture.md)       | All of `src/`                           |

### Quick Patterns

#### Permission Check (Backend)

```rust
use crate::team::{require_brand_permission, Permission};

pub async fn my_handler(
    State(state): State<AppState>,
    user: AuthUser,
) -> Result<Json<Value>, (StatusCode, String)> {
    let _access = require_brand_permission(&state, &user, Permission::CreateCampaigns).await?;
    // Proceed with handler logic
}
```

#### Cache Invalidation Pattern

```rust
// Step 1: Database mutation
let resp = state.pg.from("table").update(data).execute().await?;

// Step 2: Invalidate cache
invalidate_org_access_cache(&state, &user_id, "brand");

// Step 3: Log and audit
tracing::info!(user_id = %user_id, "Cache invalidated");
write_audit_log(&state, entry).await?;
```

#### Permission Check (Frontend)

```typescript
import { useTeamAccess } from "@/features/team/useTeamAccess";

function MyComponent() {
  const { hasPermission } = useTeamAccess("brand");

  if (!hasPermission("create_campaigns")) {
    return <div>Access denied</div>;
  }

  return <CampaignForm />;
}
```

### Common Invalidation Functions

| Function                                     | When to Use                      | Cache Level |
| -------------------------------------------- | -------------------------------- | ----------- |
| `invalidate_org_access_cache()`              | Role changes, membership updates | L2          |
| `invalidate_brand_agency_connection_cache()` | Brand-agency connection changes  | L3          |
| `invalidate_session()`                       | Logout, security events          | L2          |
| `invalidate_all_levels()`                    | Complex multi-layer mutations    | L1, L2, L3  |

### Cache TTL Reference

| Data Type               | TTL              | Level |
| ----------------------- | ---------------- | ----- |
| Organization Access     | 5 min            | L2    |
| Brand-Agency Connection | 1 min            | L3    |
| Request Data            | Request lifetime | L1    |
| Session Default         | 30 min           | L2    |

### Testing Permissions

```bash
# Backend tests
cd likelee-server
cargo test --lib team::permissions
cargo test --lib team::access

# Manual check (frontend console)
fetch('/api/team/context?organization_type=brand', {
  headers: { Authorization: `Bearer ${token}` }
})
.then(r => r.json())
.then(console.log);
```

### Debug Cache

```bash
# Enable cache logging
export RUST_LOG=likelee_server::cache=debug,likelee_server::team=debug

# Check frontend cache
const key = 'team_access_context:brand';
console.log(JSON.parse(sessionStorage.getItem(key)));
```

### File Locations

```
likelee-server/
├── src/
│   ├── cache/
│   │   ├── l1_request.rs       # Request-scoped cache
│   │   ├── l2_session.rs       # Session-scoped cache
│   │   ├── l3_application.rs   # App-wide cache
│   │   └── helpers.rs          # Invalidation utilities
│   ├── team/
│   │   ├── permissions.rs      # Permission definitions
│   │   ├── access.rs           # Permission checks + invalidation
│   │   ├── handlers.rs         # Team management endpoints
│   │   └── connections.rs      # Brand-agency connections
│   └── auth.rs                 # JWT validation

likelee-ui/
└── src/
    ├── auth/
    │   └── AuthProvider.tsx    # Auth context
    └── features/team/
        ├── useTeamAccess.ts    # Permission hook
        └── TeamManagementCard.tsx  # Team UI
```

## When Adding New Features

### Permission-Gated Feature Checklist

- [ ] Define required permission in `team/permissions.rs`
- [ ] Add to permission matrix in `ACCESS_CONTROL_SYSTEM.md`
- [ ] Add backend check: `require_*_permission()`
- [ ] Add frontend gate: `hasPermission()`
- [ ] Test with different roles

### Mutation Checklist

- [ ] Identify affected cache layers
- [ ] Call appropriate invalidation after DB write
- [ ] Add tracing/logging
- [ ] Write audit log entry
- [ ] Test cache invalidation
- [ ] Update documentation

## Important Notes

⚠️ **Always invalidate cache after database mutations** - Failure to do so results in stale data for 5-30 minutes.

⚠️ **Never skip permission checks** - Both frontend AND backend checks are required for security.

⚠️ **Test with different roles** - What works for Owner might not work for Reviewer.

📚 **Read the docs** - See [CACHE_INVALIDATION.md](CACHE_INVALIDATION.md) for comprehensive details.

---

## Campaign Offer Transfer & Escrow System

### Overview

When a brand approves a deliverable, escrow is released and Stripe transfers are attempted per recipient (agency + assigned talents). Transfers can fail if a recipient's Stripe account is not fully onboarded. The system is designed to be resilient — individual transfer failures never block the escrow release or other recipients' transfers. Failed transfers are retryable from the agency Deliverables tab.

### Key Principles

**Escrow release is always permanent after brand approval.** It represents the brand's obligation being fulfilled. Transfer failures are an operational concern — funds remain on the platform's Stripe balance until a retry succeeds.

**Transfers are best-effort and independent.** A failed agency transfer does not block talent transfers, and a failed talent transfer does not block others. Every recipient is attempted regardless of what happens to others.

**Approving 1 deliverable triggers escrow release.** The threshold is `approved_count >= 1` — the first brand-approved deliverable unlocks the escrow and initiates all transfers.

### Escrow State Machine

```
holding    → releasing  (atomic claim on first approval)
releasing  → released   (after all transfers attempted — always, even if some fail)
released   → released   (permanent — idempotent)
```

**Recovery from stuck `releasing`:** If a previous release attempt was interrupted before our fix (offer stuck in `releasing` with failed transfers), the next deliverable approval detects the failed transfer rows and automatically retries the full release. This only applies to pre-existing stuck offers — for all new offers, `escrow_status` is always set to `"released"` immediately after the first approval regardless of transfer outcomes, and failed transfers are recovered via the manual retry button in the agency Deliverables tab.

### Transfer Status Flow

```
escrow_status = "released"  (set on brand approval — permanent)
  └─ campaign_offer_transfers per recipient:
       "created"       → funds in recipient's Stripe account ✅
       "failed"        → funds on platform Stripe balance, retry available ⚠️
       "pending_retry" → retry in progress (transient)
       "reversed"      → reversed by Stripe
```

### Retry Gate

The retry endpoint enforces two hard guards:
1. `escrow_status` must be `"released"` — prevents premature transfers
2. Only rows with `status = "failed"` are processed — never re-transfers succeeded rows

### Contract Send Gate (Stripe Readiness)

Before sending a DocuSeal contract, the agency UI checks Stripe readiness for all parties via `GET /api/agency/campaign-offers/:offer_id/stripe-readiness`. Two-tier result:

| Gate | Condition | Action |
|------|-----------|--------|
| Hard block | Agency OR any talent has no Stripe account connected | Contract cannot be sent |
| Soft warning | All connected but some `transfers_enabled = false` | Can send with warning; retry transfers after onboarding |

**Why the brand is never exposed to Stripe issues:** The brand's obligation ends when they pay and approve. Whether the agency or talent can receive a Stripe transfer is an internal operational matter between the platform and the payee — surfacing it to the brand would be confusing and damaging to trust. The readiness gate enforces this at the contract send step: by the time a brand is approving deliverables, all parties are guaranteed to have at least a connected Stripe account. The only remaining edge case (`transfers_enabled = false`) was explicitly shown to the agency before they sent the contract, and is resolved independently via the retry button — no brand involvement needed.

### API Endpoints

#### Agency Offer Endpoints

| Method | Path | Permission Required |
|--------|------|---------------------|
| `GET` | `/api/agency/campaign-offers/:offer_id/stripe-readiness` | `manage_billing` |
| `GET` | `/api/agency/campaign-offers/:offer_id/transfer-status` | `manage_billing` |
| `POST` | `/api/agency/campaign-offers/:offer_id/retry-transfers` | `manage_billing` |

#### Independent Creator Offer Endpoints

| Method | Path | Auth |
|--------|------|------|
| `GET` | `/api/talent/campaign-offers/transfer-status` | Creator session |
| `POST` | `/api/talent/campaign-offers/:offer_id/retry-transfer` | Creator session (owns offer) |

### DB Changes (migration `2026-04-22_campaign_offer_transfer_retry.sql`)

New columns on `campaign_offer_transfers`:
- `retry_count integer NOT NULL DEFAULT 0`
- `retried_at timestamptz`
- `notified_at timestamptz`

New status value: `pending_retry` (added to constraint)

New RPCs:
- `mark_transfer_pending_retry(p_offer_id, p_recipient_type, p_recipient_id)`
- `mark_transfer_notified(p_offer_id, p_recipient_type, p_recipient_id)`

### Frontend

#### Agency Deliverables View

The **Payout Status** panel in `AgencyDeliverablesView` renders automatically when `offer.escrow_status === "released"` and the offer card is expanded. It shows:
- Per-recipient row: name, type, amount, Stripe health, transfer status badge
- Human-readable failure reasons mapped from Stripe error codes
- **Refresh** button to re-poll
- **Retry failed** button (only when at least one transfer has `status: failed`)

The **Stripe Readiness Gate** in `BrandConnectionsView` fires when the agency clicks "Send" on a contract. It calls `/stripe-readiness` and shows a polished modal with per-party status before allowing the DocuSeal submission to be created.

#### Creator Dashboard

The **Payout Status** panel in `CreatorDashboard` shows all independent creator offers (`target_type === "creator"`) where escrow has been released. Features:

- **Automatic display** when creator has any independent offers with `escrow_status = "released"`
- **Visual status indicators:**
  - ✅ **"Paid"** (green) — `transfer_status = "created"` — funds in Stripe account
  - ⚠️ **"Failed"** (amber) — `transfer_status = "failed"` — shows **"Claim payment"** button
  - 🔄 **"Retrying"** (blue) — `transfer_status = "pending_retry"` — retry in progress
  - 🕐 **"Pending"** (gray) — other states
- **Self-service retry:** "Claim payment" button calls `POST /api/talent/campaign-offers/:offer_id/retry-transfer`
- **Stripe readiness gate:** Before submitting deliverables, checks if Stripe account is connected:
  - **Hard block** if not connected → forces creator to Payouts settings
  - **Soft warning** if `transfers_enabled = false` → warns but allows submission

**Key difference from agency flow:** Independent creators can only retry their own offers. Agency talent splits are handled by the agency, not self-service.

### Stripe Error Code Mapping (Frontend)

| Stripe Code | User-Facing Message |
|-------------|---------------------|
| `insufficient_capabilities_for_transfer` | Stripe account not fully set up — transfers not enabled |
| `transfers_not_allowed` | Transfers not allowed on this Stripe account |
| `payouts_not_allowed` | Payouts not allowed on this Stripe account |
| `balance_insufficient` | Platform balance insufficient — contact support |
| No Stripe account | No Stripe account connected. Ask them to complete Stripe onboarding |

---

## Independent Creator Offer Payment Flow

### Overview

Independent creator offers (`target_type = "creator"`) follow a simplified payment flow compared to agency offers. When a brand approves a deliverable, the full offer amount is transferred directly to the creator's Stripe account. No talent splits, no agency intermediary.

### Stripe Readiness Gates

**Two prevention points** ensure creators can receive payment before they submit work:

#### 1. Deliverable Submission Gate (Backend)

When a creator submits a deliverable (final or draft), the backend checks:

```rust
// In submit_offer_deliverable() and submit_draft_deliverables()
if is_creator_like(&user.role) && target_type == "creator" {
    let stripe_account = get_creator_stripe_account(&state, &creator_id).await;
    if stripe_account.is_empty() {
        return Err(402 PAYMENT_REQUIRED, "stripe_account_required: Connect your Stripe account...");
    }
}
```

**Result:** Creator cannot submit deliverables until Stripe is connected.

#### 2. Deliverable Submission Gate (Frontend)

Before opening the deliverable submission modal, `CreatorDashboard` checks `payoutAccountStatus`:

```typescript
if (!payoutAccountStatus?.connected) {
  // Hard block: show modal forcing user to Payouts
  setStripeGateModalConfig({
    severity: "block",
    title: "Connect Stripe to submit deliverables",
    description: "You need to connect your Stripe account before submitting deliverables...",
    actions: [{ label: "Go to Payouts", onClick: () => setShowPayoutSettings(true) }]
  });
  return;
}

if (payoutAccountStatus?.connected && !payoutAccountStatus?.transfers_enabled) {
  // Soft warning: warn but allow submission
  setStripeGateModalConfig({
    severity: "warning",
    title: "Stripe transfers not fully enabled",
    description: "Complete your Stripe onboarding to ensure you get paid on time. You can still submit now.",
    actions: [
      { label: "Submit anyway", onClick: () => openDeliverableModal() },
      { label: "Go to Payouts", onClick: () => setShowPayoutSettings(true) }
    ]
  });
  return;
}
```

**Result:** Creator is warned/blocked before wasting time on deliverables they can't get paid for.

### Self-Service Transfer Retry

When a transfer fails (e.g., `transfers_enabled` was false at approval time), creators can retry from their dashboard.

#### Retry Endpoint: `POST /api/talent/campaign-offers/:offer_id/retry-transfer`

**Guards:**
1. User must be a creator
2. Offer must belong to this creator (`target_type = "creator"`, `target_id = creator_id`)
3. Escrow must be `"released"` (brand already approved)
4. A failed transfer row must exist (`status = "failed"`)

**Flow:**
1. Verify offer ownership and escrow status
2. Find failed transfer row for this creator
3. Get creator's **current** Stripe account (may have been fixed since failure)
4. Mark transfer as `"pending_retry"` via RPC
5. Execute Stripe transfer via `execute_and_record_stripe_transfer()`
6. Return success/failure to frontend

**Key insight:** Uses the **current** Stripe account, so creators can fix their setup then retry.

#### Frontend Retry Flow

In `CreatorDashboard`, the **Payout Status** panel shows failed transfers with a "Claim payment" button:

```typescript
const retryCreatorTransfer = async (offerId: string) => {
  try {
    const resp = await base44.post(`/api/talent/campaign-offers/${offerId}/retry-transfer`);
    if (resp?.status === "ok") {
      // Show success modal
      setStripeGateModalConfig({
        severity: "info",
        title: "Transfer succeeded",
        description: "Funds are on their way to your Stripe account.",
        actions: [{ label: "Done", onClick: () => setStripeGateModalOpen(false) }]
      });
      await refreshCreatorTransfers();
    }
  } catch (err) {
    // Show error modal with "Go to Payouts" action
  }
};
```

**One retry at a time:** `retryingTransferOfferId` state prevents concurrent retries.

### Transfer Status Display

The `campaign_offer_transfers` table includes a `target_type` field to distinguish:
- **`"creator"`** = independent offer (creator can self-service retry)
- **`"agency"`** = talent split from agency offer (agency handles retry)

Frontend filters by `target_type === "creator"` to show only independent offers in the creator's Payout Status panel.

### Data Flow Summary

**Prevention Flow (Deliverable Submission):**
```
Creator clicks "Submit Deliverable"
  → Frontend checks payoutAccountStatus
    → If !connected: Block with modal
    → If !transfers_enabled: Warn but allow
  → Backend checks Stripe account on submission
    → If empty: Return 402 PAYMENT_REQUIRED
  → Deliverable submitted successfully
```

**Recovery Flow (Failed Transfer Retry):**
```
Creator sees "Failed" transfer in Payout Status panel
  → Clicks "Claim payment" button
  → Frontend calls POST /api/talent/campaign-offers/:offer_id/retry-transfer
    → Backend verifies:
      - Offer belongs to creator
      - Escrow is released
      - Failed transfer exists
    → Fetches current Stripe account
    → Marks transfer as pending_retry
    → Executes Stripe transfer
      → Success: Returns transfer_id
      → Failure: Returns error message
  → Frontend shows modal with result
    → Success: "Funds are on their way"
    → Failure: "Go to Payouts to fix Stripe setup"
```

### Key Design Decisions

1. **Only for independent creator offers** — Agency talent splits are handled by the agency, not self-service
2. **Escrow must be released** — Can't retry if brand hasn't approved yet
3. **Uses current Stripe account** — Allows creators to fix their Stripe setup then retry
4. **Idempotent retry** — If no failed transfer exists, returns `nothing_to_retry: true`
5. **One retry at a time** — `retryingTransferOfferId` state prevents concurrent retries
6. **Reuses existing transfer infrastructure** — Calls `execute_and_record_stripe_transfer()` and `record_campaign_offer_transfer` RPC

### Files Involved

**Backend:**
- `likelee-server/src/brand_campaigns.rs`:
  - `submit_offer_deliverable()` — Stripe readiness gate
  - `submit_draft_deliverables()` — Stripe readiness gate
  - `get_creator_transfer_status()` — Fetch creator's transfer status
  - `retry_creator_transfer()` — Self-service retry endpoint

**Frontend:**
- `likelee-ui/src/pages/CreatorDashboard.tsx`:
  - Payout Status panel rendering
  - Stripe readiness gate modal
  - `retryCreatorTransfer()` function
  - `fetchCreatorTransfers()` polling

**Database:**
- `supabase/migrations/2026-04-22_campaign_offer_transfer_retry.sql` — Transfer retry columns and RPCs
- `campaign_offer_transfers.target_type` — Distinguishes independent vs agency offers
