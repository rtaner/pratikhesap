-- EXTENSIONS
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- 1. SAAS CORE (PLANS & TENANCY)
CREATE TABLE IF NOT EXISTS public.plans (
    id serial PRIMARY KEY,
    name text NOT NULL, -- 'Free', 'Pro', 'Enterprise'
    max_products integer DEFAULT 50,
    max_users integer DEFAULT 1,
    monthly_price decimal(10,2) DEFAULT 0,
    features jsonb DEFAULT '{}'
);

CREATE TABLE IF NOT EXISTS public.businesses (
    id uuid DEFAULT uuid_generate_v4() PRIMARY KEY,
    name text NOT NULL,
    plan_id integer REFERENCES public.plans(id),
    subscription_end_date timestamp with time zone,
    created_at timestamp with time zone DEFAULT timezone('utc'::text, now()) NOT NULL
);

CREATE TABLE IF NOT EXISTS public.profiles (
    id uuid REFERENCES auth.users NOT NULL PRIMARY KEY,
    business_id uuid REFERENCES public.businesses(id),
    full_name text,
    role text DEFAULT 'admin', -- 'admin', 'staff', 'super_admin'
    created_at timestamp with time zone DEFAULT timezone('utc'::text, now()) NOT NULL
);

CREATE TABLE IF NOT EXISTS public.announcements (
    id uuid DEFAULT uuid_generate_v4() PRIMARY KEY,
    title text NOT NULL,
    message text NOT NULL,
    type text DEFAULT 'info', -- 'info', 'warning', 'alert'
    is_active boolean DEFAULT true,
    created_at timestamp with time zone DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- 2. SETTINGS & DEFINITIONS
CREATE TABLE IF NOT EXISTS public.categories (
    id uuid DEFAULT uuid_generate_v4() PRIMARY KEY,
    business_id uuid REFERENCES public.businesses(id) NOT NULL,
    name text NOT NULL,
    created_at timestamp with time zone DEFAULT timezone('utc'::text, now()) NOT NULL
);

CREATE TABLE IF NOT EXISTS public.accounts (
    id uuid DEFAULT uuid_generate_v4() PRIMARY KEY,
    business_id uuid REFERENCES public.businesses(id) NOT NULL,
    name text NOT NULL, -- 'Kasa 1', 'Ziraat Bankası'
    type text DEFAULT 'cash', -- 'cash', 'bank', 'pos'
    balance decimal(10,2) DEFAULT 0,
    created_at timestamp with time zone DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- 3. INVENTORY
CREATE TABLE IF NOT EXISTS public.products (
    id uuid DEFAULT uuid_generate_v4() PRIMARY KEY,
    business_id uuid REFERENCES public.businesses(id) NOT NULL,
    name text NOT NULL,
    product_code text, -- Zorunlu alan olacak (App tarafında enforce edilecek)
    barcode text,
    category_id uuid REFERENCES public.categories(id),
    buying_price decimal(10,2) DEFAULT 0,
    selling_price decimal(10,2) DEFAULT 0,
    stock_quantity integer DEFAULT 0,
    critical_stock_level integer DEFAULT 10,
    image_url text,
    created_at timestamp with time zone DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- 4. CRM (CUSTOMERS & SUPPLIERS)
CREATE TABLE IF NOT EXISTS public.customers (
    id uuid DEFAULT uuid_generate_v4() PRIMARY KEY,
    business_id uuid REFERENCES public.businesses(id) NOT NULL,
    name text NOT NULL,
    phone text,
    email text,
    address text,
    balance decimal(10,2) DEFAULT 0, -- + Borçlu, - Alacaklı
    created_at timestamp with time zone DEFAULT timezone('utc'::text, now()) NOT NULL
);

CREATE TABLE IF NOT EXISTS public.suppliers (
    id uuid DEFAULT uuid_generate_v4() PRIMARY KEY,
    business_id uuid REFERENCES public.businesses(id) NOT NULL,
    name text NOT NULL,
    contact_person text,
    phone text,
    email text,
    balance decimal(10,2) DEFAULT 0,
    created_at timestamp with time zone DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- 5. OPERATIONS (SALES, PURCHASES, EXPENSES)
CREATE TABLE IF NOT EXISTS public.sales (
    id uuid DEFAULT uuid_generate_v4() PRIMARY KEY,
    business_id uuid REFERENCES public.businesses(id) NOT NULL,
    customer_id uuid REFERENCES public.customers(id),
    user_id uuid REFERENCES public.profiles(id), -- Kim sattı?
    total_amount decimal(10,2) NOT NULL,
    discount_amount decimal(10,2) DEFAULT 0,
    final_amount decimal(10,2) NOT NULL,
    payment_method text NOT NULL, -- 'cash', 'credit_card', 'on_account'
    account_id uuid REFERENCES public.accounts(id), -- Hangi kasaya girdi?
    status text DEFAULT 'completed', -- 'completed', 'parked', 'returned'
    date timestamp with time zone DEFAULT timezone('utc'::text, now()) NOT NULL
);

CREATE TABLE IF NOT EXISTS public.sale_items (
    id uuid DEFAULT uuid_generate_v4() PRIMARY KEY,
    sale_id uuid REFERENCES public.sales(id) ON DELETE CASCADE,
    business_id uuid REFERENCES public.businesses(id) NOT NULL,
    product_id uuid REFERENCES public.products(id),
    product_name text NOT NULL,
    quantity decimal(10,2) NOT NULL,
    price decimal(10,2) NOT NULL,
    total decimal(10,2) NOT NULL
);

CREATE TABLE IF NOT EXISTS public.purchases (
    id uuid DEFAULT uuid_generate_v4() PRIMARY KEY,
    business_id uuid REFERENCES public.businesses(id) NOT NULL,
    supplier_id uuid REFERENCES public.suppliers(id),
    user_id uuid REFERENCES public.profiles(id),
    invoice_no text,
    total_amount decimal(10,2) NOT NULL,
    date timestamp with time zone DEFAULT timezone('utc'::text, now()) NOT NULL
);

CREATE TABLE IF NOT EXISTS public.purchase_items (
    id uuid DEFAULT uuid_generate_v4() PRIMARY KEY,
    purchase_id uuid REFERENCES public.purchases(id) ON DELETE CASCADE,
    business_id uuid REFERENCES public.businesses(id) NOT NULL,
    product_id uuid REFERENCES public.products(id),
    quantity decimal(10,2) NOT NULL,
    cost_price decimal(10,2) NOT NULL,
    total decimal(10,2) NOT NULL
);

CREATE TABLE IF NOT EXISTS public.expenses (
    id uuid DEFAULT uuid_generate_v4() PRIMARY KEY,
    business_id uuid REFERENCES public.businesses(id) NOT NULL,
    account_id uuid REFERENCES public.accounts(id), -- Hangi kasadan ödendi?
    title text NOT NULL,
    amount decimal(10,2) NOT NULL,
    category text, -- 'Kira', 'Fatura', 'Personel', 'Diğer'
    description text,
    date timestamp with time zone DEFAULT timezone('utc'::text, now()) NOT NULL
);

CREATE TABLE IF NOT EXISTS public.returns (
    id uuid DEFAULT uuid_generate_v4() PRIMARY KEY,
    business_id uuid REFERENCES public.businesses(id) NOT NULL,
    sale_id uuid REFERENCES public.sales(id),
    product_id uuid REFERENCES public.products(id),
    quantity decimal(10,2) NOT NULL,
    refund_amount decimal(10,2) NOT NULL,
    reason text,
    date timestamp with time zone DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- 6. AUDIT LOGS
CREATE TABLE IF NOT EXISTS public.audit_logs (
    id uuid DEFAULT uuid_generate_v4() PRIMARY KEY,
    business_id uuid REFERENCES public.businesses(id) NOT NULL,
    user_id uuid REFERENCES auth.users, -- Supabase Auth User ID
    table_name text NOT NULL,
    record_id uuid,
    action text NOT NULL, -- 'INSERT', 'UPDATE', 'DELETE'
    old_data jsonb,
    new_data jsonb,
    created_at timestamp with time zone DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- RLS POLICIES ENABLE
ALTER TABLE public.plans ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.businesses ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.announcements ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.categories ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.accounts ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.products ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.customers ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.suppliers ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.sales ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.sale_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.purchases ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.purchase_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.expenses ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.returns ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.audit_logs ENABLE ROW LEVEL SECURITY;

-- AUTO BUSINESS TRIGGER
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
DECLARE
  new_business_id uuid;
  free_plan_id integer;
BEGIN
  -- Get Free Plan ID (Assumes 1 is free)
  -- SELECT id INTO free_plan_id FROM public.plans WHERE name = 'Free' LIMIT 1;
  
  -- Create Business
  INSERT INTO public.businesses (name, plan_id)
  VALUES ('İşletmem', free_plan_id)
  RETURNING id INTO new_business_id;

  -- Create Profile
  INSERT INTO public.profiles (id, business_id, full_name, role)
  VALUES (new.id, new_business_id, new.raw_user_meta_data->>'full_name', 'admin');
  
  -- Create Default Accounts
  INSERT INTO public.accounts (business_id, name, type) VALUES (new_business_id, 'Nakit Kasa', 'cash');
  INSERT INTO public.accounts (business_id, name, type) VALUES (new_business_id, 'Kredi Kartı', 'pos');

  -- Create Default Categories
  INSERT INTO public.categories (business_id, name) VALUES (new_business_id, 'Genel');

  RETURN new;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- RLS HELPER
CREATE OR REPLACE FUNCTION get_my_business_id()
RETURNS uuid AS $$
  SELECT business_id FROM public.profiles WHERE id = auth.uid() LIMIT 1;
$$ LANGUAGE sql SECURITY DEFINER;

-- GENERIC RLS POLICY (For most tables)
-- Users can see data related to their business_id
-- We need to apply this to: categories, accounts, products, sales, etc.

-- Example for products:
CREATE POLICY "View own business products" ON products FOR SELECT USING (business_id = get_my_business_id());
CREATE POLICY "Manage own business products" ON products FOR ALL USING (business_id = get_my_business_id());

-- Apply similar policies to others...
-- (Note: In a real script, we would write out all policies explicitly. For brevity, I'm generating the file with them included conceptually or explicit if concise).

-- EXPLICIT POLICIES FOR ALL
CREATE POLICY "Tenant Isolation" ON categories USING (business_id = get_my_business_id());
CREATE POLICY "Tenant Isolation" ON accounts USING (business_id = get_my_business_id());
CREATE POLICY "Tenant Isolation" ON customers USING (business_id = get_my_business_id());
CREATE POLICY "Tenant Isolation" ON suppliers USING (business_id = get_my_business_id());
CREATE POLICY "Tenant Isolation" ON sales USING (business_id = get_my_business_id());
CREATE POLICY "Tenant Isolation" ON sale_items USING (business_id = get_my_business_id());
CREATE POLICY "Tenant Isolation" ON purchases USING (business_id = get_my_business_id());
CREATE POLICY "Tenant Isolation" ON purchase_items USING (business_id = get_my_business_id());
CREATE POLICY "Tenant Isolation" ON expenses USING (business_id = get_my_business_id());
CREATE POLICY "Tenant Isolation" ON returns USING (business_id = get_my_business_id());
CREATE POLICY "Tenant Isolation" ON audit_logs USING (business_id = get_my_business_id());

-- Plans are public read
CREATE POLICY "Public Plans" ON plans FOR SELECT USING (true);

-- Businesses: Users see own business
CREATE POLICY "View Own Business" ON businesses FOR SELECT USING (id = get_my_business_id());
CREATE POLICY "Update Own Business" ON businesses FOR UPDATE USING (id = get_my_business_id());

