-- DEBUG: DISABLE RLS and CHECK USER
-- This script will help us pin-point if the 500 error is caused by RLS policies.

-- 1. Disable RLS on 'profiles' table temporarily.
-- If login works after this, we KNOW the problem is the policy logic.
ALTER TABLE public.profiles DISABLE ROW LEVEL SECURITY;

-- 2. Verify if the staff user actually exists (Metadata check)
-- We can't see the password, but we can see if the record is there.
-- Replace 'staff_email_here' with the email access in the query if you were running manually, 
-- but here we just list the last 5 created users to confirm recent additions.

SELECT id, email, created_at, raw_user_meta_data 
FROM auth.users 
ORDER BY created_at DESC 
LIMIT 5;

-- 3. Check 'profiles' table for these users
SELECT id, full_name, role, business_id 
FROM public.profiles 
ORDER BY created_at DESC 
LIMIT 5;

-- If this script runs successfully, try logging in immediately.
-- If login works, the issue is RLS.
-- If login FAILS (500), the issue is upstream (Triggers, Auth Hooks, or pgcrypto).
