-- DEBUG: SIMULATE LOGIN UPDATE
-- Purpose: Try to perform the exact update that Supabase Auth does during login.
-- If there is a hidden broken trigger, this will explode and tell us WHY.

DO $$
BEGIN
    -- Try to update the last_sign_in_at for the debugging user
    UPDATE auth.users 
    SET last_sign_in_at = now() 
    WHERE email = 'ah@ssc.c';
    
    RAISE NOTICE 'SUCCESS: auth.users updated without error.';
EXCEPTION WHEN OTHERS THEN
    RAISE NOTICE 'CRITICAL FAILURE: Could not update auth.users. Error: %', SQLERRM;
END $$;
