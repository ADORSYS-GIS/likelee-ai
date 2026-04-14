# Cache Invalidation System

## Overview

The Likelee platform implements a multi-level caching strategy for performance optimization. This document describes the cache invalidation mechanisms that ensure data consistency when permissions, roles, or connections are modified.

## Table of Contents

- [Architecture](#architecture)
- [Cache Levels](#cache-levels)
- [Invalidation Mechanisms](#invalidation-mechanisms)
- [Implementation Details](#implementation-details)
- [Best Practices](#best-practices)
- [Troubleshooting](#troubleshooting)

---

## Architecture

### Multi-Level Cache Architecture

```
┌─────────────────────────────────────────────────────────────────────┐
│                       Request Flow                                   │
├─────────────────────────────────────────────────────────────────────┤
│                                                                      │
│  [Client Request]                                                    │
│       │                                                              │
│       ▼                                                              │
│  ┌─────────┐    ┌─────────┐    ┌─────────┐    ┌──────────┐        │
│  │   L1    │───▶│   L2    │───▶│   L3    │───▶│ Database  │        │
│  │ Request │    │ Session │    │  App    │    │           │        │
│  │  Cache  │    │  Cache  │    │  Cache │    │           │        │
│  └─────────┘    └─────────┘    └─────────┘    └──────────┘        │
│       │              │              │              │                │
│       │              │              │              │                │
│       └──────────────┴──────────────┴──────────────┘                │
│                                                                      │
│  TTL: Request   TTL: 5-30 min   TTL: 1-60 min                      │
│       Lifetime                                                             │
└─────────────────────────────────────────────────────────────────────┘
```

### Key Components

| Component | Location | Purpose |
|-----------|----------|---------|
| L1 Cache | `cache/l1_request.rs` | Request-scoped, per-request isolation |
| L2 Cache | `cache/l2_session.rs` | Session-scoped, user-specific data |
| L3 Cache | `cache/l3_application.rs` | Application-wide, shared data |
| Cache Helpers | `cache/helpers.rs` | Fallback chain and invalidation utilities |

---

## Cache Levels

### Level 1: Request Cache (L1)

**Scope**: Single HTTP request  
**Storage**: In-memory (RwLock<HashMap>)  
**TTL**: Request lifetime  
**Thread Safety**: RwLock for concurrent reads  

**Use Cases**:
- Prevent duplicate queries within the same request
- Temporary storage for derived data
- Request-local computations

**Example**:
```rust
// Within a single request, repeated lookups hit L1
let access1 = require_brand_permission(&state, &user, Permission::CreateCampaigns).await?;
let access2 = require_brand_permission(&state, &user, Permission::ViewTeamMembers).await?;
// Second call uses L1 cache if within same request
```

### Level 2: Session Cache (L2)

**Scope**: User session (multiple requests)  
**Storage**: DashMap (concurrent HashMap)  
**TTL**: 5-30 minutes (configurable per entry)  
**Namespace**: `session_id:cache_key`  

**Use Cases**:
- Organization access permissions
- User profile data
- Session-specific computed values

**Key Structure**:
```rust
let cache_key = format!("{}:{}", 
    CACHE_NAMESPACE_ORG_ACCESS,  // "org_access"
    cache_key(&user_id, &org_type)  // "user123:brand"
);
// Result: "org_access:user123:brand"
```

**Default TTLs**:
| Data Type | TTL | Constant |
|-----------|-----|----------|
| Organization Access | 5 min (300s) | `ORG_ACCESS_CACHE_TTL_SECS` |
| Session Default | 30 min | `SessionCache::default_ttl` |

### Level 3: Application Cache (L3)

**Scope**: Application-wide (all users)  
**Storage**: DashMap (concurrent HashMap)  
**TTL**: 1-60 minutes (configurable per entry)  

**Use Cases**:
- Brand-agency connections
- Global configuration
- Shared reference data

**Key Structure**:
```rust
let cache_key = format!("{}:{}", 
    CACHE_NAMESPACE_BRAND_AGENCY_CONN,
    cache_key(&brand_id, &agency_id)
);
// Result: "brand_agency_conn:brand123:agency456"
```

**Default TTLs**:
| Data Type | TTL | Constant |
|-----------|-----|----------|
| Brand-Agency Connection | 1 min (60s) | `BRAND_AGENCY_CONN_CACHE_TTL_SECS` |

---

## Invalidation Mechanisms

### Automatic Invalidation

#### TTL Expiration

All cache entries automatically expire based on their TTL. This provides **eventual consistency** without explicit invalidation.

```
Time →
Cache Entry Created ──────────────▶ TTL Expired ──────────────▶ Entry Removed
         │                                │
         └── Entry is valid               └── Next request fetches fresh data
```

### Explicit Invalidation

#### Organization Access Cache

**Function**: `invalidate_org_access_cache()`  
**Location**: `team/access.rs:260-274`  
**Purpose**: Clear user's organization permissions after role changes  

**Implementation**:
```rust
pub fn invalidate_org_access_cache(
    state: &AppState, 
    user_id: &str, 
    organization_type: &str
) {
    let cache_key = format!(
        "{}:{}",
        CACHE_NAMESPACE_ORG_ACCESS,
        crate::cache::cache_key(user_id, organization_type)
    );

    state.cache_l2.delete(user_id, &cache_key);

    tracing::debug!(
        user_id = %user_id,
        org_type = %organization_type,
        "Organization access cache invalidated"
    );
}
```

**When Called**:
1. **Role Updates** - `team/handlers.rs:341` (after database update)
2. **Invite Acceptance** - `team/handlers.rs:465` (after membership creation)

**Example Flow**:
```
1. Admin updates user role from "reviewer" to "admin"
   ↓
2. Database UPDATE organization_memberships SET role='admin'
   ↓
3. invalidate_org_access_cache(user_id, 'brand')
   ↓
4. L2 cache entry deleted for that user
   ↓
5. User's next request fetches fresh permissions from database
```

#### Brand-Agency Connection Cache

**Function**: `invalidate_brand_agency_connection_cache()`  
**Location**: `team/connections.rs:113-127`  
**Purpose**: Clear connection status after relationship changes  

**Implementation**:
```rust
pub fn invalidate_brand_agency_connection_cache(
    state: &AppState, 
    brand_id: &str, 
    agency_id: &str
) {
    let cache_key = format!(
        "{}:{}",
        CACHE_NAMESPACE_BRAND_AGENCY_CONN,
        crate::cache::cache_key(brand_id, agency_id)
    );

    state.cache_l3.delete(&cache_key);

    tracing::debug!(
        brand_id = %brand_id,
        agency_id = %agency_id,
        "Brand-agency connection cache invalidated"
    );
}
```

**When Called**:
1. **Connection Accepted** - `face_profiles.rs:2645`
2. **Connection Disconnected** - `face_profiles.rs:2788, 2828`
3. **Connection Request Handled** - `brand_license_requests.rs:411`

#### Multi-Level Invalidation

**Function**: `invalidate_all_levels()`  
**Location**: `cache/helpers.rs:142-153`  
**Purpose**: Clear a key across all cache levels  

**Implementation**:
```rust
pub fn invalidate_all_levels(
    l1: &Arc<RwLock<RequestCache>>,
    l2: &Arc<SessionCache>,
    l3: &Arc<ApplicationCache>,
    session_id: &str,
    key: &str,
) {
    l1.write().delete(key);
    l2.delete(session_id, key);
    l3.delete(key);
    debug!(key = %key, "Cache invalidated across all levels");
}
```

**When Called**:
- Complex mutations that affect multiple cache layers
- Rare scenarios requiring complete cache reset

#### Session Invalidation

**Function**: `invalidate_session()`  
**Location**: `cache/helpers.rs:156-159`  
**Purpose**: Clear all cache entries for a session  

**Implementation**:
```rust
pub fn invalidate_session(l2: &Arc<SessionCache>, session_id: &str) {
    l2.clear_session(session_id);
    debug!(session_id = %session_id, "Session cache cleared");
}
```

**When Called**:
- User logout
- Session expiration
- Security-related session termination

---

## Implementation Details

### Pattern: Database Update → Cache Invalidation

The platform follows a consistent pattern for cache invalidation:

**Step 1**: Perform database mutation
```rust
let resp = state
    .pg
    .from("organization_memberships")
    .update(json!({ "role": new_role }))
    .execute()
    .await?;
```

**Step 2**: Invalidate cache immediately
```rust
invalidate_org_access_cache(&state, &user_id, org_type);
```

**Step 3**: Log for observability
```rust
tracing::info!(
    user_id = %user_id,
    org_type = %org_type,
    "User role updated and cache invalidated"
);
```

**Step 4**: Write audit log
```rust
write_audit_log(&state, AuditLogEntry { /* ... */ }).await?;
```

### Real-World Example: Role Update

**File**: `team/handlers.rs:255-380`

```rust
pub async fn update_member_role(
    State(state): State<AppState>,
    user: AuthUser,
    Path(target_user_id): Path<String>,
    Query(query): Query<TeamScopeQuery>,
    Json(payload): Json<UpdateMemberRolePayload>,
) -> Result<Json<MembershipRecord>, (StatusCode, String)> {
    // 1. Permission check
    let scope = resolve_scope(&state, &user, &query).await?;
    ensure_permission(&scope.membership, Permission::UpdateMemberRoles)?;

    // 2. Validate role transition
    let next_role = parse_assignable_role(payload.role.as_str())?;

    // 3. Update database
    let resp = state
        .pg
        .from("organization_memberships")
        .eq("user_id", target_user_id.as_str())
        .update(json!({
            "role": next_role.as_str(),
            "updated_at": now_rfc3339(),
            "last_role_changed_at": now_rfc3339(),
        }))
        .execute()
        .await?;

    // 4. Invalidate cache (CRITICAL)
    invalidate_org_access_cache(&state, &target_user_id, scope.organization_type.as_str());

    // 5. Log and audit
    tracing::info!(/* ... */);
    write_audit_log(/* ... */).await?;

    Ok(Json(updated))
}
```

### Frontend Cache Management

**File**: `likelee-ui/src/features/team/useTeamAccess.ts`

The frontend implements session-scoped caching:

```typescript
// Cache key structure
function getAccessCacheKey(organizationType: string) {
  return `team_access_context:${organizationType}`;
}

// Cache read
const cachedRaw = window.sessionStorage.getItem(
  getAccessCacheKey(organizationType)
);

// Cache write
window.sessionStorage.setItem(
  getAccessCacheKey(organizationType),
  JSON.stringify(context)
);
```

**Frontend Cache Invalidation** (Future Enhancement):
```typescript
// Should be called when receiving role change notification
const refresh = React.useCallback(async () => {
  sessionStorage.removeItem(getAccessCacheKey(organizationType));
  await load();  // Force API fetch
}, [organizationType]);
```

---

## Best Practices

### DO ✅

1. **Always invalidate cache after database mutations**
   ```rust
   // ✅ Good
   state.pg.update(/* ... */).await?;
   invalidate_org_access_cache(&state, &user_id, &org_type);
   ```

2. **Use specific invalidation functions**
   ```rust
   // ✅ Good - Specific invalidation
   invalidate_org_access_cache(&state, &user_id, "brand");
   
   // ❌ Bad - Overly broad
   state.cache_l2.clear_session(&session_id);  // Clears everything
   ```

3. **Log cache invalidation events**
   ```rust
   // ✅ Good
   tracing::info!(user_id = %user_id, "Cache invalidated");
   ```

4. **Follow the pattern: Update DB → Invalidate → Audit**
   ```rust
   // ✅ Good - Correct order
   db_update().await?;
   invalidate_cache();
   write_audit_log().await?;
   ```

### DON'T ❌

1. **Don't forget to invalidate after writes**
   ```rust
   // ❌ Bad - Missing invalidation
   state.pg.update(/* ... */).await?;
   // User sees stale permissions for 5 minutes!
   ```

2. **Don't rely solely on TTL**
   ```rust
   // ❌ Bad - Waiting for TTL
   // "Permissions will update in 5 minutes" is unacceptable UX
   ```

3. **Don't invalidate before database success**
   ```rust
   // ❌ Bad - Premature invalidation
   invalidate_cache();  // What if DB update fails?
   state.pg.update(/* ... */).await?;
   ```

4. **Don't skip logging**
   ```rust
   // ❌ Bad - Silent invalidation
   invalidate_cache();  // How do you debug this?
   ```

### Performance Considerations

| Scenario | Approach | Reason |
|----------|----------|--------|
| Single user affected | L2 invalidation | Minimal impact |
| Multiple users affected | Loop with L2 invalidation | Batch if >100 users |
| Global config change | L3 invalidation | Affects all users |
| Security event | `invalidate_session()` | Complete clearance |

---

## Troubleshooting

### Symptoms of Cache Invalidation Issues

#### Stale Permissions

**Symptom**: User's permissions don't update after role change  
**Cause**: Missing `invalidate_org_access_cache()` call  
**Diagnosis**:
```bash
# Check logs for invalidation
grep "cache invalidated" /var/log/likelee-server.log

# Check if function is called
grep "invalidate_org_access_cache" likelee-server/src/**/*.rs
```

**Fix**: Add invalidation after database update

#### Incorrect Connection Status

**Symptom**: Brand-agency connection shows wrong status  
**Cause**: Missing `invalidate_brand_agency_connection_cache()` call  
**Diagnosis**:
```rust
// Add debug logging
tracing::debug!("Connection updated, invalidating cache");
invalidate_brand_agency_connection_cache(&state, &brand_id, &agency_id);
```

### Debug Tools

#### Enable Cache Logging

```bash
# Set log level
export RUST_LOG=likelee_server::cache=debug,likelee_server::team=debug

# Run server
cargo run
```

#### Manual Cache Inspection

```rust
// Check cache metrics
let metrics = &state.cache_metrics;
println!("L1 hits: {}", metrics.hits(CacheLevel::L1));
println!("L2 hits: {}", metrics.hits(CacheLevel::L2));
println!("L3 hits: {}", metrics.hits(CacheLevel::L3));
```

#### Frontend Cache Check

```javascript
// Browser console
const orgType = 'brand';
const key = `team_access_context:${orgType}`;
const cached = sessionStorage.getItem(key);
console.log('Cached permissions:', JSON.parse(cached));

// Clear if stale
sessionStorage.removeItem(key);
```

### Common Issues and Solutions

| Issue | Cause | Solution |
|-------|-------|----------|
| Permissions not updating | Missing invalidation | Add `invalidate_org_access_cache()` |
| Slow permission refresh | Cache not cleared | Invalidate after role update |
| Frontend shows old data | sessionStorage not cleared | Add refresh mechanism |
| Inconsistent across tabs | Different session caches | Use broadcast channel |

---

## Cache Invalidation Checklist

When implementing a mutation that affects cached data:

- [ ] Identify all cache layers involved (L1, L2, L3)
- [ ] Call appropriate invalidation function after DB write
- [ ] Add tracing/logging for observability
- [ ] Update audit log
- [ ] Test the invalidation flow
- [ ] Document in code comments

### Example Checklist for Role Update

```rust
// ✅ Mutation identified: organization_memberships.role update
// ✅ Cache layers: L2 (org_access)
// ✅ Invalidation: invalidate_org_access_cache()
// ✅ Tracing: Added info log
// ✅ Audit: write_audit_log()
// ✅ Tested: Verified permissions update immediately
// ✅ Documented: This file
```

---

## Related Documentation

- [Access Control System](./ACCESS_CONTROL_SYSTEM.md) - RBAC permission system
- [Team Member Functionality](./team-member-functionality.md) - Team management
- [Architecture Overview](./knowledge/architecture.md) - System architecture

---

## Change History

### 2026-04-14
- **Added**: Cache invalidation for `update_member_role` function
- **Added**: Cache invalidation for `accept_invite_by_token` function
- **Documented**: Complete cache invalidation system
- **Pattern**: Follows existing brand-agency connection invalidation pattern
- **Impact**: Immediate permission propagation (no more 5-minute wait)
