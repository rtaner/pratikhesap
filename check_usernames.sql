-- CHECK USERNAME AND EMAIL COLUMNS
-- The previous list didn't show the username column. Let's start there.

SELECT 
    full_name, 
    email, 
    username, 
    role, 
    created_at 
FROM public.profiles 
ORDER BY created_at DESC 
LIMIT 10;
