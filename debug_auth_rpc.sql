-- DEBUG RPC: CHECK PASSWORD DIRECTLY
-- This function tests if we can read auth.users and use pgcrypto without crashing.

CREATE OR REPLACE FUNCTION public.debug_check_password(
    input_email text,
    input_password text
)
RETURNS text
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, extensions, auth
AS $$
DECLARE
    stored_hash text;
    verification_result boolean;
BEGIN
    -- 1. Try to find the user
    SELECT encrypted_password INTO stored_hash
    FROM auth.users
    WHERE email = input_email
    LIMIT 1;

    IF stored_hash IS NULL THEN
        RETURN 'ERROR: User not found in auth.users';
    END IF;

    -- 2. Try to verify password (pgcrypto test)
    BEGIN
        verification_result := (stored_hash = crypt(input_password, stored_hash));
    EXCEPTION WHEN OTHERS THEN
        RETURN 'CRITICAL ERROR during pgcrypto check: ' || SQLERRM;
    END;

    -- 3. Return result
    IF verification_result THEN
        RETURN 'SUCCESS: Password Matches! (DB is fine, Auth Server is weird)';
    ELSE
        RETURN 'FAILURE: Password does NOT match.';
    END IF;
END;
$$;

-- Allow everyone to run this debug function
GRANT EXECUTE ON FUNCTION public.debug_check_password(text, text) TO anon, authenticated, service_role;
