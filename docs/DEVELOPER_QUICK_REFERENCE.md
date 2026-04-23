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

## Campaign Offer Transfer Retry System

### Overview

When a brand approves a deliverable, escrow is released and Stripe transfers are attempted per recipient (agency + assigned talents). Transfers can fail silently if a recipient's Stripe account is not fully onboarded. The retry system allows agencies to recover from these failures without any manual platform intervention.

### Key Principle

**Escrow release is always permanent after brand approval.** It represents the brand's obligation being fulfilled. Transfer failures are an operational concern — funds remain on the platform's Stripe balance until a retry succeeds.

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

### New API Endpoints

| Method | Path | Permission Required |
|--------|------|---------------------|
| `GET` | `/api/agency/campaign-offers/:offer_id/transfer-status` | `manage_billing` |
| `POST` | `/api/agency/campaign-offers/:offer_id/retry-transfers` | `manage_billing` |

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

The **Payout Status** panel in `AgencyDeliverablesView` renders automatically when `offer.escrow_status === "released"` and the offer card is expanded. It shows:
- Per-recipient row: name, type, amount, Stripe health, transfer status badge
- Human-readable failure reasons mapped from Stripe error codes
- **Refresh** button to re-poll
- **Retry failed** button (only when at least one transfer has `status: failed`)

### Stripe Error Code Mapping (Frontend)

| Stripe Code | User-Facing Message |
|-------------|---------------------|
| `insufficient_capabilities_for_transfer` | Stripe account not fully set up — transfers not enabled |
| `transfers_not_allowed` | Transfers not allowed on this Stripe account |
| `payouts_not_allowed` | Payouts not allowed on this Stripe account |
| `balance_insufficient` | Platform balance insufficient — contact support |
| No Stripe account | No Stripe account connected. Ask them to complete Stripe onboarding |
