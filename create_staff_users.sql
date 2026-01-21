-- Enable pgcrypto for password hashing
CREATE EXTENSION IF NOT EXISTS pgcrypto;

-- RPC to create a staff member
-- This function allows an Admin to create a new user (Staff) directly.
-- It maps the new user to the Admin's business.

CREATE OR REPLACE FUNCTION public.create_staff_member(
    staff_email text,
    staff_password text,
    staff_name text
)
RETURNS uuid
LANGUAGE plpgsql
SECURITY DEFINER -- Run as Database Owner to access auth.users
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
    
    -- Get limit from plans table (joined via business)
    SELECT p.max_users INTO max_users_limit
    FROM public.businesses b
    JOIN public.plans p ON b.plan_id = p.id
    WHERE b.id = admin_business_id;

    -- Default fallback if plan is missing
    IF max_users_limit IS NULL THEN max_users_limit := 5; END IF;

    IF current_user_count >= max_users_limit THEN
        RAISE EXCEPTION 'Plan limit reached. Maximum % users allowed.', max_users_limit;
    END IF;

    -- 3. Check if email exists
    IF EXISTS (SELECT 1 FROM auth.users WHERE email = staff_email) THEN
        RAISE EXCEPTION 'User with this email already exists.';
    END IF;

    -- 4. Create User in auth.users
    new_user_id := gen_random_uuid();
    encrypted_pw := crypt(staff_password, gen_salt('bf'));

    INSERT INTO auth.users (
        instance_id,
        id,
        aud,
        role,
        email,
        encrypted_password,
        email_confirmed_at,
        raw_app_meta_data,
        raw_user_meta_data,
        created_at,
        updated_at,
        is_sso_user
    ) VALUES (
        '00000000-0000-0000-0000-000000000000',
        new_user_id,
        'authenticated',
        'authenticated',
        staff_email,
        encrypted_pw,
        now(), -- Auto confirm
        '{"provider": "email", "providers": ["email"]}',
        jsonb_build_object('full_name', staff_name, 'business_name', 'Staff Member'),
        now(),
        now(),
        false
    );

    -- 5. Create Profile (Manually, because Trigger might fail or create duplicate business if not handled)
    -- Actually, our trigger `handle_new_user` normally creates a business.
    -- We should PREVENT that trigger or Handle it.
    -- Since we insert into profiles HERE immediately, the trigger logic for profiles might conflict or be redundant.
    
    -- Let's Insert into profiles directly. 
    -- Note: If `handle_new_user` triggers on INSERT auth.users, it will try to create a business.
    -- We need to ensure `handle_new_user` logic checks if profile already exists or logic handles this.
    -- Our previous trigger logic: `IF biz_name IS NULL... INSERT INTO businesses... INSERT INTO profiles...`
    
    -- RISK: Trigger runs AFTER insert. It will try to create a business.
    -- FIX: We can update the Trigger to check "If user already has a profile via another method (like this RPC), do nothing".
    -- OR: We pass a flag metadata `skip_trigger: true`.
    
    -- Let's update the USER METADATA in insert above to include `skip_activation_trigger: true`.
    
    INSERT INTO public.profiles (id, business_id, full_name, role)
    VALUES (new_user_id, admin_business_id, staff_name, 'staff');
    
    RETURN new_user_id;
END;
$$;

-- UPDATE THE TRIGGER TO RESPECT 'skip_activation_trigger'
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
DECLARE
  new_business_id uuid;
  free_plan_id integer;
  biz_name text;
  skip_flag boolean;
BEGIN
  -- Check skip flag
  skip_flag := (new.raw_user_meta_data->>'skip_activation_trigger')::boolean;
  IF skip_flag IS TRUE THEN
    RETURN new;
  END IF;

  -- Normal Flow (Register Page)
  -- ... (Rest of logic) ...
  biz_name := new.raw_user_meta_data->>'business_name';
  IF biz_name IS NULL OR biz_name = '' THEN
    biz_name := 'İşletmem';
  END IF;

  INSERT INTO public.businesses (name, plan_id, subscription_end_date)
  VALUES (biz_name, 1, (now() + interval '14 days'))
  RETURNING id INTO new_business_id;

  INSERT INTO public.profiles (id, business_id, full_name, role)
  VALUES (new.id, new_business_id, new.raw_user_meta_data->>'full_name', 'admin');
  
  INSERT INTO public.accounts (business_id, name, type) VALUES (new_business_id, 'Nakit Kasa', 'cash');
  INSERT INTO public.accounts (business_id, name, type) VALUES (new_business_id, 'Pos Hesabı', 'pos');
  INSERT INTO public.categories (business_id, name) VALUES (new_business_id, 'Genel');

  RETURN new;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
