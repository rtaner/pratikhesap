-- FIX MISSING PROFILES AND BUSINESSES
-- This script finds any user in auth.users who does not have a public.profile
-- and creates a default Business and Profile for them.

DO $$
DECLARE
  items_record RECORD;
  new_business_id uuid;
  free_plan_id integer;
BEGIN
  -- Get or Create Free Plan ID
  SELECT id INTO free_plan_id FROM public.plans WHERE name = 'Free' LIMIT 1;
  IF free_plan_id IS NULL THEN
     INSERT INTO public.plans (name, max_products, max_users, monthly_price) 
     VALUES ('Free', 50, 1, 0)
     RETURNING id INTO free_plan_id;
  END IF;

  FOR items_record IN 
    SELECT * FROM auth.users 
    WHERE id NOT IN (SELECT id FROM public.profiles)
  LOOP
    -- 1. Create a Business for this orphaned user
    INSERT INTO public.businesses (name, plan_id)
    VALUES ('İşletmem', free_plan_id)
    RETURNING id INTO new_business_id;

    -- 2. Create the Profile
    INSERT INTO public.profiles (id, business_id, full_name, role)
    VALUES (
        items_record.id, 
        new_business_id, 
        COALESCE(items_record.raw_user_meta_data->>'full_name', 'Kullanıcı'), 
        'admin'
    );

    -- 3. Create Default Account
    INSERT INTO public.accounts (business_id, name, type) 
    VALUES (new_business_id, 'Nakit Kasa', 'cash');

    -- 4. Create Default Category
    INSERT INTO public.categories (business_id, name)
    VALUES (new_business_id, 'Genel');
    
    RAISE NOTICE 'Fixed user %', items_record.email;
  END LOOP;
END;
$$;
