-- 1. Helper RPC for Login Page (Allow Anonymous to look up email by username)
CREATE OR REPLACE FUNCTION public.resolve_username(username_input text)
RETURNS text
LANGUAGE plpgsql
SECURITY DEFINER -- Runs with admin privileges to bypass RLS
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

-- Grant access to everyone (including login page)
GRANT EXECUTE ON FUNCTION public.resolve_username(text) TO anon, authenticated, service_role;


-- 2. Fix Visibility in "Team" Page (Allow seeing colleagues)
-- Ensure Admins/Staff can see profiles belonging to the SAME business.

DROP POLICY IF EXISTS "Users can view members of their own business" ON public.profiles;

CREATE POLICY "Users can view members of their own business"
ON public.profiles
FOR SELECT
USING (
    business_id = (
        SELECT business_id 
        FROM public.profiles 
        WHERE id = auth.uid()
    )
);

-- Also ensure Super Admin can see everyone (already handled or needed?)
DROP POLICY IF EXISTS "Super Admin can view all profiles" ON public.profiles;

CREATE POLICY "Super Admin can view all profiles"
ON public.profiles
FOR SELECT
USING (
    (SELECT role FROM public.profiles WHERE id = auth.uid()) = 'super_admin'
);
