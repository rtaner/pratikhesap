-- REPAIR BROKEN USER RECORD
-- 500 Error during login often means missing Identity or wrong Instance ID.

DO $$
DECLARE
    target_email text := 'ah@ssc.c'; -- Based on your screenshots
    u_id uuid;
BEGIN
    -- 1. Get User ID
    SELECT id INTO u_id FROM auth.users WHERE email = target_email;
    
    IF u_id IS NULL THEN
        RAISE NOTICE 'User not found!';
        RETURN;
    END IF;

    -- 2. Fix auth.users fields (Standardize)
    UPDATE auth.users
    SET 
        instance_id = '00000000-0000-0000-0000-000000000000', -- Default Supabase Instance
        aud = 'authenticated',
        role = 'authenticated',
        email_confirmed_at = COALESCE(email_confirmed_at, now()), -- Force Confirm
        confirmation_token = NULL,
        encrypted_password = crypt('123456', gen_salt('bf')) -- Ensure Password is known
    WHERE id = u_id;

    -- 3. Ensure auth.identities exists (CRITICAL for Login)
    -- If this is missing, Supabase crashes (500) trying to load provider info.
    IF NOT EXISTS (SELECT 1 FROM auth.identities WHERE user_id = u_id) THEN
        INSERT INTO auth.identities (
            id,
            user_id,
            identity_data,
            provider,
            provider_id,
            last_sign_in_at,
            created_at,
            updated_at
        )
        VALUES (
            u_id, -- Identity ID matches User ID for email provider usually
            u_id,
            jsonb_build_object('sub', u_id, 'email', target_email),
            'email',
            target_email, -- Provider ID is the email for email provider
            now(),
            now(),
            now()
        );
        RAISE NOTICE 'Fixed: Inserted missing auth.identities record.';
    ELSE
        RAISE NOTICE 'Identity record already exists.';
    END IF;
    
    RAISE NOTICE 'User repair complete. Try logging in with password "123456".';
END $$;
