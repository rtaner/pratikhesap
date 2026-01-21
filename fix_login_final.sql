-- FINAL ROBUST FIX FOR LOGIN 500 ERROR
-- Addressing potential search_path issues and recursion.

-- 1. Helper: Get My Business ID (Safe)
-- Explicitly set search_path to prevent schema errors
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


-- 3. Helper: Resolve Username (for Login page)
CREATE OR REPLACE FUNCTION public.resolve_username(username_input text)
RETURNS text
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, extensions, auth
STABLE
AS $$
DECLARE
    found_email text;
BEGIN
    SELECT email INTO found_email
    FROM public.profiles
    WHERE username = username_input;
    
    RETURN found_email;
END;
$$;

ALTER FUNCTION public.resolve_username(text) OWNER TO postgres;
GRANT EXECUTE ON FUNCTION public.resolve_username(text) TO authenticated, anon, service_role;


-- 4. RE-APPLY POLICY (Clean State)
DROP POLICY IF EXISTS "Unified Profiles Visibility" ON public.profiles;
DROP POLICY IF EXISTS "Users can view members of their own business" ON public.profiles;
DROP POLICY IF EXISTS "Super Admin can view all profiles" ON public.profiles;

CREATE POLICY "Unified Profiles Visibility"
ON public.profiles
FOR SELECT
USING (
    -- I can see myself
    id = auth.uid()
    OR
    -- I am super admin (via safe function)
    public.i_am_super_admin()
    OR
    -- I am in the same business (via safe function)
    business_id = public.get_my_business_id_safe()
);

-- Force enable RLS to be sure
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
