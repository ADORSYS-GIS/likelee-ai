# Data Storage Architecture

## Overview

Likelee uses a multi-layered storage strategy spanning browser, server, and database. This document explains where data is stored at each layer and how the prefetchers fit into this architecture.

---

## Storage Layers

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
│  │  Storage Buckets:                                                   │   │
│  │  • likelee-public  (avatars, portfolios)                          │   │
│  │  • likelee-private (contracts, sensitive docs)                    │   │
│  │  • likelee-temp    (upload staging)                               │   │
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

```typescript
// Prefetcher stores data here
queryClient.prefetchQuery({
  queryKey: ["agency", "roster", agencyId],
  queryFn: () => fetchRoster(),
  staleTime: 30 * 1000, // 30 seconds
});

// Component reads from same cache
const { data } = useQuery({
  queryKey: ["agency", "roster", agencyId],
});
```

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
```typescript
const INDEXED_DB_QUERIES = [
  "agency-roster",      // Large talent lists
  "agency-dashboard",   // Dashboard overview
  "talentMe",          // Profile data
  "talentBookings",    // Booking lists
  "marketplace",       // Marketplace listings
  "jobs",              // Job listings
  "scouting",          // Scouting data
];
```

**Flow**:
```
1. React Query cache updated
        │
        ▼ (persister subscribes to cache events)
2. Check if query key matches INDEXED_DB_QUERIES
        │
        ▼
3. Save to IndexedDB with timestamp + version
        │
        ▼
4. On app init: Load from IndexedDB → React Query cache
```

**Max Age**: 30 minutes (older data discarded)

### 3. localStorage (Small Settings)

**Location**: Browser localStorage (disk storage)  
**Purpose**: Small configuration data only

```typescript
const LOCAL_STORAGE_QUERIES = [
  "talentPortalSettings",
  "agency-payout-settings",
];
```

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

**Example**: Multiple permission checks in one request

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

See [CACHE_INVALIDATION.md](./CACHE_INVALIDATION.md) for details.

---

## Database (Supabase)

### PostgreSQL

**Primary storage** for all persistent data:
- User profiles and authentication
- Organization memberships and roles
- Licensing requests and contracts
- Bookings, invoices, payments
- Roster relationships

### Storage Buckets

| Bucket | Purpose | Access |
|--------|---------|--------|
| `likelee-public` | Avatars, portfolio images | Public read |
| `likelee-private` | Contracts, sensitive docs | Backend-only (service role) |
| `likelee-temp` | Upload staging | Auto-cleanup |

---

## Prefetcher Data Flow

When the prefetchers run on app startup:

```
1. User logs in → Auth confirmed
        │
        ▼
2. BrandDataPrefetcher/AgencyDataPrefetcher/CreatorDataPrefetcher
   mount in Layout.tsx
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

## Query Key Structure

Prefetchers use structured query keys for cache organization:

```typescript
// Brand keys
["brand", "jobs"]                           // All brand jobs
["brand", "inbox", "packages"]              // Inbox packages
["brand", "billing", "status"]              // Billing status

// Agency keys
["agency", "dashboard", agencyId]             // Dashboard overview
["agency", "roster", agencyId]                // Talent roster
["agency", "clients", agencyId]               // CRM clients
["agency", "licensingRequests", agencyId]     // Licensing requests

// Creator keys
["creator", "dashboard"]                    // Creator dashboard
["creator", "rates"]                          // Custom rates
["creator", "bookings"]                     // Bookings list
["creator", "brand-connections", "requests"] // Connection requests
```

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

## Troubleshooting

### Data Not Persisting After Refresh

Check IndexedDB:
```javascript
// Browser DevTools → Application → IndexedDB
await indexedDB.databases();
// Should show "LikeleeCache" database
```

### Cache Size Too Large

IndexedDB entries are automatically pruned:
- Max age: 30 minutes
- GC time: Configured per query type (5 min - 2 hours)

### Prefetcher Not Running

Check React Query DevTools:
1. Install React Query DevTools browser extension
2. Look for prefetch queries on startup
3. Should see "fresh" (green) queries before navigating to tabs

### Server Cache Stale

Since there's no Redis, each server instance has its own cache:
- Horizontal scaling → Each server has independent cache
- TTL ensures eventual consistency
- Explicit invalidation for immediate updates

---

## Related Documentation

- [CACHE_INVALIDATION.md](./CACHE_INVALIDATION.md) - Server cache invalidation
- [Frontend Architecture](../likelee-ui/docs/architecture/) - React Query patterns
