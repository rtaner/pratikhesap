-- RPC: Safe Delete Business
-- Logic:
-- 1. Can ONLY be run by Super Admin.
-- 2. Can ONLY delete if Plan is NOT 'Standart' (1) or 'Pro' (2) (i.e. Plan must be 0/Free/Null).
-- 3. Can ONLY delete if Subscription is EXPIRED.

CREATE OR REPLACE FUNCTION public.delete_abandoned_business(target_business_id uuid)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    curr_user_role text;
    target_plan_id int;
    target_end_date timestamptz;
    target_name text;
BEGIN
    -- 1. Security Check (Super Admin Only)
    SELECT role INTO curr_user_role FROM public.profiles WHERE id = auth.uid();
    IF curr_user_role IS DISTINCT FROM 'super_admin' THEN
        RAISE EXCEPTION 'Unauthorized: Only Super Admins can delete businesses.';
    END IF;

    -- 2. Get Target Info
    SELECT plan_id, subscription_end_date, name INTO target_plan_id, target_end_date, target_name
    FROM public.businesses
    WHERE id = target_business_id;

    IF NOT FOUND THEN
        RAISE EXCEPTION 'Business not found.';
    END IF;

    -- 3. Safety Checks
    -- A. Protect Paid Plans (1=Standart, 2=Pro)
    IF target_plan_id IN (1, 2) THEN
        RAISE EXCEPTION 'GÜVENLİK UYARISI: "Standart" veya "Pro" pakete sahip işletmeler silinemez! (% - ID: %)', target_name, target_plan_id;
    END IF;

    -- B. Protect Active Subscriptions
    IF target_end_date > now() THEN
        RAISE EXCEPTION 'GÜVENLİK UYARISI: Abonelik süresi devam eden işletmeler silinemez! Bitiş: %', target_end_date;
    END IF;

    -- 4. Execute Deletion (Manual Cascade to ensure clean up if FKs miss cascade)
    -- Delete related data in order of dependency
    
    -- Delete Profiles (Users)
    -- Note: Deleting from auth.users requires instance admin rights which Postgres function usually doesn't have casually.
    -- However, deleting from public.profiles removes them from the App logic.
    -- Ideally we delete from auth.users too, but that's complex via SQL RPC without extension.
    -- For now, we clear application data.
    
    DELETE FROM public.accounts WHERE business_id = target_business_id;
    DELETE FROM public.transactions WHERE business_id = target_business_id;
    DELETE FROM public.sale_items WHERE business_id = target_business_id; -- Should be cascaded by sales usually
    DELETE FROM public.sales WHERE business_id = target_business_id;
    DELETE FROM public.categories WHERE business_id = target_business_id;
    DELETE FROM public.products WHERE business_id = target_business_id;
    DELETE FROM public.customers WHERE business_id = target_business_id;
    DELETE FROM public.suppliers WHERE business_id = target_business_id;
    DELETE FROM public.expenses WHERE business_id = target_business_id;
    
    -- Delete Profiles
    DELETE FROM public.profiles WHERE business_id = target_business_id;

    -- Finally Delete Business
    DELETE FROM public.businesses WHERE id = target_business_id;

END;
$$;
