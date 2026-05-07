# Licensed Assets in Likelee Studio

**Version**: 1.0  
**Last Updated**: 2026-05-07

This document describes how brand-licensed assets flow from campaign offers into the Likelee Studio asset picker, where brands can use them for AI generation.

---

## Overview

Brands can use assets they've licensed through Likelee campaigns as reference material in the Studio (AI image/video generation). The system sources these assets from two flows:

1. **Campaign Offer Deliverables** — assets from paid campaign offers (brand campaigns)
2. **Brand Licensed Deliverables** — assets from approved brand licensing requests

All licensed assets appear in the **Licensed Assets** tab of the Studio Asset Picker, grouped by campaign and talent.

---

## Data Flow

```
┌──────────────────────────────────────────────────────────────────┐
│                    Licensed Asset Sources                         │
├──────────────────────────────────────────────────────────────────┤
│                                                                   │
│  ┌─────────────────────┐    ┌─────────────────────────────┐     │
│  │  Campaign Offers    │    │  Brand License Requests     │     │
│  │                     │    │                             │     │
│  │  campaign_offers    │    │  brand_license_requests     │     │
│  │    ├── payment_status│    │    ├── status = 'approved'  │     │
│  │    ├── expires_at   │    │                             │     │
│  │    └── status       │    │                             │     │
│  │         ↓           │    │         ↓                   │     │
│  │  campaign_offer_    │    │  brand_licensed_            │     │
│  │  deliverables       │    │  deliverables               │     │
│  │    ├── status       │    │    ├── asset_type           │     │
│  │    ├── asset_url    │    │    ├── asset_url            │     │
│  │    └── brand_id     │    │    ├── talent_name          │     │
│  └─────────────────────┘    │    └── campaign_title       │     │
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

## Source 2: Brand Licensed Deliverables

### Tables Involved

| Table | Purpose |
|-------|---------|
| `brand_license_requests` | Brand-initiated licensing requests |
| `brand_licensed_deliverables` | Auto-generated deliverables when a license is approved |

### Filtering Criteria

| Criterion | Field | Value |
|-----------|-------|-------|
| **Approved** | `brand_license_requests.status` | `'approved'` |
| **Not Deleted** | `brand_licensed_deliverables.deleted_at` | `NULL` |
| **Brand-Owned** | `brand_licensed_deliverables.brand_id` | Current brand ID |

### Asset Types

`brand_licensed_deliverables` contains three asset types:

| Asset Type | Source |
|------------|--------|
| `profile_photo` | Talent's profile photo from `agency_users` |
| `voice_recording` | Talent's voice recordings from `voice_recordings` |
| `portfolio_image` | Talent's portfolio images from `portfolio_items` |

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

### Query Flow (Backend)

```rust
// 1. Fetch campaign offer deliverables
SELECT id, asset_type, caption, status, offer_id,
       brand_campaigns(name),
       campaign_offers(payment_status, expires_at)
FROM campaign_offer_deliverables
WHERE brand_id = :brand_id
  AND status = 'approved'

// 2. Filter in Rust:
//    - payment_status == 'paid'
//    - expires_at IS NULL OR expires_at > now()

// 3. Fetch brand licensed deliverables
SELECT id, talent_name, campaign_title
FROM brand_license_requests
WHERE brand_id = :brand_id
  AND status = 'approved'

// 4. For each license, fetch deliverables
SELECT id, asset_type, asset_name, asset_url, mime_type
FROM brand_licensed_deliverables
WHERE license_request_id = :req_id
  AND deleted_at IS NULL
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
| `likelee-server/src/licensed_deliverables.rs` | Brand licensed deliverables CRUD |
| `likelee-ui/src/components/studio/StudioAssetPicker.tsx` | Frontend asset picker component |
| `likelee-ui/src/api/studio.ts` | Frontend API client |
| `supabase/migrations/2026-03-06_brand_campaigns_phase2_workflow.sql` | `campaign_offer_deliverables` table |
| `supabase/migrations/2026-03-21_campaign_offer_payment_flow_consolidated.sql` | Payment status fields |
| `supabase/migrations/2026-05-07_licensed_deliverable_context_type.sql` | `brand_licensed_deliverables` table |

---

## Related Documentation

- [ARCHITECTURE.md](../ARCHITECTURE.md) - System architecture overview
- [database/er-diagram.md](../database/er-diagram.md) - Database schema
- [storage/README.md](../storage/README.md) - Storage documentation
