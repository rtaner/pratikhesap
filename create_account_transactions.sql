-- Create account_transactions table
CREATE TABLE IF NOT EXISTS public.account_transactions (
    id uuid DEFAULT uuid_generate_v4() PRIMARY KEY,
    business_id uuid REFERENCES public.businesses(id) NOT NULL,
    account_id uuid REFERENCES public.accounts(id) NOT NULL,
    type text NOT NULL, -- 'in' (Giriş), 'out' (Çıkış)
    amount decimal(10,2) NOT NULL,
    description text,
    category text, -- 'Sermaye', 'Para Çekme', 'Transfer', 'Diğer'
    date timestamp with time zone DEFAULT timezone('utc'::text, now()) NOT NULL,
    created_at timestamp with time zone DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- RLS Policies
ALTER TABLE public.account_transactions ENABLE ROW LEVEL SECURITY;

DO $$ 
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_policies 
        WHERE tablename = 'account_transactions' 
        AND policyname = 'Tenant Isolation'
    ) THEN
        CREATE POLICY "Tenant Isolation" ON public.account_transactions
            USING (business_id = (SELECT business_id FROM public.profiles WHERE id = auth.uid()))
            WITH CHECK (business_id = (SELECT business_id FROM public.profiles WHERE id = auth.uid()));
    END IF;
END $$;

-- RPC to process transaction and update account balance
CREATE OR REPLACE FUNCTION process_account_transaction(
    p_account_id uuid,
    p_type text, -- 'in' or 'out'
    p_amount decimal,
    p_description text,
    p_category text,
    p_date timestamp with time zone
)
RETURNS uuid
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    v_business_id uuid;
    v_transaction_id uuid;
BEGIN
    -- Get business_id from current user
    SELECT business_id INTO v_business_id
    FROM public.profiles
    WHERE id = auth.uid();

    IF v_business_id IS NULL THEN
        RAISE EXCEPTION 'User not authenticated or profile not found';
    END IF;

    -- Update Account Balance
    IF p_type = 'in' THEN
        UPDATE public.accounts
        SET balance = balance + p_amount
        WHERE id = p_account_id AND business_id = v_business_id;
    ELSIF p_type = 'out' THEN
        UPDATE public.accounts
        SET balance = balance - p_amount
        WHERE id = p_account_id AND business_id = v_business_id;
    ELSE
        RAISE EXCEPTION 'Invalid transaction type';
    END IF;

    -- Insert Transaction Record
    INSERT INTO public.account_transactions (
        business_id,
        account_id,
        type,
        amount,
        description,
        category,
        date
    )
    VALUES (
        v_business_id,
        p_account_id,
        p_type,
        p_amount,
        p_description,
        p_category,
        p_date
    )
    RETURNING id INTO v_transaction_id;

    RETURN v_transaction_id;
END;
$$;
