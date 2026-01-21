-- Allow Super Admins to view ALL businesses
-- Verify first if policy exists, if not create/replace it.

DROP POLICY IF EXISTS "Super Admins can see all businesses" ON public.businesses;

CREATE POLICY "Super Admins can see all businesses"
ON public.businesses
FOR SELECT
USING (
  (SELECT role FROM public.profiles WHERE id = auth.uid()) = 'super_admin'
);

-- Also allow them to UPDATE (to extend subscriptions, change plans)
DROP POLICY IF EXISTS "Super Admins can update all businesses" ON public.businesses;

CREATE POLICY "Super Admins can update all businesses"
ON public.businesses
FOR UPDATE
USING (
  (SELECT role FROM public.profiles WHERE id = auth.uid()) = 'super_admin'
);
