
-- Fix the SECURITY DEFINER view issue by recreating with SECURITY INVOKER
DROP VIEW IF EXISTS public.ranking_view;

CREATE VIEW public.ranking_view WITH (security_invoker = true) AS
SELECT nome, xp, nivel
FROM public.profiles
WHERE account_status = 'active'
ORDER BY xp DESC
LIMIT 50;

-- Grant access
GRANT SELECT ON public.ranking_view TO authenticated;
GRANT SELECT ON public.ranking_view TO anon;

-- Add a permissive RLS policy on profiles for ranking (read only safe fields via view)
-- Actually the view with security_invoker means RLS on profiles applies.
-- We need an RLS policy that allows authenticated users to read nome/xp/nivel of all active profiles.
-- Add a new SELECT policy for ranking purposes
CREATE POLICY "Profiles: ranking público autenticado"
ON public.profiles
FOR SELECT
USING (
  auth.uid() IS NOT NULL AND account_status = 'active'
);
