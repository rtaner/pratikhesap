-- CHECK AUDIENCE CLAIM
-- If 'aud' is NULL or not 'authenticated', login will fail.

SELECT email, aud, role, confirmation_token 
FROM auth.users 
ORDER BY created_at DESC 
LIMIT 5;
