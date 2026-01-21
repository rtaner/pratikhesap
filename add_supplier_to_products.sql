-- Add supplier_id to products table
ALTER TABLE public.products 
ADD COLUMN IF NOT EXISTS supplier_id uuid REFERENCES public.suppliers(id);

-- Optional: Create an index for performance
CREATE INDEX IF NOT EXISTS idx_products_supplier ON public.products(supplier_id);
