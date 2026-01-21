-- FORCE FIX POLICIES (CORRECTED)
-- Drop ALL potential existing policies to ensure clean state
DROP POLICY IF EXISTS "Users can view own profile" ON public.profiles;
DROP POLICY IF EXISTS "View Own Profile" ON public.profiles;
DROP POLICY IF EXISTS "View own business" ON public.businesses; -- Case insensitive usually, but robust
DROP POLICY IF EXISTS "View Own Business" ON public.businesses;
DROP POLICY IF EXISTS "Users can view assigned business" ON public.businesses;

-- Re-enable RLS
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.businesses ENABLE ROW LEVEL SECURITY;

-- Create Policies
CREATE POLICY "View Own Profile" ON public.profiles
FOR SELECT USING (auth.uid() = id);

CREATE POLICY "View Own Business" ON public.businesses
FOR SELECT USING (
  id IN (
    SELECT business_id FROM public.profiles WHERE id = auth.uid()
  )
);

-- Grant permissions
GRANT USAGE ON SCHEMA public TO anon, authenticated;
GRANT ALL ON ALL TABLES IN SCHEMA public TO anon, authenticated;
GRANT ALL ON ALL SEQUENCES IN SCHEMA public TO anon, authenticated;
