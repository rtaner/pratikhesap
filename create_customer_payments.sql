-- 1. Create Customer Payments Table
CREATE TABLE IF NOT EXISTS public.customer_payments (
    id uuid DEFAULT uuid_generate_v4() PRIMARY KEY,
    business_id uuid REFERENCES public.businesses(id) NOT NULL,
    customer_id uuid REFERENCES public.customers(id) NOT NULL,
    amount decimal(10,2) NOT NULL,
    payment_method text DEFAULT 'cash', -- 'cash', 'credit_card', 'bank_transfer'
    description text,
    date timestamp with time zone DEFAULT timezone('utc'::text, now()) NOT NULL
);

ALTER TABLE public.customer_payments ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Tenant Isolation" ON public.customer_payments
    USING (business_id = (SELECT business_id FROM public.profiles WHERE id = auth.uid()));

-- 2. RPC function to process payment transaction
CREATE OR REPLACE FUNCTION public.process_customer_payment(
    p_customer_id uuid,
    p_amount decimal,
    p_method text,
    p_description text
)
RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    v_business_id uuid;
BEGIN
    -- Get business_id from current session user
    SELECT business_id INTO v_business_id
    FROM public.profiles
    WHERE id = auth.uid();

    IF v_business_id IS NULL THEN
        RAISE EXCEPTION 'User has no business assigned';
    END IF;

    -- 1. Insert Payment Record
    INSERT INTO public.customer_payments (business_id, customer_id, amount, payment_method, description)
    VALUES (v_business_id, p_customer_id, p_amount, p_method, p_description);

    -- 2. Update Customer Balance (Payment reduces debt)
    -- Assuming Balance > 0 means DEBT. So we SUBTRACT transaction amount.
    UPDATE public.customers
    SET balance = balance - p_amount
    WHERE id = p_customer_id AND business_id = v_business_id;

    -- 3. (Optional) Could update Cash Account here (TODO)

    RETURN true;
END;
$$;
