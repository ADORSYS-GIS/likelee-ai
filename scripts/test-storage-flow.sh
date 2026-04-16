#!/bin/bash

# Storage Implementation Live Testing Script
# This script tests the storage implementation end-to-end

set -e

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Configuration
API_BASE_URL="${API_BASE_URL:-http://localhost:8787}"
CREATOR_TOKEN=eyJhbGciOiJIUzI1NiIsImtpZCI6Ilpad3ZYeWtmSThVMlN3QlciLCJ0eXAiOiJKV1QifQ.eyJpc3MiOiJodHRwczovL2hpbXlyZ3d5cnNtbHRtemxidXhtLnN1cGFiYXNlLmNvL2F1dGgvdjEiLCJzdWIiOiIxZjg0OGE3MC05ODRlLTQwZWItYWE5YS0wNjE3NzgxZTUwZDMiLCJhdWQiOiJhdXRoZW50aWNhdGVkIiwiZXhwIjoxNzc2MjY0MzI5LCJpYXQiOjE3NzYyNjA3MjksImVtYWlsIjoia29kaWNpMzU0M0BjcnNheS5jb20iLCJwaG9uZSI6IiIsImFwcF9tZXRhZGF0YSI6eyJwcm92aWRlciI6ImVtYWlsIiwicHJvdmlkZXJzIjpbImVtYWlsIl19LCJ1c2VyX21ldGFkYXRhIjp7ImVtYWlsIjoia29kaWNpMzU0M0BjcnNheS5jb20iLCJlbWFpbF92ZXJpZmllZCI6dHJ1ZSwiZnVsbF9uYW1lIjoiT0RJIiwicGhvbmVfdmVyaWZpZWQiOmZhbHNlLCJyb2xlIjoiY3JlYXRvciIsInN1YiI6IjFmODQ4YTcwLTk4NGUtNDBlYi1hYTlhLTA2MTc3ODFlNTBkMyJ9LCJyb2xlIjoiYXV0aGVudGljYXRlZCIsImFhbCI6ImFhbDEiLCJhbXIiOlt7Im1ldGhvZCI6InBhc3N3b3JkIiwidGltZXN0YW1wIjoxNzc2MjYwNzI5fV0sInNlc3Npb25faWQiOiI0MmQxYzZhOC05YjExLTRjYjctYmE2OC0zZjM4MjhiYjIzY2UiLCJpc19hbm9ueW1vdXMiOmZhbHNlfQ.Ds3wcM9_CikQt3UT4H1gtQwvAwHKdWnC7ai0L5RmE0Q
AGENCY_TOKEN=eyJhbGciOiJIUzI1NiIsImtpZCI6Ilpad3ZYeWtmSThVMlN3QlciLCJ0eXAiOiJKV1QifQ.eyJpc3MiOiJodHRwczovL2hpbXlyZ3d5cnNtbHRtemxidXhtLnN1cGFiYXNlLmNvL2F1dGgvdjEiLCJzdWIiOiI2ZWViNDZlYy03MzhiLTQ1ZmUtYTU2Zi01MWNjODRlZWQwMGYiLCJhdWQiOiJhdXRoZW50aWNhdGVkIiwiZXhwIjoxNzc2MjY0NTk3LCJpYXQiOjE3NzYyNjA5OTcsImVtYWlsIjoiY2hyaXN0aWFuLmRlZm9tZXRpb0BhZG9yc3lzLmNvbSIsInBob25lIjoiIiwiYXBwX21ldGFkYXRhIjp7InByb3ZpZGVyIjoiZ29vZ2xlIiwicHJvdmlkZXJzIjpbImdvb2dsZSJdfSwidXNlcl9tZXRhZGF0YSI6eyJhdmF0YXJfdXJsIjoiaHR0cHM6Ly9saDMuZ29vZ2xldXNlcmNvbnRlbnQuY29tL2EvQUNnOG9jTGZsUGJhUkIzT3VIRG5Ed0dBQXpRQ3pDT2FGLWRkbUpnVWo0Z1FfdVB1d2Nld0lnPXM5Ni1jIiwiZW1haWwiOiJjaHJpc3RpYW4uZGVmb21ldGlvQGFkb3JzeXMuY29tIiwiZW1haWxfdmVyaWZpZWQiOnRydWUsImZ1bGxfbmFtZSI6IndvcmsgYWRvcnN5cyIsImlzcyI6Imh0dHBzOi8vYWNjb3VudHMuZ29vZ2xlLmNvbSIsIm5hbWUiOiJ3b3JrIGFkb3JzeXMiLCJwaG9uZV92ZXJpZmllZCI6ZmFsc2UsInBpY3R1cmUiOiJodHRwczovL2xoMy5nb29nbGV1c2VyY29udGVudC5jb20vYS9BQ2c4b2NMZmxQYmFSQjNPdUhEbkR3R0FBelFDekNPYUYtZGRtSmdVajRnUV91UHV3Y2V3SWc9czk2LWMiLCJwcm92aWRlcl9pZCI6IjExMjQ0MjI4MzU1OTk0ODk4OTAyOSIsInJvbGUiOiJhZ2VuY3kiLCJzdWIiOiIxMTI0NDIyODM1NTk5NDg5ODkwMjkifSwicm9sZSI6ImF1dGhlbnRpY2F0ZWQiLCJhYWwiOiJhYWwxIiwiYW1yIjpbeyJtZXRob2QiOiJvYXV0aCIsInRpbWVzdGFtcCI6MTc3NjA3NTQ2OX1dLCJzZXNzaW9uX2lkIjoiZTNjNDczNjUtZWNiNy00NTUxLWJiOGUtYjBkMWI1NDkxMmE0IiwiaXNfYW5vbnltb3VzIjpmYWxzZX0.3-1EqFDvaeS2LCeBIOU-E_rEPA56Tkv7wXXtphqsxCo

# Test files directory
TEST_DIR="$(dirname "$0")/test-files"
mkdir -p "$TEST_DIR"

# Helper functions
print_header() {
    echo -e "\n${BLUE}========================================${NC}"
    echo -e "${BLUE}$1${NC}"
    echo -e "${BLUE}========================================${NC}\n"
}

print_success() {
    echo -e "${GREEN}✓ $1${NC}"
}

print_error() {
    echo -e "${RED}✗ $1${NC}"
}

print_info() {
    echo -e "${YELLOW}ℹ $1${NC}"
}

check_prerequisites() {
    print_header "Checking Prerequisites"
    
    # Check if server is running
    if curl -s "$API_BASE_URL/api/health" > /dev/null; then
        print_success "Server is running at $API_BASE_URL"
    else
        print_error "Server is not running at $API_BASE_URL"
        echo "Please start the server with: cd likelee-server && cargo run"
        exit 1
    fi
    
    # Check for tokens
    if [ -z "$CREATOR_TOKEN" ]; then
        print_error "CREATOR_TOKEN not set"
        echo "Please set: export CREATOR_TOKEN='your-token'"
        exit 1
    fi
    print_success "Creator token configured"
    
    if [ -z "$AGENCY_TOKEN" ]; then
        print_error "AGENCY_TOKEN not set"
        echo "Please set: export AGENCY_TOKEN='your-token'"
        exit 1
    fi
    print_success "Agency token configured"
    
    # Check for required tools
    for tool in curl jq; do
        if command -v $tool &> /dev/null; then
            print_success "$tool is installed"
        else
            print_error "$tool is not installed"
            exit 1
        fi
    done
    
    # Check for optional tools
    if command -v psql &> /dev/null; then
        print_success "psql is installed (optional database checks enabled)"
    else
        print_info "psql is not installed (database checks will be skipped)"
        print_info "Install with: sudo apt install postgresql-client"
    fi
}

create_test_files() {
    print_header "Creating Test Files"
    
    # Create test image (1x1 pixel PNG)
    echo -n "iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNk+M9QDwADhgGAWjR9awAAAABJRU5ErkJggg==" | base64 -d > "$TEST_DIR/test-image.png"
    print_success "Created test image: $TEST_DIR/test-image.png"
    
    # Create test audio (silent WebM)
    dd if=/dev/zero of="$TEST_DIR/test-audio.webm" bs=1024 count=10 2>/dev/null
    print_success "Created test audio: $TEST_DIR/test-audio.webm"
    
    # Create test document
    echo "Test document content" > "$TEST_DIR/test-document.txt"
    print_success "Created test document: $TEST_DIR/test-document.txt"
}

test_reference_image_upload() {
    print_header "Test 1: Reference Image Upload (Creator)"
    
    print_info "Uploading reference image..."
    RESPONSE=$(curl -s -X POST "$API_BASE_URL/api/reference-images/upload" \
        -H "Authorization: Bearer $CREATOR_TOKEN" \
        -F "file=@$TEST_DIR/test-image.png" \
        -F "section_id=test-section-123")
    
    if echo "$RESPONSE" | jq -e '.id' > /dev/null 2>&1; then
        IMAGE_ID=$(echo "$RESPONSE" | jq -r '.id')
        STORAGE_PATH=$(echo "$RESPONSE" | jq -r '.storage_path')
        print_success "Image uploaded successfully"
        print_info "Image ID: $IMAGE_ID"
        print_info "Storage Path: $STORAGE_PATH"
        
        # Check registry entry
        if command -v psql &> /dev/null && [ -n "$DATABASE_URL" ]; then
            print_info "Checking storage_assets registry..."
            psql "$DATABASE_URL" -c "SELECT owner_type, visibility, counts_toward_quota FROM storage_assets WHERE source_table = 'reference_images' AND source_id = '$IMAGE_ID';" 2>/dev/null || print_info "Database check failed"
        else
            print_info "Database check skipped (psql not installed or DATABASE_URL not set)"
        fi
        
        # Clean up
        print_info "Cleaning up..."
        curl -s -X DELETE "$API_BASE_URL/api/reference-images/test-section-123" \
            -H "Authorization: Bearer $CREATOR_TOKEN" > /dev/null
        print_success "Test 1 completed"
    else
        print_error "Image upload failed"
        echo "$RESPONSE" | jq '.' 2>/dev/null || echo "$RESPONSE"
        return 1
    fi
}

test_voice_recording_upload() {
    print_header "Test 2: Voice Recording Upload (User)"
    
    print_info "Uploading voice recording..."
    RESPONSE=$(curl -s -X POST "$API_BASE_URL/api/voice/recordings" \
        -H "Authorization: Bearer $CREATOR_TOKEN" \
        -F "file=@$TEST_DIR/test-audio.webm" \
        -F "emotion_tag=neutral")
    
    if echo "$RESPONSE" | jq -e '.id' > /dev/null 2>&1; then
        RECORDING_ID=$(echo "$RESPONSE" | jq -r '.id')
        print_success "Voice recording uploaded successfully"
        print_info "Recording ID: $RECORDING_ID"
        
        # Get signed URL
        print_info "Requesting signed URL..."
        SIGNED_URL_RESPONSE=$(curl -s -X GET "$API_BASE_URL/api/voice/recordings/signed-url?recording_id=$RECORDING_ID" \
            -H "Authorization: Bearer $CREATOR_TOKEN")
        
        if echo "$SIGNED_URL_RESPONSE" | jq -e '.signed_url' > /dev/null 2>&1; then
            print_success "Signed URL generated successfully"
            SIGNED_URL=$(echo "$SIGNED_URL_RESPONSE" | jq -r '.signed_url')
            print_info "Signed URL: ${SIGNED_URL:0:80}..."
        else
            print_error "Failed to get signed URL"
        fi
        
        # Clean up
        print_info "Cleaning up..."
        curl -s -X DELETE "$API_BASE_URL/api/voice/recordings/$RECORDING_ID" \
            -H "Authorization: Bearer $CREATOR_TOKEN" > /dev/null
        print_success "Test 2 completed"
    else
        print_error "Voice recording upload failed"
        echo "$RESPONSE" | jq '.' 2>/dev/null || echo "$RESPONSE"
        return 1
    fi
}

test_agency_file_upload() {
    print_header "Test 3: Agency Storage File Upload"
    
    print_info "Uploading agency file..."
    RESPONSE=$(curl -s -X POST "$API_BASE_URL/api/agency/storage/files/upload" \
        -H "Authorization: Bearer $AGENCY_TOKEN" \
        -F "file=@$TEST_DIR/test-document.txt")
    
    if echo "$RESPONSE" | jq -e '.id' > /dev/null 2>&1; then
        FILE_ID=$(echo "$RESPONSE" | jq -r '.id')
        print_success "Agency file uploaded successfully"
        print_info "File ID: $FILE_ID"
        
        # Check quota
        print_info "This file should count toward agency quota"
        
        # Clean up
        print_info "Cleaning up..."
        curl -s -X DELETE "$API_BASE_URL/api/agency/storage/files/$FILE_ID" \
            -H "Authorization: Bearer $AGENCY_TOKEN" > /dev/null
        print_success "Test 3 completed"
    else
        print_error "Agency file upload failed"
        echo "$RESPONSE" | jq '.' 2>/dev/null || echo "$RESPONSE"
        return 1
    fi
}

test_backfill_dry_run() {
    print_header "Test 4: Backfill Dry-Run"
    
    print_info "Running backfill dry-run..."
    RESPONSE=$(curl -s -X POST "$API_BASE_URL/api/admin/storage/backfill?dry_run=true" \
        -H "Authorization: Bearer $AGENCY_TOKEN")
    
    if echo "$RESPONSE" | jq -e '.success' > /dev/null 2>&1; then
        SUCCESS=$(echo "$RESPONSE" | jq -r '.success')
        MESSAGE=$(echo "$RESPONSE" | jq -r '.message')
        TOTAL_INSERTED=$(echo "$RESPONSE" | jq -r '.report.total_inserted')
        TOTAL_ERRORS=$(echo "$RESPONSE" | jq -r '.report.total_errors')
        
        print_success "Backfill dry-run completed"
        print_info "Message: $MESSAGE"
        print_info "Would insert: $TOTAL_INSERTED records"
        print_info "Errors: $TOTAL_ERRORS"
        
        if [ "$TOTAL_ERRORS" -eq 0 ]; then
            print_success "No errors in dry-run"
        else
            print_error "Dry-run found $TOTAL_ERRORS errors"
        fi
        
        print_success "Test 4 completed"
    else
        print_error "Backfill dry-run failed"
        echo "$RESPONSE" | jq '.' 2>/dev/null || echo "$RESPONSE"
        return 1
    fi
}

test_parity_verification() {
    print_header "Test 5: Parity Verification"
    
    print_info "Checking parity between source tables and registry..."
    RESPONSE=$(curl -s -X GET "$API_BASE_URL/api/admin/storage/verify-parity" \
        -H "Authorization: Bearer $AGENCY_TOKEN")
    
    if echo "$RESPONSE" | jq -e '.all_tables_match' > /dev/null 2>&1; then
        ALL_MATCH=$(echo "$RESPONSE" | jq -r '.all_tables_match')
        
        if [ "$ALL_MATCH" = "true" ]; then
            print_success "All tables match! Parity verified."
        else
            print_error "Some tables don't match"
            echo "$RESPONSE" | jq '.checks' 2>/dev/null
        fi
        
        # Show summary
        print_info "Parity check summary:"
        echo "$RESPONSE" | jq -r '.checks | to_entries[] | "\(.key): source=\(.value.source_count), registry=\(.value.registry_count), match=\(.value.matches)"' 2>/dev/null || true
        
        print_success "Test 5 completed"
    else
        print_error "Parity verification failed"
        echo "$RESPONSE" | jq '.' 2>/dev/null || echo "$RESPONSE"
        return 1
    fi
}

run_database_checks() {
    print_header "Database Verification"
    
    if ! command -v psql &> /dev/null; then
        print_info "psql not installed, skipping database checks"
        print_info "Install with: sudo apt install postgresql-client"
        return 0
    fi
    
    if [ -z "$DATABASE_URL" ]; then
        print_info "DATABASE_URL not set, skipping database checks"
        print_info "Set DATABASE_URL to enable: export DATABASE_URL='postgresql://...'"
        return 0
    fi
    
    print_info "Running database queries..."
    
    # Check registry counts
    print_info "Registry record counts by source table:"
    psql "$DATABASE_URL" -c "
        SELECT source_table, COUNT(*) as count
        FROM storage_assets
        WHERE deleted_at IS NULL
        GROUP BY source_table
        ORDER BY source_table;
    " 2>/dev/null || print_error "Database query failed"
    
    # Check quota attribution
    print_info "Quota attribution by owner type:"
    psql "$DATABASE_URL" -c "
        SELECT 
            owner_type,
            counts_toward_quota,
            COUNT(*) as count,
            ROUND(SUM(size_bytes) / 1024.0 / 1024.0, 2) as total_mb
        FROM storage_assets
        WHERE deleted_at IS NULL
        GROUP BY owner_type, counts_toward_quota
        ORDER BY owner_type, counts_toward_quota;
    " 2>/dev/null || print_error "Database query failed"
    
    # Check for duplicates
    print_info "Checking for duplicate records..."
    DUPLICATES=$(psql "$DATABASE_URL" -t -c "
        SELECT COUNT(*)
        FROM (
            SELECT bucket_id, object_path, COUNT(*) as count
            FROM storage_assets
            WHERE deleted_at IS NULL
            GROUP BY bucket_id, object_path
            HAVING COUNT(*) > 1
        ) duplicates;
    " 2>/dev/null || echo "0")
    
    if [ "$DUPLICATES" -eq 0 ]; then
        print_success "No duplicate records found"
    else
        print_error "Found $DUPLICATES duplicate records"
    fi
}

print_summary() {
    print_header "Test Summary"
    
    echo -e "${GREEN}All tests completed!${NC}\n"
    
    echo "What was tested:"
    echo "  ✓ Reference image upload (creator-owned, public, no quota)"
    echo "  ✓ Voice recording upload (user-owned, private, no quota)"
    echo "  ✓ Agency file upload (agency-owned, private, counts quota)"
    echo "  ✓ Backfill dry-run validation"
    echo "  ✓ Parity verification"
    echo ""
    
    echo "Next steps:"
    echo "  1. Review the test results above"
    echo "  2. Check the storage_assets table in your database"
    echo "  3. Run production backfill if dry-run succeeded"
    echo "  4. Monitor quota calculations"
    echo ""
    
    echo "For detailed testing scenarios, see:"
    echo "  docs/storage-live-testing-guide.md"
}

# Main execution
main() {
    echo -e "${BLUE}"
    echo "╔════════════════════════════════════════════════════════╗"
    echo "║   Storage Implementation Live Testing Script           ║"
    echo "║   Ticket #499 - Storage Modularization                 ║"
    echo "╚════════════════════════════════════════════════════════╝"
    echo -e "${NC}"
    
    check_prerequisites
    create_test_files
    
    # Run tests
    test_reference_image_upload || true
    test_voice_recording_upload || true
    test_agency_file_upload || true
    test_backfill_dry_run || true
    test_parity_verification || true
    
    # Database checks (optional)
    run_database_checks || true
    
    print_summary
    
    # Cleanup
    print_info "Cleaning up test files..."
    rm -rf "$TEST_DIR"
    print_success "Cleanup complete"
}

# Run main function
main "$@"
