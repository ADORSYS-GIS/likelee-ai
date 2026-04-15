# Storage Architecture

This document defines the canonical storage model for Likelee AI. The goal is to keep business tables focused on domain semantics while centralizing storage ownership, object metadata, and lifecycle tracking in `public.storage_assets`.

## Buckets

- `likelee-public`: Publicly renderable media such as reference images, talent portfolio media, and agency-managed talent assets.
- `likelee-private`: Operational and permission-gated assets such as agency storage files, client files, booking files, deliverables, and voice recordings.
- `likelee-temp`: Reserved for staged uploads and short-lived processing assets.

## Canonical Registry

All new storage-backed writes should record a row in `public.storage_assets` with:

- ownership: `owner_type`, `owner_id`
- context: `context_type`, `context_id`
- access: `visibility`, `bucket_id`, `object_path`
- metadata: `original_file_name`, `mime_type`, `size_bytes`, `checksum_sha256`
- linkage: `source_table`, `source_id`, `created_by`
- accounting: `counts_toward_quota`
- lifecycle: `created_at`, `deleted_at`

Business tables remain the source of truth for workflow state, approvals, and domain-specific relationships.

## Asset Matrix

| Context | Owner | Visibility | Bucket | Canonical path prefix | Domain table |
|---|---|---|---|---|---|
| Agency file storage | Agency | Private | `likelee-private` | `agencies/{agency_id}/storage/...` | `agency_files` |
| Client files | Agency | Private | `likelee-private` | `agencies/{agency_id}/clients/{client_id}/files/...` | `agency_files` |
| Agency talent assets | Agency | Public | `likelee-public` | `agencies/{agency_id}/talents/{talent_id}/assets/...` | `agency_files` |
| Booking files | Agency | Private | `likelee-private` | `agencies/{agency_id}/bookings/{booking_id}/files/...` | `booking_files` |
| Booking deliverables | Agency or creator | Private | `likelee-private` | `agencies/{agency_id}/booking-campaigns/{campaign_id}/deliverables/...` | `booking_deliverables` |
| Campaign offer deliverables | Agency or creator | Private | `likelee-private` | `campaign-offers/{offer_id}/deliverables/...` | `campaign_offer_deliverables` |
| Reference images | Creator | Public | `likelee-public` | `creators/{creator_id}/reference-images/{section_id}/...` | `reference_images` |
| Voice recordings | User | Private | `likelee-private` | `users/{user_id}/voice-recordings/...` | `voice_recordings` |
| Talent portfolio media | Agency | Public | `likelee-public` | `agencies/{agency_id}/talents/{talent_id}/portfolio/...` | `talent_portfolio_items` |
| Tax documents | Agency | Private | `likelee-private` | `agencies/{agency_id}/talents/{talent_id}/tax-documents/...` | `talent_tax_documents` |
| Brand voice assets | Brand | Private | `likelee-private` | `brands/{brand_id}/voice-assets/...` | `brand_voice_assets` |
| Studio campaign docs | User | Private | `likelee-private` | `studio/campaigns/{campaign_id}/documents/...` | `studio_campaign_documents` |

## Implementation Rules

- Generate all bucket/path combinations through the shared server storage module.
- Use `organization_id` for agency-owned assets, not the acting team member `user.id`.
- Treat `storage_bucket + storage_path` as the source of truth for private objects. Legacy URL/path columns can remain for compatibility during migration.
- Soft-delete registry rows when objects are removed so quota, audits, and backfills remain traceable.
