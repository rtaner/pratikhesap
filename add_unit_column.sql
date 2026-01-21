-- Add unit column to products table
ALTER TABLE public.products 
ADD COLUMN IF NOT EXISTS unit text DEFAULT 'adet';

-- Update existing records to have a default value if needed (handled by default above)
