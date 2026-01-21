-- FIX INFINITE RECURSION IN RLS POLICY

-- 1. Create a helper function to get current user's business_id securely
-- This function runs as owner (SECURITY DEFINER), bypassing RLS, thus preventing the loop.
CREATE OR REPLACE FUNCTION public.get_my_business_id()
RETURNS uuid
LANGUAGE plpgsql
SECURITY DEFINER
STABLE
AS $$
DECLARE
    my_biz_id uuid;
BEGIN
    SELECT business_id INTO my_biz_id
    FROM public.profiles
    WHERE id = auth.uid();
    
    RETURN my_biz_id;
END;
$$;

-- 2. Drop the recursive policy
DROP POLICY IF EXISTS "Users can view members of their own business" ON public.profiles;

-- 3. Re-create the policy using the safe function
CREATE POLICY "Users can view members of their own business"
ON public.profiles
FOR SELECT
USING (
    -- Rule 1: Can see self
    id = auth.uid() 
    OR 
    -- Rule 2: Can see others in same business (using abuse-proof function)
    business_id = public.get_my_business_id()
);

-- Ensure Super Admin logic remains valid (optional, just ensuring)
DROP POLICY IF EXISTS "Super Admin can view all profiles" ON public.profiles;
CREATE POLICY "Super Admin can view all profiles"
ON public.profiles
FOR SELECT
USING (
    (SELECT role FROM public.profiles WHERE id = auth.uid()) = 'super_admin'
);
