-- Fix Profiles RLS: Allow users to view their own profile
CREATE POLICY "Users can view own profile" ON public.profiles
FOR SELECT USING (auth.uid() = id);

CREATE POLICY "Users can update own profile" ON public.profiles
FOR UPDATE USING (auth.uid() = id);

-- Fix Business RLS: Allow users to view their own business
-- (Existing policies might have relied on get_my_business_id, but if profile is blocked, that helper might fail or be recursive if not careful. 
-- Safer to rely on the profile link directly or just enable read via ID)

CREATE POLICY "Users can view assigned business" ON public.businesses
FOR SELECT USING (
  id IN (
    SELECT business_id FROM public.profiles WHERE id = auth.uid()
  )
);

-- Ensure Plans are public
DROP POLICY IF EXISTS "Public Plans" ON public.plans;
CREATE POLICY "Public Plans" ON public.plans FOR SELECT USING (true);
