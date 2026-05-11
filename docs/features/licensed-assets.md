# Licensed Assets in Likelee Studio

**Version**: 1.0  
**Last Updated**: 2026-05-07

This document describes how brand-licensed assets flow from campaign offers into the Likelee Studio asset picker, where brands can use them for AI generation.

---

## Overview

Brands can use assets they've licensed through Likelee campaigns as reference material in the Studio (AI image/video generation). The system sources these assets from two flows:

1. **Campaign Offer Deliverables** — assets from paid campaign offers (brand campaigns)
2. **Agency Catalog Assets** — assets from approved licensing requests via agency catalogs

All licensed assets appear in the **Licensed Assets** tab of the Studio Asset Picker, grouped by campaign and talent.

---

## Data Flow

```
┌──────────────────────────────────────────────────────────────────┐
│                    Licensed Asset Sources                         │
├──────────────────────────────────────────────────────────────────┤
│                                                                   │
│  ┌─────────────────────┐    ┌─────────────────────────────┐     │
│  │  Campaign Offers    │    │  Licensing Requests         │     │
│  │                     │    │                             │     │
│  │  campaign_offers    │    │  licensing_requests         │     │
│  │    ├── payment_status│    │    ├── status = 'approved'  │     │
│  │    ├── expires_at   │    │                             │     │
│  │    └── status       │    │         ↓                   │     │
│  │         ↓           │    │  agency_catalogs            │     │
│  │  campaign_offer_    │    │    ├── expires_at           │     │
│  │  deliverables       │    │    └── licensing_request_id │     │
│  │    ├── status       │    │         ↓                   │     │
│  │    ├── asset_url    │    │  agency_catalog_items       │     │
│  │    └── brand_id     │    │         ↓                   │     │
│  └─────────────────────┘    │  agency_catalog_assets      │     │
│                             │    ├── reference_images     │     │
│                             │    └── agency_files         │     │
│                             └─────────────────────────────┘     │
│                                                                   │
│                            ↓                                      │
│              ┌─────────────────────────┐                         │
│              │  GET /api/studio/       │                         │
│              │  licensed-assets         │                         │
│              │  (studio/routes.rs)      │                         │
│              └─────────────────────────┘                         │
│                            ↓                                      │
│              ┌─────────────────────────┐                         │
│              │  Studio Asset Picker     │                         │
│              │  (Licensed Assets tab)   │                         │
│              │  Grouped by:             │                         │
│              │   Campaign → Talent      │                         │
│              └─────────────────────────┘                         │
└──────────────────────────────────────────────────────────────────┘
```

---

## Source 1: Campaign Offer Deliverables

### Tables Involved

| Table | Purpose |
|-------|---------|
| `campaign_offers` | Brand campaign offers with payment status |
| `campaign_offer_deliverables` | Submitted deliverables for each offer |
| `brand_campaigns` | Campaign metadata (name, etc.) |

### Filtering Criteria

Assets are included only when **all** conditions are met:

| Criterion | Field | Value |
|-----------|-------|-------|
| **Paid** | `campaign_offers.payment_status` | `'paid'` |
| **Not Expired** | `campaign_offers.expires_at` | `NULL` or `> now()` |
| **Approved** | `campaign_offer_deliverables.status` | `'approved'` |
| **Brand-Owned** | `campaign_offer_deliverables.brand_id` | Current brand ID |

### Deliverable Statuses

The `campaign_offer_deliverables.status` field tracks the review workflow:

```
submitted → agency_review → brand_review → brand_approved → approved (final)
                                        ↘ changes_requested
                                        ↘ rejected
```

Only `'approved'` (final) deliverables are shown in the licensed assets list.

### Payment Status

The `campaign_offers.payment_status` field has three values:

| Value | Meaning |
|-------|---------|
| `'unpaid'` | Brand has not yet paid |
| `'paid'` | Payment confirmed — deliverables are licensed |
| `'processing'` | Payment in progress |

---

## Source 2: Agency Catalog Assets

### Tables Involved

| Table | Purpose |
|-------|---------|
| `licensing_requests` | Brand-initiated licensing requests |
| `agency_catalogs` | Catalogs linked to approved license requests |
| `agency_catalog_items` | Items within each catalog (per-talent) |
| `agency_catalog_assets` | Image assets linked to catalog items |
| `agency_catalog_recordings` | Voice recordings linked to catalog items |
| `reference_images` | Talent reference images |
| `agency_files` | Agency-uploaded files |
| `voice_recordings` | Talent voice recordings |

### Filtering Criteria

| Criterion | Field | Value |
|-----------|-------|-------|
| **Approved** | `licensing_requests.status` | `'approved'` |
| **Not Expired** | `agency_catalogs.expires_at` | `NULL` or `> now()` |
| **Entitled** | Payment verification | Active subscription or completed checkout |
| **Brand-Owned** | `licensing_requests.brand_id` | Current brand ID |

### Asset Types

Agency catalogs contain assets from these sources:

| Asset Type | Source Table | Description |
|------------|--------------|-------------|
| `image` | `reference_images` | Talent reference photos |
| `image` | `agency_files` | Agency-uploaded images |
| `audio` | `voice_recordings` | Talent voice recordings |

### Access Control

All asset URLs are served as **signed URLs** (24-hour expiry) to ensure access control:
- Direct public Supabase URLs are not exposed
- URLs are generated server-side with the service key
- Entitlement is verified per-license before returning assets

---

## Backend Implementation

### Endpoint

```
GET /api/studio/licensed-assets
```

**Location**: `likelee-server/src/studio/routes.rs`

**Function**: `list_licensed_assets()` → `fetch_brand_licensed_assets()`

### Response Format

```json
{
  "assets": [
    {
      "id": "campaign-deliverable-{uuid}",
      "type": "image" | "audio" | "video",
      "name": "Caption or filename",
      "url": "/api/campaign-offers/{offer_id}/deliverables/{id}/file",
      "campaign_name": "Campaign Name",
      "talent_name": "Talent Name",
      "source": "licensed"
    }
  ]
}
```

### URL Format

Campaign deliverables use the **secure file endpoint**:

```
/api/campaign-offers/{offer_id}/deliverables/{id}/file
```

This endpoint requires authentication and serves the asset through the backend, ensuring access control is enforced.

Agency catalog assets use **signed URLs** generated server-side:

```
{supabase_url}/storage/v1/object/sign/{bucket}/{path}?token=...
```

These URLs expire after 24 hours and cannot be accessed without proper entitlement verification.

### Query Flow (Backend)

```rust
// 1. Fetch approved licensing_requests for brand
SELECT id, talent_id, talent_name, campaign_title, status
FROM licensing_requests
WHERE brand_id = :brand_id
  AND status = 'approved'

// 2. For each license, verify entitlement:
//    - Check licensing_access_grants for active subscription
//    - Check licensing_checkout_sessions for completed payment

// 3. For entitled licenses, find linked catalog
SELECT id, title, expires_at
FROM agency_catalogs
WHERE licensing_request_id = :license_id

// 4. Check catalog expiry using DateTime comparison

// 5. Get catalog items
SELECT id, talent_id
FROM agency_catalog_items
WHERE catalog_id = :catalog_id

// 6. For each item, get assets and recordings
SELECT id, asset_id, asset_type
FROM agency_catalog_assets
WHERE catalog_item_id = :item_id

// 7. Generate signed URLs for assets
// Uses generate_signed_url() with 24-hour expiry

// 8. Get campaign offer deliverables for paid offers
SELECT id, asset_type, caption, status, offer_id,
       brand_campaigns(name),
       campaign_offers(payment_status, expires_at)
FROM campaign_offer_deliverables
WHERE brand_id = :brand_id
  AND status = 'approved'

// 9. Filter: payment_status == 'paid' AND expires_at > now()
```

---

## Frontend Implementation

### Component

**Location**: `likelee-ui/src/components/studio/StudioAssetPicker.tsx`

### Data Fetching

```typescript
const { data: licensedData } = useQuery({
  queryKey: ["studio", "licensed-assets"],
  queryFn: () =>
    base44.get<{ assets: StudioAsset[] }>("/api/studio/licensed-assets"),
  enabled: open && tab === "licensed",
  staleTime: 60_000, // 1 minute cache
});
```

### Grouping Logic

Assets are grouped hierarchically for display:

```
Campaign: "Summer 2026 Launch"
├── Talent: "Jane Doe"
│   ├── Asset 1
│   └── Asset 2
└── Talent: "John Smith"
    └── Asset 3

Campaign: "Holiday Campaign"
└── Talent: "Jane Doe"
    └── Asset 4
```

**Grouping key**: `campaign_name` → `talent_name`

Assets without a campaign name are grouped under `"Uncategorized"`. Assets without a talent name are grouped under `"Unknown Talent"`.

### Asset Type

```typescript
export type StudioAsset = {
  id: string;
  type: "image" | "audio" | "video";
  name: string;
  url: string;
  campaign_name?: string;
  talent_name?: string;
  source: "upload" | "licensed" | "storage";
  storage_path?: string;
  folder_name?: string;
};
```

---

## Related Files

| File | Purpose |
|------|---------|
| `likelee-server/src/studio/routes.rs` | Backend endpoint implementation |
| `likelee-ui/src/components/studio/StudioAssetPicker.tsx` | Frontend asset picker component |
| `likelee-ui/src/api/studio.ts` | Frontend API client |
| `supabase/migrations/2026-03-06_brand_campaigns_phase2_workflow.sql` | `campaign_offer_deliverables` table |
| `supabase/migrations/2026-03-21_campaign_offer_payment_flow_consolidated.sql` | Payment status fields |
| `supabase/migrations/0056_agency_catalogs.sql` | `agency_catalogs` and related tables |

---

## Related Documentation

- [ARCHITECTURE.md](../ARCHITECTURE.md) - System architecture overview
- [database/er-diagram.md](../database/er-diagram.md) - Database schema
- [storage/README.md](../storage/README.md) - Storage documentation
