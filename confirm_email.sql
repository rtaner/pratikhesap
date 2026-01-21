-- Manually confirm the user's email to allow login
-- This is necessary if "Enable Email Confirmations" is ON in Supabase but SMTP is not set up.

UPDATE auth.users
SET email_confirmed_at = now()
WHERE email = 'r@recaizade.com';
