# Client/Server Cache Architecture

**Version**: 1.0  
**Last Updated**: 2026-05-06  

This document explains the multi-layered storage and caching strategy spanning browser, server, and database.

---

## Storage Layers Overview

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                           CLIENT (Browser)                                   │
├─────────────────────────────────────────────────────────────────────────────┤
│                                                                              │
│  ┌─────────────────────────────────────────────────────────────────────┐   │
│  │                    PREFETCHER DATA FLOW                              │   │
│  │                                                                      │   │
│  │   API Response ──► React Query Cache ──► IndexedDB/localStorage     │   │
│  │        │                  │                                           │   │
│  │        │                  ▼                                           │   │
│  │        │         ┌─────────────────┐                                 │   │
│  │        │         │  IN-MEMORY      │ ◄── Components read from here   │   │
│  │        │         │  (JavaScript    │     via useQuery() hooks        │   │
│  │        │         │   heap)         │                                 │   │
│  │        │         └─────────────────┘                                 │   │
│  │        │                  │                                           │   │
│  │        │                  ▼ (automatic)                               │   │
│  │        │         ┌─────────────────┐                                 │   │
│  │        └────────►│  INDEXEDDB      │ ──► Survives page refresh       │   │
│  │                  │  (Browser disk) │     Restored on app init          │   │
│  │                  └─────────────────┘                                 │   │
│  │                           ▲                                          │   │
│  │                           │                                          │   │
│  │                  ┌─────────────────┐                                 │   │
│  │                  │  LOCALSTORAGE   │ ──► Small settings only         │   │
│  │                  │  (Browser disk) │                                 │   │
│  │                  └─────────────────┘                                 │   │
│  │                                                                      │   │
│  └─────────────────────────────────────────────────────────────────────┘   │
│                                                                              │
└─────────────────────────────────────────────────────────────────────────────┘
                                      │
                                      ▼ HTTP/HTTPS
┌─────────────────────────────────────────────────────────────────────────────┐
│                           SERVER (Rust/Axum)                                 │
├─────────────────────────────────────────────────────────────────────────────┤
│                                                                              │
│  ┌─────────────────────────────────────────────────────────────────────┐   │
│  │                    IN-MEMORY CACHE (No Redis)                      │   │
│  │                                                                      │   │
│  │  ┌─────────────┐  ┌─────────────┐  ┌─────────────┐                   │   │
│  │  │   L1 Cache  │  │   L2 Cache  │  │   L3 Cache  │                   │   │
│  │  │ (Request    │  │ (Session    │  │ (App-wide   │                   │   │
│  │  │  scoped)    │  │  scoped)    │  │  shared)    │                   │   │
│  │  │             │  │             │  │             │                   │   │
│  │  │ DashMap     │  │ DashMap     │  │ DashMap     │                   │   │
│  │  │ RwLock      │  │             │  │             │                   │   │
│  │  └─────────────┘  └─────────────┘  └─────────────┘                   │   │
│  │        │                │                │                           │   │
│  │        └────────────────┴────────────────┘                           │   │
│  │                         │                                            │   │
│  │                         ▼                                            │   │
│  │              ┌─────────────────┐                                   │   │
│  │              │  PostgREST      │                                   │   │
│  │              │  Client         │                                   │   │
│  │              └─────────────────┘                                   │   │
│  │                         │                                            │   │
│  └─────────────────────────┼────────────────────────────────────────────┘   │
│                            │                                                │
└────────────────────────────┼────────────────────────────────────────────────┘
                             │
                             ▼
┌─────────────────────────────────────────────────────────────────────────────┐
│                           DATABASE (Supabase)                              │
├─────────────────────────────────────────────────────────────────────────────┤
│                                                                              │
│  ┌─────────────────────────────────────────────────────────────────────┐   │
│  │                    POSTGRESQL + STORAGE                            │   │
│  │                                                                      │   │
│  │  • User profiles, permissions, relationships                        │   │
│  │  • Licensing requests, bookings, invoices                         │   │
│  │  • File metadata in DB, files in Storage buckets                   │   │
│  │                                                                      │   │
│  └─────────────────────────────────────────────────────────────────────┘   │
│                                                                              │
└─────────────────────────────────────────────────────────────────────────────┘
```

---

## Client-Side Storage

### 1. React Query Cache (In-Memory)

**Location**: Browser JavaScript heap (RAM)  
**Library**: `@tanstack/react-query`  
**Purpose**: Primary data store for UI components

**Characteristics**:
- Fastest access (microseconds)
- Lost on page refresh
- Shared across all components using the same query key
- Automatic background refetching when stale

### 2. IndexedDB (Persistent)

**Location**: Browser's IndexedDB (disk storage)  
**File**: `likelee-ui/src/lib/indexedDbPersister.ts`  
**Purpose**: Survive page refreshes for large datasets

**Persisted Query Types**:
- `agency-roster` - Large talent lists
- `agency-dashboard` - Dashboard overview
- `talentMe` - Profile data
- `talentBookings` - Booking lists
- `marketplace` - Marketplace listings
- `jobs` - Job listings
- `scouting` - Scouting data

**Max Age**: 30 minutes (older data discarded)

### 3. localStorage (Small Settings)

**Location**: Browser localStorage (disk storage)  
**Purpose**: Small configuration data only

**Persisted Query Types**:
- `talentPortalSettings`
- `agency-payout-settings`

**Characteristics**:
- 5-10 MB limit
- Synchronous API
- Only for small JSON objects

---

## Server-Side Cache (In-Memory)

**Important**: Likelee does NOT use Redis. All server caching is in-memory using Rust's `DashMap` (concurrent HashMap).

### L1: Request Cache

**Scope**: Single HTTP request  
**Storage**: `RwLock<HashMap>`  
**Purpose**: Prevent duplicate queries within same request

### L2: Session Cache

**Scope**: User session (multiple requests)  
**Storage**: `DashMap` (thread-safe HashMap)  
**TTL**: 5-30 minutes  
**Purpose**: User-specific data like permissions

```rust
// Key structure: "namespace:user_id:resource"
"org_access:user123:brand"
```

### L3: Application Cache

**Scope**: All users (shared)  
**Storage**: `DashMap`  
**TTL**: 1-60 minutes  
**Purpose**: Shared data like brand-agency connections

```rust
// Key structure: "namespace:resource_id"
"brand_agency_conn:brand123:agency456"
```

### Cache Invalidation

Since there's no Redis, invalidation is done by:
1. **TTL expiration**: Automatic after configured time
2. **Explicit deletion**: `state.cache_l2.delete(key)`
3. **Session clearance**: `state.cache_l2.clear_session(session_id)`

**Key Cache Invalidation Points**:
- Role changes → `invalidate_org_access_cache()` (L2)
- Connection changes → `invalidate_brand_agency_connection_cache()` (L3)
- Security events → `invalidate_session()` (L2)

---

## Prefetcher Data Flow

When prefetchers run on app startup:

```
1. User logs in → Auth confirmed
        │
        ▼
2. BrandDataPrefetcher/AgencyDataPrefetcher/CreatorDataPrefetcher mount
        │
        ▼
3. Prefetchers call queryClient.prefetchQuery() for all relevant data
        │
        ▼
4. Data stored in React Query cache (in-memory)
        │
        ▼
5. IndexedDB persister detects cache updates → Saves to IndexedDB
        │
        ▼
6. User navigates to Dashboard tab
        │
        ▼
7. Component uses useQuery() with same query key
        │
        ▼
8. Data served instantly from cache (no API call if fresh)
```

**Result**: Dashboard tabs load instantly because data was prefetched in background.

---

## Performance Characteristics

| Layer | Latency | Capacity | Persistence |
|-------|---------|----------|-------------|
| React Query | ~1ms | ~50MB | Page lifetime |
| IndexedDB | ~10-50ms | ~100MB+ | Until cleared |
| localStorage | ~5ms | 5-10MB | Until cleared |
| Server L1/L2/L3 | ~1μs | Server RAM | Server lifetime |
| Database | ~50-200ms | Unlimited | Permanent |

---

## Query Key Structure

Prefetchers use structured query keys for cache organization:

```typescript
// Brand keys
["brand", "jobs"]
["brand", "inbox", "packages"]
["brand", "billing", "status"]

// Agency keys
["agency", "dashboard", agencyId]
["agency", "roster", agencyId]
["agency", "clients", agencyId]
["agency", "licensingRequests", agencyId]

// Creator keys
["creator", "dashboard"]
["creator", "rates"]
["creator", "bookings"]
["creator", "brand-connections", "requests"]
```

---

## Troubleshooting

### Data Not Persisting After Refresh

Check IndexedDB:
```javascript
// Browser DevTools → Application → IndexedDB
await indexedDB.databases();
// Should show "LikeleeCache" database
```

### Server Cache Stale

Since there's no Redis, each server instance has its own cache:
- Horizontal scaling → Each server has independent cache
- TTL ensures eventual consistency
- Explicit invalidation for immediate updates

---

## Related Documentation

- [architecture.md](./architecture.md) - Storage bucket architecture
- [CACHE_INVALIDATION.md](../CACHE_INVALIDATION.md) - Server cache invalidation details
