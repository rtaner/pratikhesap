-- RUN THIS SCRIPT IN SUPABASE SQL EDITOR TO BECOME SUPER ADMIN

-- Option 1: Grant Super Admin to a specific email (if you know it)
-- This requires joining with auth.users which might not be accessible directly in simple queries depending on permissions,
-- BUT usually in SQL Editor you are postgres/service_role so it works.

-- REPLACE 'admin@example.com' WITH YOUR EMAIL
UPDATE public.profiles
SET role = 'super_admin'
WHERE id IN (
    SELECT id FROM auth.users WHERE email = 'admin@pratikhesap.com'
);

-- Option 2: Grant Super Admin to ALL current profiles (ONLY FOR DEV)
-- UPDATE public.profiles SET role = 'super_admin';
