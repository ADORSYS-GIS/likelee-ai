# Storage Testing Quick Start

**Quick guide to test the storage implementation live**

## 🚀 Quick Start (5 minutes)

### 1. Start the Server

```bash
cd likelee-server
cargo run
# Wait for: "Starting likelee-server" message
```

### 2. Set Up Tokens

```bash
# Get authentication tokens from your system
export CREATOR_TOKEN="your-creator-jwt-token"
export AGENCY_TOKEN="your-agency-jwt-token"

# Optional: Database connection for verification
export DATABASE_URL="postgresql://user:pass@localhost:5432/likelee"
```

### 3. Run Automated Tests

```bash
# Run the automated test script
./scripts/test-storage-flow.sh
```

This will test:

- ✅ Reference image upload (creator, public, no quota)
- ✅ Voice recording upload (user, private, no quota)
- ✅ Agency file upload (agency, private, counts quota)
- ✅ Backfill dry-run
- ✅ Parity verification

## 📋 Manual Testing

### Test 1: Upload Reference Image

```bash
# Create test image
echo "iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNk+M9QDwADhgGAWjR9awAAAABJRU5ErkJggg==" | base64 -d > test.png

# Upload
curl -X POST http://localhost:8080/api/reference-images/upload \
  -H "Authorization: Bearer $CREATOR_TOKEN" \
  -F "file=@test.png" \
  -F "section_id=test-123"

# Expected: JSON response with id, storage_path, etc.
```

### Test 2: Check Database

```bash
# Connect to database
psql $DATABASE_URL

# Check registry
SELECT
  owner_type,
  context_type,
  visibility,
  counts_toward_quota,
  created_at
FROM storage_assets
ORDER BY created_at DESC
LIMIT 5;

# Check quota
SELECT
  owner_type,
  COUNT(*) as files,
  SUM(size_bytes) as bytes
FROM storage_assets
WHERE counts_toward_quota = true
  AND deleted_at IS NULL
GROUP BY owner_type;
```

### Test 3: Run Backfill

```bash
# Dry-run first (safe, no changes)
curl -X POST "http://localhost:8080/api/admin/storage/backfill?dry_run=true" \
  -H "Authorization: Bearer $AGENCY_TOKEN"

# Check results, then run production
curl -X POST "http://localhost:8080/api/admin/storage/backfill?dry_run=false" \
  -H "Authorization: Bearer $AGENCY_TOKEN"

# Verify parity
curl -X GET "http://localhost:8080/api/admin/storage/verify-parity" \
  -H "Authorization: Bearer $AGENCY_TOKEN"
```

## 🔍 What to Check

### ✅ Success Indicators

1. **Upload Response**
   - Returns `id`, `storage_path`, `storage_bucket`
   - No error messages

2. **Database Registry**
   - Entry exists in `storage_assets`
   - Correct `owner_type` and `visibility`
   - Correct `counts_toward_quota` flag

3. **File Access**
   - Public files: Direct URL works
   - Private files: Signed URL required

4. **Quota Calculation**
   - Agency assets count toward quota
   - Creator/user assets don't count

5. **Backfill**
   - Dry-run shows 0 errors
   - Parity check shows 100% match
   - No duplicate records

### ❌ Common Issues

**Issue**: Upload fails with 500 error  
**Fix**: Check server logs, verify buckets exist

**Issue**: Registry entry not created  
**Fix**: Check database logs, verify migration ran

**Issue**: Signed URL returns 403  
**Fix**: URL expired (5 min), request new one

**Issue**: Quota incorrect  
**Fix**: Check `counts_toward_quota` flags in registry

## 📊 Test Scenarios

### Scenario 1: Creator Workflow

1. Upload reference image → Public, no quota
2. Upload voice recording → Private, no quota
3. Check quota → Should be 0 for creator assets

### Scenario 2: Agency Workflow

1. Upload talent portfolio → Public, counts quota
2. Upload booking deliverable → Private, counts quota
3. Check quota → Should include both files

### Scenario 3: Backfill Workflow

1. Run dry-run → Validate without changes
2. Check report → 0 errors expected
3. Run production → Insert records
4. Verify parity → 100% match expected

## 📖 Detailed Documentation

For comprehensive testing scenarios:

- **Full Guide**: `docs/storage-live-testing-guide.md`
- **Architecture**: `docs/storage-architecture.md`
- **Checklist**: `docs/ticket-499-implementation-checklist.md`

## 🆘 Getting Help

**Check Logs**:

```bash
# Server logs
tail -f likelee-server/logs/app.log

# Database logs
tail -f /var/log/postgresql/postgresql.log
```

**Database Queries**:

```sql
-- Recent uploads
SELECT * FROM storage_assets
ORDER BY created_at DESC LIMIT 10;

-- Check for errors
SELECT source_table, COUNT(*)
FROM storage_assets
WHERE deleted_at IS NULL
GROUP BY source_table;

-- Quota by agency
SELECT owner_id, SUM(size_bytes)
FROM storage_assets
WHERE owner_type = 'agency'
  AND counts_toward_quota = true
  AND deleted_at IS NULL
GROUP BY owner_id;
```

## ✨ Quick Commands

```bash
# Test everything
./scripts/test-storage-flow.sh

# Test specific upload
curl -X POST http://localhost:8080/api/reference-images/upload \
  -H "Authorization: Bearer $CREATOR_TOKEN" \
  -F "file=@image.jpg" \
  -F "section_id=test"

# Check registry
psql $DATABASE_URL -c "SELECT COUNT(*) FROM storage_assets;"

# Run backfill dry-run
curl -X POST "http://localhost:8080/api/admin/storage/backfill?dry_run=true" \
  -H "Authorization: Bearer $AGENCY_TOKEN"

# Verify parity
curl -X GET "http://localhost:8080/api/admin/storage/verify-parity" \
  -H "Authorization: Bearer $AGENCY_TOKEN"
```

---

**Ready to test?** Run `./scripts/test-storage-flow.sh` to get started!
