-- 1. Create Stock Movements Table
CREATE TABLE IF NOT EXISTS public.stock_movements (
    id uuid DEFAULT uuid_generate_v4() PRIMARY KEY,
    business_id uuid REFERENCES public.businesses(id) NOT NULL,
    product_id uuid REFERENCES public.products(id) NOT NULL,
    amount integer NOT NULL, -- Positive for entry, Negative for exit
    type text NOT NULL, -- 'sale', 'purchase', 'return', 'adjustment', 'initial'
    document_id uuid, -- Reference to sales.id or purchases.id
    description text,
    created_at timestamp with time zone DEFAULT timezone('utc'::text, now()) NOT NULL
);

ALTER TABLE public.stock_movements ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Tenant Isolation" ON public.stock_movements
    USING (business_id = (SELECT business_id FROM public.profiles WHERE id = auth.uid()));

-- 2. Enhanced RPC function to process stock change safely
CREATE OR REPLACE FUNCTION public.process_stock_movement(
    p_product_id uuid,
    p_amount int,
    p_type text,
    p_document_id uuid DEFAULT NULL,
    p_description text DEFAULT NULL
)
RETURNS void
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

    -- 1. Insert Movement Record
    INSERT INTO public.stock_movements (business_id, product_id, amount, type, document_id, description)
    VALUES (v_business_id, p_product_id, p_amount, p_type, p_document_id, p_description);

    -- 2. Update Product Stock Quantity
    UPDATE public.products
    SET stock_quantity = stock_quantity + p_amount
    WHERE id = p_product_id AND business_id = v_business_id;
END;
$$;
