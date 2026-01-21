-- 1. Add username and email columns to profiles
ALTER TABLE public.profiles 
ADD COLUMN IF NOT EXISTS username text,
ADD COLUMN IF NOT EXISTS email text;

-- Add unique constraint to username (but allow nulls for now)
ALTER TABLE public.profiles 
DROP CONSTRAINT IF EXISTS profiles_username_key;

CREATE UNIQUE INDEX IF NOT EXISTS profiles_username_idx ON public.profiles (username) WHERE username IS NOT NULL;

-- 2. Backfill Email from auth.users (One-time fix)
DO $$
DECLARE
    u record;
BEGIN
    FOR u IN SELECT id, email FROM auth.users LOOP
        UPDATE public.profiles 
        SET email = u.email 
        WHERE id = u.id AND email IS NULL;
    END LOOP;
END $$;

-- 3. Update 'create_staff_member' RPC to accept username and role
DROP FUNCTION IF EXISTS public.create_staff_member;

CREATE OR REPLACE FUNCTION public.create_staff_member(
    staff_email text,
    staff_password text,
    staff_name text,
    staff_username text DEFAULT NULL,
    staff_role text DEFAULT 'staff' -- Allow specifying role
)
RETURNS uuid
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    admin_business_id uuid;
    admin_profile_role text;
    new_user_id uuid;
    encrypted_pw text;
    current_user_count int;
    max_users_limit int;
BEGIN
    -- 1. Get current user's business and role
    SELECT business_id, role INTO admin_business_id, admin_profile_role
    FROM public.profiles
    WHERE id = auth.uid();

    -- Check permission
    IF admin_business_id IS NULL OR (admin_profile_role NOT IN ('admin', 'super_admin')) THEN
        RAISE EXCEPTION 'Unauthorized: Only Admins can create staff.';
    END IF;

    -- 2. Check Plan Limits
    SELECT count(*) INTO current_user_count FROM public.profiles WHERE business_id = admin_business_id;
    
    SELECT p.max_users INTO max_users_limit
    FROM public.businesses b
    JOIN public.plans p ON b.plan_id = p.id
    WHERE b.id = admin_business_id;

    IF max_users_limit IS NULL THEN max_users_limit := 5; END IF;

    IF current_user_count >= max_users_limit THEN
        RAISE EXCEPTION 'Plan limit reached.';
    END IF;

    -- 3. Check specific uniqueness
    IF EXISTS (SELECT 1 FROM auth.users WHERE email = staff_email) THEN
        RAISE EXCEPTION 'Email already exists.';
    END IF;

    IF staff_username IS NOT NULL AND EXISTS (SELECT 1 FROM public.profiles WHERE username = staff_username) THEN
        RAISE EXCEPTION 'Username already taken.';
    END IF;

    -- 4. Create User in auth.users
    new_user_id := gen_random_uuid();
    encrypted_pw := crypt(staff_password, gen_salt('bf'));

    INSERT INTO auth.users (
        instance_id, id, aud, role, email, encrypted_password, email_confirmed_at,
        raw_app_meta_data, raw_user_meta_data, created_at, updated_at, is_sso_user
    ) VALUES (
        '00000000-0000-0000-0000-000000000000', new_user_id, 'authenticated', 'authenticated',
        staff_email, encrypted_pw, now(),
        '{"provider": "email", "providers": ["email"]}',
        jsonb_build_object(
            'full_name', staff_name, 
            'business_name', 'Staff Member', 
            'skip_activation_trigger', true
        ),
        now(), now(), false
    );

    -- 5. Create Profile directly
    INSERT INTO public.profiles (id, business_id, full_name, role, email, username)
    VALUES (new_user_id, admin_business_id, staff_name, staff_role, staff_email, staff_username);
    
    RETURN new_user_id;
END;
$$;

-- 4. Update Main Trigger (handle_new_user)
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
DECLARE
  new_business_id uuid;
  biz_name text;
  skip_flag boolean;
BEGIN
  -- Check skip flag
  skip_flag := (new.raw_user_meta_data->>'skip_activation_trigger')::boolean;
  IF skip_flag IS TRUE THEN
    RETURN new;
  END IF;

  -- Business Logic
  biz_name := new.raw_user_meta_data->>'business_name';
  IF biz_name IS NULL OR biz_name = '' THEN
    biz_name := 'İşletmem';
  END IF;

  INSERT INTO public.businesses (name, plan_id, subscription_end_date)
  VALUES (biz_name, 1, (now() + interval '14 days'))
  RETURNING id INTO new_business_id;

  -- Profile Insertion (Added email)
  INSERT INTO public.profiles (id, business_id, full_name, role, email)
  VALUES (new.id, new_business_id, new.raw_user_meta_data->>'full_name', 'admin', new.email);
  
  -- Defalut Data
  INSERT INTO public.accounts (business_id, name, type) VALUES (new_business_id, 'Nakit Kasa', 'cash');
  INSERT INTO public.accounts (business_id, name, type) VALUES (new_business_id, 'Pos Hesabı', 'pos');
  INSERT INTO public.categories (business_id, name) VALUES (new_business_id, 'Genel');

  RETURN new;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 5. RPC to Update Staff Role (Admin only)
CREATE OR REPLACE FUNCTION public.update_staff_role(
    target_user_id uuid,
    new_role text
)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    admin_business_id uuid;
    target_business_id uuid;
BEGIN
    -- Check requester
    SELECT business_id INTO admin_business_id FROM public.profiles WHERE id = auth.uid();
    
    -- Check target
    SELECT business_id INTO target_business_id FROM public.profiles WHERE id = target_user_id;

    IF admin_business_id IS NULL OR admin_business_id != target_business_id THEN
         RAISE EXCEPTION 'Unauthorized or User not in your business.';
    END IF;

    UPDATE public.profiles SET role = new_role WHERE id = target_user_id;
END;
$$;
