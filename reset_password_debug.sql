-- RESET PASSWORD for 'ahhhmet'
-- This helps us verify if the login issue is just a wrong password.

UPDATE auth.users
SET encrypted_password = crypt('123456', gen_salt('bf'))
WHERE email = 'ah@ssc.c'; -- Based on your screenshot

-- Ensure RLS is still DISABLED for testing
ALTER TABLE public.profiles DISABLE ROW LEVEL SECURITY;
