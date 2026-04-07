-- Check which user you're currently logged in as
-- Run this in Supabase SQL Editor

-- Method 1: Check current authenticated user
SELECT 
    auth.uid() as current_user_id,
    auth.jwt() ->> 'email' as current_user_email;

-- Method 2: Alternative method
SELECT 
    current_setting('request.jwt.claims', true)::json->>'sub' as user_id,
    current_setting('request.jwt.claims', true)::json->>'email' as user_email;

-- Method 3: Find all users with your email domain
SELECT 
    u.id as user_id,
    u.email as user_email,
    u.raw_user_meta_data->>'role' as user_role,
    u.created_at
FROM auth.users u
WHERE u.email LIKE '%adorsys.com%'
   OR u.email LIKE '%christian%'
ORDER BY u.created_at DESC;
