-- Add discount columns to sale_items table
ALTER TABLE public.sale_items 
ADD COLUMN IF NOT EXISTS discount_amount decimal(10,2) DEFAULT 0,
ADD COLUMN IF NOT EXISTS discount_rate decimal(5,2) DEFAULT 0; -- Percentage like 10.00 for 10%
