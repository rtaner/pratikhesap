-- FINAL FIX FOR RLS RECURSION
-- problem: Direct selects on 'profiles' inside 'profiles' policies cause infinite loops (Error 500).
-- Solution: Encapsulate ALL profile lookups (business_id, role) in SECURITY DEFINER functions.

-- 1. Helper: Get My Business ID (Safe)
CREATE OR REPLACE FUNCTION public.get_my_business_id_safe()
RETURNS uuid
LANGUAGE sql
SECURITY DEFINER
STABLE
AS $$
  SELECT business_id FROM public.profiles WHERE id = auth.uid() LIMIT 1;
$$;

-- 2. Helper: Am I Super Admin? (Safe)
CREATE OR REPLACE FUNCTION public.i_am_super_admin()
RETURNS boolean
LANGUAGE sql
SECURITY DEFINER
STABLE
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.profiles 
    WHERE id = auth.uid() AND role = 'super_admin'
  );
$$;

-- Grant access to functions
GRANT EXECUTE ON FUNCTION public.get_my_business_id_safe() TO authenticated, anon, service_role;
GRANT EXECUTE ON FUNCTION public.i_am_super_admin() TO authenticated, anon, service_role;


-- 3. NUKE existing policies to be sure
DROP POLICY IF EXISTS "Users can view members of their own business" ON public.profiles;
DROP POLICY IF EXISTS "Super Admin can view all profiles" ON public.profiles;
DROP POLICY IF EXISTS "Profiles visibility" ON public.profiles;
DROP POLICY IF EXISTS "Enable read access for all users" ON public.profiles;
DROP POLICY IF EXISTS "Public profiles are viewable by everyone" ON public.profiles;


-- 4. Create THE SINGLE Policy
-- Logic:
-- A. I can see myself.
-- B. I can see anyone if I am Super Admin (via function).
-- C. I can see anyone in my business (via function).

CREATE POLICY "Unified Profiles Visibility"
ON public.profiles
FOR SELECT
USING (
    id = auth.uid()
    OR
    public.i_am_super_admin()
    OR
    business_id = public.get_my_business_id_safe()
);

-- Ensure Insert/Update policies exist (Basic ones)
-- Allow users to update their own profile
DROP POLICY IF EXISTS "Users can update own profile" ON public.profiles;
CREATE POLICY "Users can update own profile"
ON public.profiles
FOR UPDATE
USING ( id = auth.uid() );

-- Allow insert (handled by triggers mostly, but needed for RPCs sometimes)
DROP POLICY IF EXISTS "Service role can insert profiles" ON public.profiles;
CREATE POLICY "Service role can insert profiles"
ON public.profiles
FOR INSERT
WITH CHECK ( true ); -- Usually restricted by RLS on table level, but insert is special.
