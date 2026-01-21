-- NUCLEAR OPTION: Drop ALL policies on 'profiles' table dynamically
-- This ensures no "zombie" recursive policies are left behind.

DO $$ 
DECLARE 
    pol record; 
BEGIN 
    -- Loop through all policies on the 'profiles' table
    FOR pol IN 
        SELECT policyname 
        FROM pg_policies 
        WHERE tablename = 'profiles' AND schemaname = 'public' 
    LOOP 
        -- Execute DROP command for each policy
        EXECUTE format('DROP POLICY IF EXISTS %I ON public.profiles', pol.policyname); 
    END LOOP; 
END $$;


-- RE-APPLY THE HELPERS (Just to be absolutely sure they are correct)

-- 1. Helper: Get My Business ID (Safe)
CREATE OR REPLACE FUNCTION public.get_my_business_id_safe()
RETURNS uuid
LANGUAGE sql
SECURITY DEFINER
SET search_path = public, extensions, auth 
STABLE
AS $$
  SELECT business_id FROM public.profiles WHERE id = auth.uid() LIMIT 1;
$$;
ALTER FUNCTION public.get_my_business_id_safe() OWNER TO postgres;
GRANT EXECUTE ON FUNCTION public.get_my_business_id_safe() TO authenticated, anon, service_role;

-- 2. Helper: Am I Super Admin? (Safe)
CREATE OR REPLACE FUNCTION public.i_am_super_admin()
RETURNS boolean
LANGUAGE sql
SECURITY DEFINER
SET search_path = public, extensions, auth
STABLE
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.profiles 
    WHERE id = auth.uid() AND role = 'super_admin'
  );
$$;
ALTER FUNCTION public.i_am_super_admin() OWNER TO postgres;
GRANT EXECUTE ON FUNCTION public.i_am_super_admin() TO authenticated, anon, service_role;


-- RE-APPLY THE SINGLE SAFE POLICY

CREATE POLICY "Unified Profiles Visibility"
ON public.profiles
FOR SELECT
USING (
    -- Rule 1: I can see myself
    id = auth.uid()
    OR
    -- Rule 2: I am super admin
    public.i_am_super_admin()
    OR
    -- Rule 3: I am in the same business
    business_id = public.get_my_business_id_safe()
);

-- Re-enable RLS
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;

-- Grant standard permissions to be safe
GRANT SELECT, INSERT, UPDATE ON public.profiles TO authenticated;
GRANT SELECT ON public.profiles TO anon; 
-- (Sometimes Login page needs anon access if fetching profile data unauthenticated - though we use RPC for that now)
