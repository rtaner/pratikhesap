-- CHECK INSTANCE ID and EMAIL CONFIRMATION
-- Supabase Auth requires instance_id to be '00000000-0000-0000-0000-000000000000' (usually)
-- If it's NULL or different, that explains the 500 error.

SELECT email, instance_id, email_confirmed_at, created_at
FROM auth.users 
ORDER BY created_at DESC 
LIMIT 5;
