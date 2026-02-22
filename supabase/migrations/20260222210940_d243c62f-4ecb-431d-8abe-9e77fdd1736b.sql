
-- Remove the overly broad ranking policy that exposes all profile fields
DROP POLICY IF EXISTS "Profiles: ranking público autenticado" ON public.profiles;

-- Drop the view approach
DROP VIEW IF EXISTS public.ranking_view;

-- Create a secure RPC function that returns only safe ranking data
CREATE OR REPLACE FUNCTION public.get_ranking()
RETURNS TABLE(nome text, xp integer, nivel integer)
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path TO 'public'
AS $$
  SELECT p.nome, p.xp, p.nivel
  FROM public.profiles p
  WHERE p.account_status = 'active'
  ORDER BY p.xp DESC
  LIMIT 50;
$$;
