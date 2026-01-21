-- Seed Default Plans if not exists
INSERT INTO public.plans (id, name, max_products, max_users, monthly_price, features)
VALUES 
    (1, 'Standart Paket', 1000, 5, 0, '{"modules": ["sales", "stock", "customers"]}')
ON CONFLICT (id) DO NOTHING;

-- Reset invalid sequences if needed
SELECT setval('plans_id_seq', (SELECT MAX(id) FROM public.plans));

-- Fix existing users who might have missed the trigger execution
-- This tries to repair missing profiles for existing auth users
DO $$
DECLARE 
    u record;
    new_biz_id uuid;
BEGIN
    FOR u IN SELECT * FROM auth.users LOOP
        -- Check if profile exists
        IF NOT EXISTS (SELECT 1 FROM public.profiles WHERE id = u.id) THEN
            -- Create Business
            INSERT INTO public.businesses (name, plan_id, subscription_end_date)
            VALUES (
                COALESCE(u.raw_user_meta_data->>'business_name', 'İşletmem'),
                1,
                (now() + interval '14 days')
            )
            RETURNING id INTO new_biz_id;

            -- Create Profile
            INSERT INTO public.profiles (id, business_id, full_name, role)
            VALUES (u.id, new_biz_id, COALESCE(u.raw_user_meta_data->>'full_name', 'Kullanıcı'), 'admin');

            -- Create Default Data for new business
            INSERT INTO public.accounts (business_id, name, type) VALUES (new_biz_id, 'Nakit Kasa', 'cash');
            INSERT INTO public.accounts (business_id, name, type) VALUES (new_biz_id, 'Pos Hesabı', 'pos');
            INSERT INTO public.categories (business_id, name) VALUES (new_biz_id, 'Genel');
        END IF;
    END LOOP;
END $$;
