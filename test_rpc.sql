-- TEST RPC
-- Run this to see if the function works at all.

SELECT public.resolve_username('ahhhmet') as resolved_email;

-- Also check if the function exists and permissions
SELECT proname, proowner::regrole, prosrc 
FROM pg_proc 
WHERE proname = 'resolve_username';
