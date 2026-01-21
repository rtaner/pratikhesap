-- UPSERT PLANS (Insert or Update if exists)
-- Ensure we have the basic plans defined

-- 1. Standart Paket (ID: 1)
INSERT INTO public.plans (id, name, max_products, max_users, monthly_price, features)
VALUES (
    1, 
    'Standart Paket', 
    1000, 
    5, -- Standard: 5 Users
    100.00, 
    '{"modules": ["sales", "stock", "customers", "reports"]}'
)
ON CONFLICT (id) DO UPDATE SET 
    name = EXCLUDED.name,
    max_products = EXCLUDED.max_products,
    max_users = EXCLUDED.max_users,
    monthly_price = EXCLUDED.monthly_price;

-- 2. Pro Paket (ID: 2)
INSERT INTO public.plans (id, name, max_products, max_users, monthly_price, features)
VALUES (
    2, 
    'Pro Paket', 
    10000, 
    999999, -- Pro: Unlimited (effectively)
    250.00, 
    '{"modules": ["sales", "stock", "customers", "reports", "finance", "team"]}'
)
ON CONFLICT (id) DO UPDATE SET 
    name = EXCLUDED.name,
    max_products = EXCLUDED.max_products,
    max_users = EXCLUDED.max_users;

-- 3. Free Trial / Başlangıç (ID: 3 or 0 - let's ensure one exists)
-- If there is a plan named 'Free' already, we leave it, but let's make sure we have a defined free tier if needed.
-- Assuming 'Free' might be ID 0 or created manually. Let's add a explicit 'Deneme Paketi'

INSERT INTO public.plans (id, name, max_products, max_users, monthly_price, features)
VALUES (
    0, 
    'Deneme Paketi', 
    50, 
    1, 
    0, 
    '{"modules": ["sales", "stock"]}'
)
ON CONFLICT (id) DO UPDATE SET name = EXCLUDED.name;
