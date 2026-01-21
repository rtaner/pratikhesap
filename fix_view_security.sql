-- FIX: Enable security_invoker on the view so it uses RLS of underlying tables
-- This ensures users only see their own business data in the unified transaction history.

DROP VIEW IF EXISTS public.finance_transactions;

CREATE OR REPLACE VIEW public.finance_transactions WITH (security_invoker = true) AS
SELECT
    id::text as id,
    business_id,
    'sale' as source_type, -- Satis
    (CASE WHEN payment_method = 'credit_card' THEN 'Banka/POS' ELSE 'Nakit Kasa' END) as account_name,
    'in' as type,
    total_amount as amount,
    'Satış Fişi #' || COALESCE(id::text, '') as description,
    'Satis' as category,
    date,
    date as created_at -- Fallback to date
FROM public.sales

UNION ALL

SELECT
    id::text,
    business_id,
    'expense' as source_type, -- Gider
    (SELECT name FROM public.accounts WHERE id = expenses.account_id) as account_name,
    'out' as type,
    amount,
    title as description,
    category,
    date,
    date as created_at -- Fallback to date
FROM public.expenses

UNION ALL

SELECT
    id::text,
    business_id,
    'payment' as source_type, -- Tahsilat
    (CASE WHEN payment_method = 'credit_card' THEN 'Banka/POS' ELSE 'Nakit Kasa' END) as account_name,
    'in' as type,
    amount,
    'Cari Tahsilat: ' || description as description,
    'Tahsilat' as category,
    date,
    date as created_at -- Fallback to date
FROM public.customer_payments

UNION ALL

SELECT
    id::text,
    business_id,
    'transaction' as source_type, -- Manuel Islem
    (SELECT name FROM public.accounts WHERE id = account_transactions.account_id) as account_name,
    type,
    amount,
    description,
    category,
    date,
    created_at -- This table HAS created_at
FROM public.account_transactions;

ALTER VIEW public.finance_transactions OWNER TO postgres;
GRANT SELECT ON public.finance_transactions TO authenticated;
GRANT SELECT ON public.finance_transactions TO service_role;
