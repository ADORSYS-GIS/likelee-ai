# Likelee AWS IAM Policies

Reusable, reviewable JSON policies stored in-repo for quick application in any environment.

## Files
- rekognition_moderation.json — Allow DetectModerationLabels
- rekognition_liveness.json — Allow CreateFaceLivenessSession and GetFaceLivenessSessionResults
- rekognition_readonly.json — Read-only/list/describe and basic detect operations
- combined_likelee_server.json — Union for server (moderation + liveness)
- cognito_basic_auth_client.json — Minimal app-client auth flows (InitiateAuth, RespondToAuthChallenge, etc.)
- cognito_admin_user_mgmt.json — Admin user management APIs

## How to apply with AWS CLI
Replace placeholders in angle brackets.

```bash
# 1) Create or update customer-managed policies
aws iam create-policy \
  --policy-name likelee-rekognition-moderation \
  --policy-document file://rekognition_moderation.json || true

aws iam create-policy \
  --policy-name likelee-rekognition-liveness \
  --policy-document file://rekognition_liveness.json || true

aws iam create-policy \
  --policy-name likelee-rekognition-readonly \
  --policy-document file://rekognition_readonly.json || true

aws iam create-policy \
  --policy-name likelee-rekognition-combined \
  --policy-document file://combined_likelee_server.json || true

aws iam create-policy \
  --policy-name likelee-cognito-basic-auth-client \
  --policy-document file://cognito_basic_auth_client.json || true

aws iam create-policy \
  --policy-name likelee-cognito-admin-user-mgmt \
  --policy-document file://cognito_admin_user_mgmt.json || true

# 2) Attach to the server principal (user or role)
# For IAM user
aws iam attach-user-policy \
  --user-name <SERVER_IAM_USER> \
  --policy-arn arn:aws:iam::<ACCOUNT_ID>:policy/likelee-rekognition-combined

# For IAM role
aws iam attach-role-policy \
  --role-name <SERVER_IAM_ROLE> \
  --policy-arn arn:aws:iam::<ACCOUNT_ID>:policy/likelee-rekognition-combined
```

## Optional hardening
- Add a condition on `aws:RequestedRegion` to restrict usage to your region:

```json
{
  "Sid": "RegionRestriction",
  "Effect": "Deny",
  "Action": "rekognition:*",
  "Resource": "*",
  "Condition": { "StringNotEquals": { "aws:RequestedRegion": "<YOUR-REGION>" } }
}
```

Place it as an additional statement to deny calls outside the allowed region.

## Supabase bucket quick-fix (Bucket not found)
- Verify env names match backend config: `SUPABASE_BUCKET_PUBLIC`, `SUPABASE_BUCKET_PRIVATE`, `SUPABASE_BUCKET_TEMP`.
- The backend calls `public.ensure_storage(p_public_bucket, p_private_bucket, p_temp_bucket)` at startup. Ensure it ran.

List buckets via REST (replace vars accordingly):
```bash
curl -s -H "apikey: $SUPABASE_SERVICE_KEY" -H "Authorization: Bearer $SUPABASE_SERVICE_KEY" \
  "$SUPABASE_URL/rest/v1/storage.buckets?select=name"
```

Manually run the RPC to (re)create buckets and policies:
```bash
curl -s -X POST \
  -H "apikey: $SUPABASE_SERVICE_KEY" \
  -H "Authorization: Bearer $SUPABASE_SERVICE_KEY" \
  -H "Content-Type: application/json" \
  -d '{
        "p_public_bucket": "'"${SUPABASE_BUCKET_PUBLIC}"'",
        "p_private_bucket": "'"${SUPABASE_BUCKET_PRIVATE}"'",
        "p_temp_bucket": "'"${SUPABASE_BUCKET_TEMP}"'"
      }' \
  "$SUPABASE_URL/rest/v1/rpc/ensure_storage"
```

If the call fails, ensure the key is a service_role key and the function exists (see supabase/migrations/2025-11-29_storage_buckets_policies.sql).
