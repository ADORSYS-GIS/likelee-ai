# Likelee AI Storage Documentation

**Version**: 2.1  
**Last Updated**: 2026-05-06  
**Status**: Active

Welcome to the Likelee AI Storage Documentation. This directory contains comprehensive documentation about how storage is organized and managed in the Likelee AI platform.

---

## Quick Navigation

| Document | Purpose | Best For |
|----------|---------|----------|
| [architecture.md](./architecture.md) | Complete storage architecture guide | Understanding the full storage system |
| [client-server-cache.md](./client-server-cache.md) | Client/server caching layers | Understanding React Query, IndexedDB, and in-memory caches |
| [organization-diagram.md](./organization-diagram.md) | Visual diagrams and flows | Quick visual understanding, presentations |
| [testing-guide.md](./testing-guide.md) | Live testing procedures | Testing storage operations |

---

## Storage at a Glance

### Three Buckets

| Bucket | Purpose | Access | Examples |
|--------|---------|--------|----------|
| **likelee-public** | Public media | Direct URL | Reference images, portfolios |
| **likelee-private** | Private assets | Backend proxy (service role) | Voice recordings, agency files, contracts |
| **likelee-temp** | Temporary | Internal | Staged uploads, processing |

### Twelve Asset Types

| Asset Type | Owner | Bucket | Quota |
|------------|-------|--------|-------|
| Agency Storage | Agency | Private | ✅ Yes |
| Client Files | Agency | Private | ✅ Yes |
| Talent Assets | Agency | Public | ✅ Yes |
| Talent Portfolio | Agency | Public | ✅ Yes |
| Booking Files | Agency | Private | ✅ Yes |
| Deliverables | Agency | Private | ✅ Yes |
| Reference Images | Creator | Public | ❌ No |
| Voice Recordings | User | Private | ❌ No |
| Tax Documents | Agency | Private | ✅ Yes |
| Brand Voice Assets | Brand | Private | ✅ Yes |
| Studio Docs | User | Private | ❌ No |
| Campaign Offer Deliverables | Agency | Private | ✅ Yes |

---

## Key Concepts

### Dual-Write Architecture

Every storage operation writes to **two** places:

1. **Business Table** - Domain-specific fields and relationships
2. **Storage Registry** - Centralized storage metadata in `public.storage_assets`

This separation keeps domain models clean while enabling powerful storage management.

### Quota Attribution

- **Agency-owned assets** (operational files) → Count toward quota
- **Creator-owned assets** (source materials) → Do NOT count toward quota

This ensures agencies aren't charged for creator-provided source materials.

### Private Bucket Access

Private files are accessed via backend proxy endpoints using service role credentials. Direct client SELECT access to the private bucket is intentionally blocked. Do not rely on signed URLs for private bucket reads.

### Path Pattern

```
{owner_type}/{owner_id}/{context}/{timestamp}_{sanitized_filename}

Example:
users/550e8400/voice-recordings/1234567890123_sample.webm
```

---

## Common Questions

### Where is X stored?

See the Asset Matrix in [architecture.md](./architecture.md#asset-organization).

### Does X count toward quota?

See the Quota Attribution section in [architecture.md](./architecture.md#quota-attribution).

### How do I implement storage for a new asset type?

See the Implementation Guidelines in [architecture.md](./architecture.md#implementation-guidelines).

---

## Related Code

- `likelee-server/src/storage/mod.rs` - Shared storage module
- `likelee-server/src/voice.rs` - Voice recording handlers
- `likelee-server/src/reference_images.rs` - Reference image handlers
- `likelee-server/src/talent.rs` - Talent portfolio handlers
- `supabase/migrations/` - Storage assets table migration
- `public.storage_assets` - Storage registry table
