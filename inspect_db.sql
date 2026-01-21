-- DIAGNOSTIC SCRIPT: TRIGGERS, EXTENSIONS, CONSTRAINTS
-- We are looking for the root cause of the 500 Error on Login.

-- 1. Check Extensions (pgcrypto is required for auth)
SELECT * FROM pg_extension WHERE extname = 'pgcrypto';

-- 2. List Triggers on auth.users (Login updates this table)
SELECT 
    event_object_schema as schema,
    event_object_table as table,
    trigger_name, 
    action_statement 
FROM information_schema.triggers 
WHERE event_object_table = 'users' AND event_object_schema = 'auth';

-- 3. List Triggers on public.profiles
SELECT 
    event_object_schema as schema,
    event_object_table as table,
    trigger_name, 
    action_statement 
FROM information_schema.triggers 
WHERE event_object_table = 'profiles' AND event_object_schema = 'public';

-- 4. Check if RLS is effectively enabled/disabled
SELECT tablename, rowsecurity FROM pg_tables WHERE schemaname = 'public' AND tablename = 'profiles';
