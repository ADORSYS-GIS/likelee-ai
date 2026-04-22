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
