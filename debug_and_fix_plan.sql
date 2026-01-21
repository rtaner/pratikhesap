-- RETURN DEBUG INFO AS A TABLE (Check Results Tab)
SELECT 
    p.id as my_user_id,
    p.business_id,
    b.name as business_name,
    b.plan_id,
    pl.name as plan_name,
    pl.max_users as plan_user_limit,
    (SELECT count(*) FROM public.profiles WHERE business_id = p.business_id) as actual_user_count
FROM public.profiles p
LEFT JOIN public.businesses b ON p.business_id = b.id
LEFT JOIN public.plans pl ON b.plan_id = pl.id
WHERE p.id = auth.uid();

-- AUTO FIX: Update Plan 1 to have 50 users (Just in case)
UPDATE public.plans SET max_users = 50 WHERE id = 1;
