-- DIAGNOSE AUTH CRASH
-- 1. Ensure pgcrypto extension exists (Critical for Auth)
CREATE EXTENSION IF NOT EXISTS "pgcrypto" SCHEMA extensions;
-- If schema 'extensions' doesn't exist, try public
CREATE EXTENSION IF NOT EXISTS "pgcrypto" SCHEMA public;

-- 2. Test Password Hashing (If this fails, Auth is broken)
DO $$
BEGIN
    PERFORM crypt('test', gen_salt('bf'));
    RAISE NOTICE 'Password hashing (pgcrypto) is WORKING.';
EXCEPTION WHEN OTHERS THEN
    RAISE NOTICE 'CRITICAL ERROR: Password hashing failed. %', SQLERRM;
END $$;

-- 3. List Triggers on auth.users (Looking for broken UPDATE triggers)
SELECT 
    tgname as trigger_name,
    tgtype, 
    proname as function_name
FROM pg_trigger t
JOIN pg_proc p ON t.tgfoid = p.oid
WHERE tgrelid = 'auth.users'::regclass;
