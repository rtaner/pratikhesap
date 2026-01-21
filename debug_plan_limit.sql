-- DEBUG SCRIPT: Check why plan limit is failing

DO $$
DECLARE
    my_id uuid := auth.uid();
    my_biz_id uuid;
    my_plan_id int;
    plan_limit int;
    user_count int;
BEGIN
    -- 1. Get My Business
    SELECT business_id INTO my_biz_id FROM public.profiles WHERE id = my_id;
    
    -- 2. Get Plan ID
    SELECT plan_id INTO my_plan_id FROM public.businesses WHERE id = my_biz_id;
    
    -- 3. Get Plan Limit
    SELECT max_users INTO plan_limit FROM public.plans WHERE id = my_plan_id;
    
    -- 4. Get User Count
    SELECT count(*) INTO user_count FROM public.profiles WHERE business_id = my_biz_id;

    -- OUTPUT RESULTS (Will appear in Supabase Results/Messages)
    RAISE NOTICE 'My User ID: %', my_id;
    RAISE NOTICE 'My Business ID: %', my_biz_id;
    RAISE NOTICE 'My Plan ID: %', my_plan_id;
    RAISE NOTICE 'Plan Limit from DB: %', plan_limit;
    RAISE NOTICE 'Current User Count: %', user_count;
    
    IF plan_limit IS NULL THEN
        RAISE NOTICE 'WARNING: Plan Limit is NULL!';
    END IF;
END $$;
