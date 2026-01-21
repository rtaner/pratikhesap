-- FIX: Update handle_new_user trigger to handle Trial Period and dynamic Business Name

CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
DECLARE
  new_business_id uuid;
  free_plan_id integer;
  biz_name text;
BEGIN
  -- Get Business Name from metadata or default to 'İşletmem'
  biz_name := new.raw_user_meta_data->>'business_name';
  IF biz_name IS NULL OR biz_name = '' THEN
    biz_name := 'İşletmem';
  END IF;

  -- Create Business with 14 Days Trial
  INSERT INTO public.businesses (name, plan_id, subscription_end_date)
  VALUES (
    biz_name, 
    1, -- Assuming 1 is Free/Standard plan
    (now() + interval '14 days') -- 14 Days Trial
  )
  RETURNING id INTO new_business_id;

  -- Create Profile
  INSERT INTO public.profiles (id, business_id, full_name, role)
  VALUES (new.id, new_business_id, new.raw_user_meta_data->>'full_name', 'admin');
  
  -- Create Default Accounts
  INSERT INTO public.accounts (business_id, name, type) VALUES (new_business_id, 'Nakit Kasa', 'cash');
  INSERT INTO public.accounts (business_id, name, type) VALUES (new_business_id, 'Pos Hesabı', 'pos');

  -- Create Default Categories
  INSERT INTO public.categories (business_id, name) VALUES (new_business_id, 'Genel');

  RETURN new;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
