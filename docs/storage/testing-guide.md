# Storage Modularization Live Testing Guide

**Purpose**: Test the storage implementation end-to-end in realistic scenarios  
**Date**: 2026-04-15  
**Ticket**: #499 - Storage Modularization

## Overview

This guide walks you through testing the storage implementation with real API calls, showing how files are stored, retrieved, and tracked in the `storage_assets` registry.

## Prerequisites

### 1. Start the Server

```bash
cd likelee-server
cargo run
# Server should start on http://localhost:8080
```

### 2. Set Up Test Users

You'll need authentication tokens for different user types:

```bash
# Get tokens from your authentication system or create test users
export CREATOR_TOKEN="your-creator-jwt-token"
export AGENCY_TOKEN="your-agency-jwt-token"
export BRAND_TOKEN="your-brand-jwt-token"
```

### 3. Database Access

Have access to your PostgreSQL database to inspect the `storage_assets` table:

```bash
# Connect to database
psql -h localhost -U postgres -d likelee

# Or use your Supabase connection
```

## Test Scenarios

---

## Scenario 1: Creator Uploads Reference Image

**Goal**: Test creator-owned, public assets that don't count toward quota

### Step 1: Upload Reference Image

```bash
# Upload a reference image
curl -X POST http://localhost:8080/api/reference-images/upload \
  -H "Authorization: Bearer $CREATOR_TOKEN" \
  -H "Content-Type: multipart/form-data" \
  -F "file=@test-images/portrait.jpg" \
  -F "section_id=section-123"
```

**Expected Response:**

```json
{
  "id": "ref-img-abc-123",
  "creator_id": "creator-456",
  "section_id": "section-123",
  "storage_bucket": "likelee-public",
  "storage_path": "creators/creator-456/reference-images/section-123/1234567890123_portrait.jpg",
  "mime_type": "image/jpeg",
  "created_at": "2026-04-15T10:00:00Z"
}
```

### Step 2: Verify in Database

```sql
-- Check the reference_images table
SELECT id, creator_id, storage_bucket, storage_path, mime_type
FROM reference_images
WHERE id = 'ref-img-abc-123';

-- Check the storage_assets registry
SELECT
  id,
  owner_type,
  owner_id,
  context_type,
  visibility,
  bucket_id,
  object_path,
  original_file_name,
  mime_type,
  size_bytes,
  source_table,
  source_id,
  counts_toward_quota,
  created_at
FROM storage_assets
WHERE source_table = 'reference_images'
  AND source_id = 'ref-img-abc-123';
```

**Expected Registry Entry:**

```
owner_type: creator
owner_id: creator-456
context_type: reference_image
visibility: public
bucket_id: likelee-public
object_path: creators/creator-456/reference-images/section-123/1234567890123_portrait.jpg
counts_toward_quota: false  ← Does NOT count toward quota
```

### Step 3: Access the Image

```bash
# Public images can be accessed directly
curl -I "https://your-supabase-url/storage/v1/object/public/likelee-public/creators/creator-456/reference-images/section-123/1234567890123_portrait.jpg"

# Should return 200 OK with image headers
```

### Step 4: Delete the Image

```bash
# Delete reference image
curl -X DELETE http://localhost:8080/api/reference-images/section-123 \
  -H "Authorization: Bearer $CREATOR_TOKEN"
```

### Step 5: Verify Deletion

```sql
-- Check reference_images table (should be deleted)
SELECT * FROM reference_images WHERE id = 'ref-img-abc-123';
-- Should return 0 rows

-- Check storage_assets registry (should be soft-deleted)
SELECT id, deleted_at
FROM storage_assets
WHERE source_table = 'reference_images'
  AND source_id = 'ref-img-abc-123';
-- Should have deleted_at timestamp
```

**✅ Success Criteria:**

- Image uploaded to public bucket
- Registry entry created with `counts_toward_quota = false`
- Image accessible via public URL
- Deletion removes DB record and soft-deletes registry entry

---

## Scenario 2: User Uploads Voice Recording

**Goal**: Test user-owned, private assets with signed URL access

### Step 1: Upload Voice Recording

```bash
# Upload voice recording
curl -X POST http://localhost:8080/api/voice/recordings \
  -H "Authorization: Bearer $CREATOR_TOKEN" \
  -H "Content-Type: multipart/form-data" \
  -F "file=@test-audio/sample.webm" \
  -F "emotion_tag=neutral"
```

**Expected Response:**

```json
{
  "id": "voice-rec-xyz-789",
  "user_id": "user-123",
  "storage_bucket": "likelee-private",
  "storage_path": "users/user-123/voice-recordings/1234567890123_sample.webm",
  "mime_type": "audio/webm",
  "emotion_tag": "neutral",
  "created_at": "2026-04-15T10:05:00Z"
}
```

### Step 2: Verify in Database

```sql
-- Check voice_recordings table
SELECT id, user_id, storage_bucket, storage_path, emotion_tag
FROM voice_recordings
WHERE id = 'voice-rec-xyz-789';

-- Check storage_assets registry
SELECT
  owner_type,
  owner_id,
  context_type,
  visibility,
  bucket_id,
  object_path,
  counts_toward_quota
FROM storage_assets
WHERE source_table = 'voice_recordings'
  AND source_id = 'voice-rec-xyz-789';
```

**Expected Registry Entry:**

```
owner_type: user
owner_id: user-123
context_type: voice_recording
visibility: private
bucket_id: likelee-private
counts_toward_quota: false  ← Does NOT count toward quota
```

### Step 3: Get Signed URL

```bash
# Request signed URL for private access
curl -X GET "http://localhost:8080/api/voice/recordings/signed-url?recording_id=voice-rec-xyz-789" \
  -H "Authorization: Bearer $CREATOR_TOKEN"
```

**Expected Response:**

```json
{
  "signed_url": "https://your-supabase-url/storage/v1/object/sign/likelee-private/users/user-123/voice-recordings/1234567890123_sample.webm?token=...",
  "expires_in": 300
}
```

### Step 4: Access via Signed URL

```bash
# Download using signed URL (valid for 5 minutes)
curl -o downloaded-sample.webm "https://your-supabase-url/storage/v1/object/sign/likelee-private/users/user-123/voice-recordings/1234567890123_sample.webm?token=..."

# Verify file downloaded
file downloaded-sample.webm
# Should show: WebM data
```

### Step 5: Delete Voice Recording

```bash
# Delete voice recording
curl -X DELETE http://localhost:8080/api/voice/recordings/voice-rec-xyz-789 \
  -H "Authorization: Bearer $CREATOR_TOKEN"
```

### Step 6: Verify Deletion

```sql
-- Check voice_recordings table (should be deleted)
SELECT * FROM voice_recordings WHERE id = 'voice-rec-xyz-789';

-- Check storage_assets registry (should be soft-deleted)
SELECT deleted_at FROM storage_assets
WHERE source_table = 'voice_recordings'
  AND source_id = 'voice-rec-xyz-789';
```

**✅ Success Criteria:**

- Recording uploaded to private bucket
- Registry entry created with `counts_toward_quota = false`
- Signed URL generated and works
- Direct access without signed URL fails (403)
- Deletion removes DB record and soft-deletes registry entry

---

## Scenario 3: Agency Uploads Talent Portfolio

**Goal**: Test agency-owned, public assets that count toward quota

### Step 1: Upload Portfolio Item

```bash
# Upload talent portfolio item
curl -X POST http://localhost:8080/api/talent/portfolio-items/upload \
  -H "Authorization: Bearer $AGENCY_TOKEN" \
  -H "Content-Type: multipart/form-data" \
  -F "file=@test-images/headshot.jpg" \
  -F "talent_id=talent-456" \
  -F "item_type=headshot"
```

**Expected Response:**

```json
{
  "id": "portfolio-item-def-456",
  "agency_id": "agency-789",
  "talent_id": "talent-456",
  "storage_bucket": "likelee-public",
  "storage_path": "agencies/agency-789/talents/talent-456/portfolio/1234567890123_headshot.jpg",
  "item_type": "headshot",
  "created_at": "2026-04-15T10:10:00Z"
}
```

### Step 2: Verify in Database

```sql
-- Check talent_portfolio_items table
SELECT id, agency_id, talent_id, storage_bucket, storage_path
FROM talent_portfolio_items
WHERE id = 'portfolio-item-def-456';

-- Check storage_assets registry
SELECT
  owner_type,
  owner_id,
  context_type,
  visibility,
  counts_toward_quota,
  size_bytes
FROM storage_assets
WHERE source_table = 'talent_portfolio_items'
  AND source_id = 'portfolio-item-def-456';
```

**Expected Registry Entry:**

```
owner_type: agency
owner_id: agency-789
context_type: talent_portfolio
visibility: public
counts_toward_quota: true  ← DOES count toward quota
```

### Step 3: Check Agency Quota Usage

```sql
-- Calculate agency's total storage usage
SELECT
  owner_id as agency_id,
  COUNT(*) as total_files,
  SUM(size_bytes) as total_bytes,
  ROUND(SUM(size_bytes) / 1024.0 / 1024.0, 2) as total_mb
FROM storage_assets
WHERE owner_type = 'agency'
  AND owner_id = 'agency-789'
  AND counts_toward_quota = true
  AND deleted_at IS NULL
GROUP BY owner_id;
```

**Expected Result:**

```
agency_id: agency-789
total_files: 15
total_bytes: 45000000
total_mb: 42.91
```

### Step 4: Access Portfolio Item

```bash
# Public portfolio items can be accessed directly
curl -I "https://your-supabase-url/storage/v1/object/public/likelee-public/agencies/agency-789/talents/talent-456/portfolio/1234567890123_headshot.jpg"
```

### Step 5: Delete Portfolio Item

```bash
# Delete portfolio item
curl -X DELETE http://localhost:8080/api/talent/portfolio-items/portfolio-item-def-456 \
  -H "Authorization: Bearer $AGENCY_TOKEN"
```

### Step 6: Verify Quota Updated

```sql
-- Check quota after deletion
SELECT
  COUNT(*) as total_files,
  SUM(size_bytes) as total_bytes
FROM storage_assets
WHERE owner_type = 'agency'
  AND owner_id = 'agency-789'
  AND counts_toward_quota = true
  AND deleted_at IS NULL;
-- Should show one less file and reduced bytes
```

**✅ Success Criteria:**

- Portfolio item uploaded to public bucket
- Registry entry created with `counts_toward_quota = true`
- Agency quota calculation includes this file
- Item accessible via public URL
- Deletion updates quota calculation

---

## Scenario 4: Agency Uploads Booking Deliverable

**Goal**: Test agency-owned, private assets with access control

### Step 1: Upload Deliverable

```bash
# Upload booking deliverable
curl -X POST http://localhost:8080/api/bookings-campaigns/campaign-123/deliverables \
  -H "Authorization: Bearer $AGENCY_TOKEN" \
  -H "Content-Type: multipart/form-data" \
  -F "file=@test-videos/final-cut.mp4" \
  -F "title=Final Video Cut" \
  -F "description=Approved final version"
```

**Expected Response:**

```json
{
  "id": "deliverable-ghi-789",
  "booking_campaign_id": "campaign-123",
  "agency_id": "agency-789",
  "title": "Final Video Cut",
  "storage_bucket": "likelee-private",
  "storage_path": "agencies/agency-789/booking-campaigns/campaign-123/deliverables/1234567890123_final-cut.mp4",
  "asset_url": "/api/bookings-campaigns/campaign-123/deliverables/deliverable-ghi-789/file",
  "status": "pending_review",
  "created_at": "2026-04-15T10:15:00Z"
}
```

### Step 2: Verify in Database

```sql
-- Check booking_deliverables table
SELECT id, booking_campaign_id, agency_id, storage_bucket, storage_path, status
FROM booking_deliverables
WHERE id = 'deliverable-ghi-789';

-- Check storage_assets registry
SELECT
  owner_type,
  owner_id,
  context_type,
  visibility,
  counts_toward_quota,
  size_bytes
FROM storage_assets
WHERE source_table = 'booking_deliverables'
  AND source_id = 'deliverable-ghi-789';
```

**Expected Registry Entry:**

```
owner_type: agency
owner_id: agency-789
context_type: booking_deliverable
visibility: private
counts_toward_quota: true  ← DOES count toward quota
```

### Step 3: Access Deliverable (Authorized)

```bash
# Access via secure endpoint (requires authentication)
curl -X GET http://localhost:8080/api/bookings-campaigns/campaign-123/deliverables/deliverable-ghi-789/file \
  -H "Authorization: Bearer $AGENCY_TOKEN" \
  -o downloaded-deliverable.mp4

# Verify file downloaded
file downloaded-deliverable.mp4
# Should show: ISO Media, MP4 v2
```

### Step 4: Try Unauthorized Access

```bash
# Try to access without token (should fail)
curl -X GET http://localhost:8080/api/bookings-campaigns/campaign-123/deliverables/deliverable-ghi-789/file

# Expected: 401 Unauthorized
```

### Step 5: List Deliverables

```bash
# List all deliverables for campaign
curl -X GET http://localhost:8080/api/bookings-campaigns/campaign-123/deliverables \
  -H "Authorization: Bearer $AGENCY_TOKEN"
```

**Expected Response:**

```json
{
  "deliverables": [
    {
      "id": "deliverable-ghi-789",
      "title": "Final Video Cut",
      "asset_url": "/api/bookings-campaigns/campaign-123/deliverables/deliverable-ghi-789/file",
      "status": "pending_review",
      "created_at": "2026-04-15T10:15:00Z"
    }
  ]
}
```

**Note**: `asset_url` is the secure endpoint, NOT the storage path.

### Step 6: Delete Deliverable

```bash
# Delete deliverable
curl -X DELETE http://localhost:8080/api/bookings-campaigns/campaign-123/deliverables/deliverable-ghi-789 \
  -H "Authorization: Bearer $AGENCY_TOKEN"
```

**✅ Success Criteria:**

- Deliverable uploaded to private bucket
- Registry entry created with `counts_toward_quota = true`
- Access requires authentication
- Unauthorized access fails
- List endpoint returns secure URLs, not storage paths
- Deletion removes file and updates quota

---

## Scenario 5: Test Backfill Process

**Goal**: Backfill existing storage data into registry

### Step 1: Check Current State

```sql
-- Count existing records in source tables
SELECT 'reference_images' as table_name, COUNT(*) as count
FROM reference_images WHERE storage_path IS NOT NULL
UNION ALL
SELECT 'voice_recordings', COUNT(*)
FROM voice_recordings WHERE storage_path IS NOT NULL
UNION ALL
SELECT 'talent_portfolio_items', COUNT(*)
FROM talent_portfolio_items WHERE storage_path IS NOT NULL;

-- Count existing records in registry
SELECT source_table, COUNT(*) as count
FROM storage_assets
WHERE deleted_at IS NULL
GROUP BY source_table;
```

### Step 2: Run Dry-Run Backfill

```bash
# Dry-run to validate without inserting
curl -X POST "http://localhost:8080/api/admin/storage/backfill?dry_run=true" \
  -H "Authorization: Bearer $ADMIN_TOKEN"
```

**Expected Response:**

```json
{
  "success": true,
  "message": "Dry-run complete: 1234 records would be inserted, 56 skipped, 0 errors",
  "report": {
    "dry_run": true,
    "tables": {
      "reference_images": {
        "total_rows": 450,
        "processed": 450,
        "inserted": 450,
        "skipped": 0,
        "errors": 0
      },
      "voice_recordings": {
        "total_rows": 234,
        "processed": 234,
        "inserted": 234,
        "skipped": 0,
        "errors": 0
      }
      // ... more tables
    },
    "total_inserted": 1234,
    "total_skipped": 56,
    "total_errors": 0
  }
}
```

### Step 3: Review Dry-Run Results

**Check for errors:**

- `total_errors` should be 0
- Review `error_messages` if any
- Verify `total_inserted` matches expected count

### Step 4: Execute Production Backfill

```bash
# Production backfill (inserts records)
curl -X POST "http://localhost:8080/api/admin/storage/backfill?dry_run=false" \
  -H "Authorization: Bearer $ADMIN_TOKEN"
```

### Step 5: Verify Parity

```bash
# Check that registry matches source tables
curl -X GET "http://localhost:8080/api/admin/storage/verify-parity" \
  -H "Authorization: Bearer $ADMIN_TOKEN"
```

**Expected Response:**

```json
{
  "all_tables_match": true,
  "checks": {
    "reference_images": {
      "source_count": 450,
      "registry_count": 450,
      "matches": true,
      "discrepancy": 0
    }
    // ... more tables
  }
}
```

### Step 6: Manual Verification

```sql
-- Check for duplicates (should return 0 rows)
SELECT bucket_id, object_path, COUNT(*) as count
FROM storage_assets
WHERE deleted_at IS NULL
GROUP BY bucket_id, object_path
HAVING COUNT(*) > 1;

-- Verify quota attribution
SELECT
  owner_type,
  counts_toward_quota,
  COUNT(*) as count,
  SUM(size_bytes) as total_bytes
FROM storage_assets
WHERE deleted_at IS NULL
GROUP BY owner_type, counts_toward_quota;
```

**✅ Success Criteria:**

- Dry-run completes with 0 errors
- Production backfill inserts all records
- Parity check shows 100% match
- No duplicate records
- Quota attribution correct

---

## Scenario 6: Test Quota Calculation

**Goal**: Verify quota calculation uses correct rules

### Step 1: Calculate Agency Quota

```sql
-- Agency's total storage usage (should count toward quota)
SELECT
  owner_id as agency_id,
  COUNT(*) as total_files,
  SUM(size_bytes) as total_bytes,
  ROUND(SUM(size_bytes) / 1024.0 / 1024.0 / 1024.0, 2) as total_gb
FROM storage_assets
WHERE owner_type = 'agency'
  AND owner_id = 'agency-789'
  AND counts_toward_quota = true
  AND deleted_at IS NULL
GROUP BY owner_id;
```

### Step 2: Verify Creator Assets Don't Count

```sql
-- Creator assets should NOT count toward agency quota
SELECT
  context_type,
  COUNT(*) as count,
  counts_toward_quota
FROM storage_assets
WHERE owner_type = 'creator'
  AND deleted_at IS NULL
GROUP BY context_type, counts_toward_quota;
```

**Expected Result:**

```
context_type: reference_image
counts_toward_quota: false  ← Correct
```

### Step 3: Check Agency Breakdown

```sql
-- Breakdown of agency storage by context type
SELECT
  context_type,
  COUNT(*) as file_count,
  SUM(size_bytes) as total_bytes,
  ROUND(SUM(size_bytes) / 1024.0 / 1024.0, 2) as total_mb
FROM storage_assets
WHERE owner_type = 'agency'
  AND owner_id = 'agency-789'
  AND counts_toward_quota = true
  AND deleted_at IS NULL
GROUP BY context_type
ORDER BY total_bytes DESC;
```

**Expected Result:**

```
context_type          | file_count | total_bytes | total_mb
----------------------|------------|-------------|----------
booking_deliverable   | 45         | 25000000    | 23.84
talent_portfolio      | 30         | 15000000    | 14.31
booking_file          | 20         | 5000000     | 4.77
```

**✅ Success Criteria:**

- Agency quota includes only agency-owned assets
- Creator/user assets excluded from agency quota
- Breakdown shows correct context types
- Soft-deleted assets excluded from calculation

---

## Debugging Tips

### Check Storage Bucket Contents

```bash
# List files in public bucket
curl "https://your-supabase-url/storage/v1/object/list/likelee-public" \
  -H "Authorization: Bearer $SERVICE_KEY"

# List files in private bucket
curl "https://your-supabase-url/storage/v1/object/list/likelee-private" \
  -H "Authorization: Bearer $SERVICE_KEY"
```

### Check Registry Consistency

```sql
-- Find records in source tables without registry entries
SELECT 'reference_images' as table_name, ri.id
FROM reference_images ri
LEFT JOIN storage_assets sa ON sa.source_table = 'reference_images' AND sa.source_id = ri.id
WHERE ri.storage_path IS NOT NULL
  AND sa.id IS NULL;

-- Find registry entries without source records
SELECT sa.source_table, sa.source_id
FROM storage_assets sa
LEFT JOIN reference_images ri ON ri.id = sa.source_id
WHERE sa.source_table = 'reference_images'
  AND sa.deleted_at IS NULL
  AND ri.id IS NULL;
```

### Check for Orphaned Files

```sql
-- Files in registry but not in storage bucket (requires manual check)
SELECT bucket_id, object_path
FROM storage_assets
WHERE deleted_at IS NULL
ORDER BY created_at DESC
LIMIT 10;
-- Manually verify these paths exist in storage
```

### Monitor New Uploads

```sql
-- Watch for new uploads in real-time
SELECT
  source_table,
  context_type,
  owner_type,
  counts_toward_quota,
  created_at
FROM storage_assets
WHERE created_at > NOW() - INTERVAL '5 minutes'
ORDER BY created_at DESC;
```

---

## Common Issues and Solutions

### Issue 1: Upload Fails with "storage upload failed"

**Cause**: Storage bucket doesn't exist or permissions incorrect

**Solution**:

```sql
-- Check if buckets exist
SELECT id, name, public FROM storage.buckets;

-- Ensure buckets are created
-- Run the ensure_storage RPC function
```

### Issue 2: Registry Entry Not Created

**Cause**: Error in registry insertion (check logs)

**Solution**:

```bash
# Check server logs for errors
tail -f likelee-server/logs/app.log | grep storage_assets

# Manually insert registry entry if needed
```

### Issue 3: Signed URL Returns 403

**Cause**: URL expired or incorrect bucket

**Solution**:

- Check URL expiration (default 5 minutes)
- Verify bucket is `likelee-private`
- Request new signed URL

### Issue 4: Quota Calculation Incorrect

**Cause**: `counts_toward_quota` flag incorrect

**Solution**:

```sql
-- Check quota flags
SELECT
  owner_type,
  context_type,
  counts_toward_quota,
  COUNT(*)
FROM storage_assets
WHERE deleted_at IS NULL
GROUP BY owner_type, context_type, counts_toward_quota;

-- Fix incorrect flags if needed
UPDATE storage_assets
SET counts_toward_quota = false
WHERE owner_type = 'creator'
  AND context_type = 'reference_image';
```

---

## Performance Testing

### Test Large File Upload

```bash
# Create a large test file (100MB)
dd if=/dev/urandom of=large-file.bin bs=1M count=100

# Upload large file
time curl -X POST http://localhost:8080/api/agency/storage/files/upload \
  -H "Authorization: Bearer $AGENCY_TOKEN" \
  -F "file=@large-file.bin" \
  -F "folder_id=folder-123"

# Should complete in reasonable time (< 30 seconds)
```

### Test Concurrent Uploads

```bash
# Upload multiple files concurrently
for i in {1..10}; do
  curl -X POST http://localhost:8080/api/reference-images/upload \
    -H "Authorization: Bearer $CREATOR_TOKEN" \
    -F "file=@test-images/image-$i.jpg" \
    -F "section_id=section-123" &
done
wait

# Check all uploads succeeded
```

### Test Backfill Performance

```bash
# Time the backfill process
time curl -X POST "http://localhost:8080/api/admin/storage/backfill?dry_run=false" \
  -H "Authorization: Bearer $ADMIN_TOKEN"

# Should complete in reasonable time based on record count
```

---

## Success Checklist

Use this checklist to verify the implementation:

- [ ] Creator can upload reference images (public, no quota)
- [ ] User can upload voice recordings (private, no quota)
- [ ] Agency can upload talent portfolio (public, counts quota)
- [ ] Agency can upload deliverables (private, counts quota)
- [ ] Public assets accessible via direct URL
- [ ] Private assets require signed URLs
- [ ] Unauthorized access to private assets fails
- [ ] Registry entries created on upload
- [ ] Registry entries soft-deleted on deletion
- [ ] Quota calculation excludes creator/user assets
- [ ] Quota calculation includes agency/brand assets
- [ ] Backfill dry-run completes successfully
- [ ] Backfill production completes successfully
- [ ] Parity verification shows 100% match
- [ ] No duplicate registry entries
- [ ] Large file uploads work
- [ ] Concurrent uploads work
- [ ] Server logs show no errors

---

## Next Steps

After completing these tests:

1. **Document Results**: Note any issues or unexpected behavior
2. **Performance Metrics**: Record upload/download times
3. **Edge Cases**: Test error scenarios (invalid files, missing permissions)
4. **Load Testing**: Test with realistic production volumes
5. **Monitoring**: Set up alerts for storage errors

---

**Document Version**: 1.0  
**Last Updated**: 2026-04-15  
**Author**: AI Assistant
